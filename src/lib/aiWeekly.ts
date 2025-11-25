import { prisma } from './prisma';
import OpenAI from 'openai';
import { TaskType } from '@prisma/client';
import { addDays, startOfDay } from 'date-fns';
import { z } from 'zod';

export interface WeeklyTimelineSuggestion {
  generatedAt: string;
  model: string;
  totalWeekMinutes: number;
  days: { date: string; totalMinutes: number; slots: { taskId: string; title: string; priority: string; type: TaskType; share?: number }[] }[];
}

const WeeklySchema = z.object({
  generatedAt: z.string(),
  model: z.string(),
  totalWeekMinutes: z.number(),
  days: z.array(z.object({
    date: z.string(),
    totalMinutes: z.number(),
    slots: z.array(z.object({
      taskId: z.string(),
      title: z.string(),
      priority: z.enum(['LOW','MEDIUM','HIGH']),
      type: z.nativeEnum(TaskType),
      share: z.number().optional()
    }))
  }))
});

export async function getWeeklyTimeline(userId: string, opts: { force?: boolean } = {}): Promise<WeeklyTimelineSuggestion> {
  const latest = await (prisma as any).weeklySuggestion.findFirst({
    where: { userId },
    orderBy: { generatedAt: 'desc' }
  });
  const tenMinutesAgo = new Date(Date.now() - 10*60*1000);
  if (!opts.force && latest && latest.generatedAt > tenMinutesAgo) {
    return WeeklySchema.parse({
      generatedAt: latest.generatedAt.toISOString(),
      model: latest.model || 'unknown',
      totalWeekMinutes: (latest.data as any).totalWeekMinutes || 0,
      days: (latest.data as any).days || []
    });
  }
  const tasks = await prisma.task.findMany({ where: { userId, isCompleted: false } });
  if (!tasks.length) {
    const empty: WeeklyTimelineSuggestion = { generatedAt: new Date().toISOString(), model: 'none', totalWeekMinutes: 0, days: [] };
    if (!latest) {
      await (prisma as any).weeklySuggestion.create({ data: { userId, model: 'none', data: empty } });
    }
    return empty;
  }
  let suggestion: WeeklyTimelineSuggestion;
  if (process.env.OPENAI_API_KEY) {
    try { suggestion = await generateWeeklyTimelineAI(tasks); }
    catch (e) { console.error('AI weekly timeline failed, fallback.', e); suggestion = generateWeeklyTimelineFallback(tasks); }
  } else {
    suggestion = generateWeeklyTimelineFallback(tasks);
  }
  await (prisma as any).weeklySuggestion.create({ data: { userId, model: suggestion.model, data: suggestion } });
  return WeeklySchema.parse(suggestion);
}

function generateWeeklyTimelineFallback(tasks: any[]): WeeklyTimelineSuggestion {
  const today = startOfDay(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const maxDayMinutes = 180; // 3 hours max per day - realistic student workload
  const now = Date.now();
  
  // Priority weights: HIGH=3, MEDIUM=2, LOW=1
  const pw: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  
  // Calculate weight for each task: priority * urgency
  const weighted = tasks.map(t => {
    const daysUntil = Math.max(0.5, Math.ceil((t.dueDate.getTime() - now) / (1000*60*60*24)));
    const urgency = 1 / daysUntil; // closer deadline = higher urgency
    const priority = (t as any).priority || 'MEDIUM';
    const weight = pw[priority] * urgency * (t.type === 'EXAM' ? 1.3 : 1.0); // exams get slight boost
    
    // Estimate total minutes needed based on priority and type
    let totalMinutes = 0;
    if (t.type === 'EXAM') {
      totalMinutes = pw[priority] * 90; // HIGH=270, MED=180, LOW=90 total minutes
    } else {
      totalMinutes = pw[priority] * 60; // HIGH=180, MED=120, LOW=60 total minutes
    }
    
    return { ...t, weight, priority, totalMinutes, daysUntil };
  });
  
  // Sort by weight (highest first) - most urgent/important tasks scheduled first
  weighted.sort((a, b) => b.weight - a.weight);
  
  // Build daily schedule, filling each day up to maxDayMinutes
  const daySchedules: Record<string, { taskId: string; title: string; priority: string; type: TaskType; minutes: number }[]> = {};
  const taskRemaining: Record<string, number> = {}; // track remaining minutes per task
  
  weighted.forEach(t => {
    taskRemaining[t.id] = t.totalMinutes;
  });
  
  // Distribute tasks across days
  for (const day of days) {
    const dayKey = day.toISOString().split('T')[0];
    daySchedules[dayKey] = [];
    let dayMinutesUsed = 0;
    
    // For each task (in priority order), allocate time if there's room
    for (const task of weighted) {
      if (taskRemaining[task.id] <= 0) continue; // task fully scheduled
      if (dayMinutesUsed >= maxDayMinutes) break; // day is full
      
      // Calculate how many days until deadline from current day
      const daysLeft = Math.ceil((task.dueDate.getTime() - day.getTime()) / (1000*60*60*24));
      
      // Skip if deadline has passed for this day
      if (daysLeft < 0) continue;
      
      // If this is the last day before deadline, allocate all remaining
      let sessionMinutes: number;
      if (daysLeft === 0) {
        sessionMinutes = Math.min(taskRemaining[task.id], maxDayMinutes - dayMinutesUsed);
      } else if (task.daysUntil <= 1) {
        // Very urgent: allocate larger chunk (up to 60 min)
        sessionMinutes = Math.min(60, taskRemaining[task.id], maxDayMinutes - dayMinutesUsed);
      } else {
        // Spread remaining minutes over remaining days, capped at 30-90 min per session
        const perDay = Math.ceil(taskRemaining[task.id] / Math.max(1, daysLeft));
        sessionMinutes = Math.min(Math.max(15, perDay), 90, taskRemaining[task.id], maxDayMinutes - dayMinutesUsed);
      }
      
      if (sessionMinutes < 10) continue; // skip if allocation too small
      
      daySchedules[dayKey].push({
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        type: task.type,
        minutes: sessionMinutes
      });
      
      taskRemaining[task.id] -= sessionMinutes;
      dayMinutesUsed += sessionMinutes;
    }
  }
  
  // Convert to output format with share percentages
  const daysOut = days.map(d => {
    const key = d.toISOString().split('T')[0];
    const slotsWithMinutes = daySchedules[key] || [];
    const totalMinutes = Math.max(1, slotsWithMinutes.reduce((a,b)=>a+b.minutes,0));
    const slots = slotsWithMinutes.map(s => ({ 
      taskId: s.taskId, 
      title: s.title, 
      priority: s.priority, 
      type: s.type, 
      share: s.minutes / totalMinutes 
    }));
    return { date: key, totalMinutes, slots };
  });
  
  const totalWeekMinutes = daysOut.reduce((sum, d) => sum + d.totalMinutes, 0);
  return { generatedAt: new Date().toISOString(), model: 'fallback-humanlike-v1', totalWeekMinutes, days: daysOut };
}

async function generateWeeklyTimelineAI(tasks: any[]): Promise<WeeklyTimelineSuggestion> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const today = startOfDay(new Date());
  const taskList = tasks.map(t => {
    const daysUntil = Math.max(0.5, Math.ceil((t.dueDate.getTime() - Date.now()) / (1000*60*60*24)));
    return { 
      id: t.id, 
      title: t.title, 
      type: t.type, 
      priority: (t as any).priority || 'MEDIUM', 
      due: t.dueDate.toISOString().split('T')[0],
      daysUntil: Math.round(daysUntil * 10) / 10
    };
  });
  
  const prompt = `You are a thoughtful student planning your week. Here are your tasks: ${JSON.stringify(taskList)}. Today is ${today.toISOString().split('T')[0]}.

Plan a realistic 7-day study schedule following these natural student planning rules:

1. Calculate each task's weight = priority (HIGH=3, MED=2, LOW=1) × urgency (1 / days until due). Most urgent/important tasks get scheduled first.

2. Set a daily workload limit of 2-4 hours (120-240 minutes). Don't overload any single day.

3. Schedule tasks in order of weight (highest first). For each task:
   - NEVER schedule work on days AFTER the deadline
   - If due today/tomorrow: allocate a larger chunk (up to 60 min)
   - If due in 3+ days: spread work across remaining days in 15-90 min sessions
   - For exams: distribute study time evenly or ramp up closer to deadline
   - For assignments: front-load the work

4. Fill each day starting with the most urgent tasks. When a day reaches ~3 hours, move to the next day.

5. Each day's tasks should have percentage shares that sum to 1.0, representing how that day's study time is divided.

Return ONLY valid JSON (no explanations): 
{
  "generatedAt": "ISO timestamp",
  "model": "gpt-4o-mini", 
  "totalWeekMinutes": number,
  "days": [
    {
      "date": "YYYY-MM-DD",
      "totalMinutes": number,
      "slots": [
        {"taskId": "id", "title": "title", "priority": "HIGH|MEDIUM|LOW", "type": "EXAM|ASSIGNMENT", "share": 0.0-1.0}
      ]
    }
  ]
}`;

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.4,
    messages: [
      { role: 'system', content: 'You are a student planning assistant. Think like a real student balancing urgency, priority, and realistic daily workloads. Output only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    max_tokens: 2000
  });
  
  const raw = completion.choices[0]?.message?.content?.trim() || '';
  const jsonString = raw.replace(/^```json/,'').replace(/```$/,'').trim();
  let parsed: any;
  try { parsed = JSON.parse(jsonString); } catch { throw new Error('JSON parse failed'); }
  if (!parsed.days || !Array.isArray(parsed.days)) throw new Error('Invalid structure');
  parsed.model = parsed.model || (process.env.OPENAI_MODEL || 'gpt-4o-mini');
  parsed.generatedAt = new Date().toISOString();
  return parsed as WeeklyTimelineSuggestion;
}

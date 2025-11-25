import { prisma } from './prisma';
import { Task, TaskPriority } from '@prisma/client';
import OpenAI from 'openai';

interface GeneratedPlanJSON {
  exam: string;
  days: { date: string; tasks: { text: string; minutes: number }[]; totalMinutes: number }[];
  summaries: Record<string, string>;
  totalAllocated: number;
}

// Attempt AI generation (OpenAI) with strict JSON schema; fallback to stub if errors.
export async function generateStudyPlanAI(task: Task): Promise<GeneratedPlanJSON> {
  if (!process.env.OPENAI_API_KEY) {
    return generateStudyPlanStub(task);
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const now = new Date();
  const priority: TaskPriority = (task as any).priority || 'MEDIUM';
  const rawDays = Math.max(1, Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000*60*60*24)));
  const days = Math.min(rawDays, 28);
  
  // Check if user provided subtasks
  const userSubtasks = (task as any).subtasks || [];
  const hasUserSubtasks = Array.isArray(userSubtasks) && userSubtasks.length > 0;
  
  const prompt = hasUserSubtasks
    ? `You are a thoughtful student creating a realistic study plan. Here's your task with USER-PROVIDED subtasks:

Task: ${task.title}
Type: ${task.type}
Priority: ${priority} (HIGH=3, MEDIUM=2, LOW=1)
Due Date: ${task.dueDate.toISOString().split('T')[0]}
Days Available: ${days}

User-Provided Subtasks:
${userSubtasks.map((st: string, i: number) => `${i+1}. ${st}`).join('\n')}

IMPORTANT: You MUST use these exact user-provided subtasks. Do NOT create new subtasks or modify their names. Schedule these specific subtasks across the ${days} available days.

Planning rules:
1. Use ONLY the user-provided subtasks listed above
2. Distribute them realistically across days based on priority (HIGH=3, MED=2, LOW=1) and urgency (1/days until due)
3. Each subtask session should be 15-90 minutes
4. You can schedule the same subtask on multiple days if needed
5. More urgent/important subtasks should appear earlier or more frequently
6. Don't overload any day (max 2-3 hours per day for this task)
7. For exams: spread subtasks evenly or ramp up closer to deadline
8. For assignments: front-load the work

Return ONLY valid JSON:
{
  "exam": "${task.title}",
  "totalAllocated": <total minutes>,
  "summaries": {"${task.title}": "brief planning rationale"},
  "days": [
    {
      "date": "YYYY-MM-DD",
      "totalMinutes": <sum of all task minutes for this day>,
      "tasks": [
        {"text": "exact user-provided subtask name", "minutes": <number>}
      ]
    }
  ]
}`
    : `You are a thoughtful student creating a realistic study plan. Here's your task:

Task: ${task.title}
Type: ${task.type}
Priority: ${priority} (HIGH=3, MEDIUM=2, LOW=1)
Due Date: ${task.dueDate.toISOString().split('T')[0]}
Days Available: ${days}

Create a human-like study plan following these principles:

1. PLANNING LOGIC: Combine priority and deadline urgency. High-priority tasks with close deadlines get more total time and earlier scheduling. Long-term tasks (especially exams) should be divided into small daily study blocks (15-90 minutes each) spread over available days using spaced repetition.

2. TASK BREAKDOWN: Break the task into meaningful subtasks or study blocks. For exams, use blocks like "Review Chapter X", "Practice problems", "Concept review". For assignments, use "Research", "Draft outline", "Write section", "Review & edit". Each block should be realistic (15-90 min).

3. DISTRIBUTION:
   - Exams: Spread study across days, ramping up intensity closer to deadline
   - Assignments: Front-load the work (research/drafting early, editing near deadline)
   - Don't overload any single day (max 2-3 hours per task per day)

4. DAILY WORKLOAD: Aim for 30-180 minutes per day for this task, balanced with the assumption of other commitments.

Return ONLY valid JSON:
{
  "exam": "${task.title}",
  "totalAllocated": <total minutes>,
  "summaries": {"${task.title}": "brief planning rationale"},
  "days": [
    {
      "date": "YYYY-MM-DD",
      "totalMinutes": <sum of all task minutes for this day>,
      "tasks": [
        {"text": "descriptive subtask name", "minutes": <number>}
      ]
    }
  ]
}

Each day may have multiple task blocks. Task descriptions should be specific and helpful (not just the title repeated).`;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        { role: 'system', content: 'You are a smart study planning assistant. Think like a real student balancing urgency, priority, and realistic workloads. Create intelligent, helpful study schedules with meaningful subtasks. Output only valid JSON with no markdown fences.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1300
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty AI response');
    // Strip potential code fences
    const jsonString = content.replace(/^```json/,'').replace(/```$/,'').trim();
    const parsed = JSON.parse(jsonString);
    // Basic shape validation
    if (!parsed.exam || !Array.isArray(parsed.days)) throw new Error('Invalid shape');
    return parsed as GeneratedPlanJSON;
  } catch (err) {
    console.error('AI generation failed, falling back to stub:', err);
    return generateStudyPlanStub(task);
  }
}

// Placeholder stub: In production, call OpenAI with a structured prompt requesting JSON.
export async function generateStudyPlanStub(task: Task): Promise<GeneratedPlanJSON> {
  const now = new Date();
  const rawDays = Math.max(1, Math.ceil((task.dueDate.getTime() - now.getTime()) / (1000*60*60*24)));
  const days = Math.min(rawDays, 21); // cap horizon to avoid huge stub
  const priority: TaskPriority = (task as any).priority || 'MEDIUM';

  // Check if user provided subtasks
  const userSubtasks = (task as any).subtasks || [];
  const hasUserSubtasks = Array.isArray(userSubtasks) && userSubtasks.length > 0;

  // Total minutes heuristic based on priority & type & horizon length
  const baseByPriority: Record<TaskPriority, number> = {
    LOW: 90,
    MEDIUM: 180,
    HIGH: 300
  };
  let total = baseByPriority[priority];
  if (task.type === 'EXAM') {
    // Scale exam prep with sqrt of days for longer horizons
    total += Math.round(40 * Math.sqrt(days));
  } else {
    // Assignments: smaller base; push focus closer to due date
    total = Math.round(total * 0.6);
  }
  // Minimum safeguard
  total = Math.max(total, days * 30);

  // Ramp weights (later days heavier for exams; front-load for assignments)
  const weights: number[] = [];
  for (let i = 0; i < days; i++) {
    const progress = (i + 1) / days;
    let w: number;
    if (task.type === 'EXAM') {
      // Quadratic ramp up
      w = Math.pow(progress, 1.8);
    } else {
      // Assignment: inverse ramp (earlier more) but still some near due date
      w = Math.pow(1 - progress * 0.7, 1.2);
    }
    weights.push(w);
  }
  const sumW = weights.reduce((a,b)=>a+b,0);
  const dayMinutes = weights.map(w => Math.round((w / sumW) * total));

  const planDays: { date: string; tasks: { text: string; minutes: number }[]; totalMinutes: number }[] = [];
  
  if (hasUserSubtasks) {
    // Use user-provided subtasks: distribute them across days
    const subtaskWeights = userSubtasks.map(() => 1); // Equal weight for each subtask
    const subtaskSum = subtaskWeights.reduce((a: number, b: number) => a + b, 0);
    
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() + i*24*60*60*1000);
      const minutes = dayMinutes[i];
      if (minutes < 10) continue; // skip days with minimal allocation
      
      // Distribute minutes among user subtasks (rotate or pick based on day)
      const subtasks: { text: string; minutes: number }[] = [];
      const subtaskIndex = i % userSubtasks.length;
      const subtaskName = userSubtasks[subtaskIndex];
      
      // Can schedule multiple subtasks per day if there's enough time
      if (minutes >= 60 && userSubtasks.length > 1) {
        // Split between 2 subtasks
        const mins1 = Math.floor(minutes * 0.6);
        const mins2 = minutes - mins1;
        subtasks.push({ text: userSubtasks[subtaskIndex], minutes: mins1 });
        subtasks.push({ text: userSubtasks[(subtaskIndex + 1) % userSubtasks.length], minutes: mins2 });
      } else {
        subtasks.push({ text: subtaskName, minutes });
      }
      
      planDays.push({
        date: d.toISOString().split('T')[0],
        totalMinutes: minutes,
        tasks: subtasks
      });
    }
  } else {
    // Generate AI subtasks based on task type
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() + i*24*60*60*1000);
      const minutes = dayMinutes[i];
      if (minutes < 10) continue; // skip days with minimal allocation
      
      // Generate realistic subtasks based on task type
      const subtasks: { text: string; minutes: number }[] = [];
      if (task.type === 'EXAM') {
        // For exams, break into study blocks
        const numBlocks = Math.ceil(minutes / 45);
        const blockMinutes = Math.floor(minutes / numBlocks);
        const progress = (i + 1) / days;
        if (progress < 0.4) {
          subtasks.push({ text: `Review core concepts for ${task.title}`, minutes: blockMinutes });
        } else if (progress < 0.7) {
          subtasks.push({ text: `Practice problems for ${task.title}`, minutes: blockMinutes });
        } else {
          subtasks.push({ text: `Final review and practice for ${task.title}`, minutes: blockMinutes });
        }
      } else {
        // For assignments, break into work phases
        const progress = (i + 1) / days;
        if (progress < 0.3) {
          subtasks.push({ text: `Research and planning for ${task.title}`, minutes });
        } else if (progress < 0.7) {
          subtasks.push({ text: `Work on ${task.title}`, minutes });
        } else {
          subtasks.push({ text: `Review and finalize ${task.title}`, minutes });
        }
      }
      
      planDays.push({
        date: d.toISOString().split('T')[0],
        totalMinutes: minutes,
        tasks: subtasks
      });
    }
  }
  
  return {
    exam: task.title,
    days: planDays,
    summaries: { [task.title]: hasUserSubtasks ? `Priority: ${priority}. Using user-provided subtasks. Total ~${total} minutes.` : `Priority: ${priority}. Recommended total ~${total} minutes.` },
    totalAllocated: total
  };
}

export async function persistGeneratedPlan(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('Task not found');
  const json = await generateStudyPlanAI(task);
  const existing = await prisma.studyPlan.findUnique({ where: { taskId } });
  if (existing) {
    await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: existing.id } } });
    await prisma.studyDay.deleteMany({ where: { studyPlanId: existing.id } });
    await prisma.studyPlan.delete({ where: { id: existing.id } });
  }
  const plan = await prisma.studyPlan.create({ data: { taskId, model: process.env.OPENAI_API_KEY ? 'openai:gpt-4o-mini' : 'stub', summaryJson: json.summaries } });
  for (const day of json.days) {
    const createdDay = await prisma.studyDay.create({ data: { studyPlanId: plan.id, date: new Date(day.date) } });
    // Store all AI-generated subtasks with their specific descriptions
    if (Array.isArray(day.tasks) && day.tasks.length > 0) {
      for (const t of day.tasks) {
        await prisma.studyDayTask.create({
          data: { studyDayId: createdDay.id, description: t.text, allocatedMinutes: t.minutes || 0 } as any
        });
      }
    }
  }
  return plan.id;
}

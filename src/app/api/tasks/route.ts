import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const tasks = await prisma.task.findMany({ where: { userId: user.id }, orderBy: { dueDate: 'asc' } });
  return Response.json(tasks);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const data = await req.json();
  const { title, type, dueDate, notes, courseId } = data;
  if (!title || !type || !dueDate) return new Response('Missing fields', { status: 400 });
  const task = await prisma.task.create({ data: { title, type, dueDate: new Date(dueDate), notes, courseId, userId: user.id } });
  return Response.json(task, { status: 201 });
}

// For bulk delete via query param ?all=true (optional convenience)
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const url = new URL(req.url);
  const all = url.searchParams.get('all');
  if (all === 'true') {
    // Cascade delete study plans & related day tasks first
    const tasks = await prisma.task.findMany({ where: { userId: user.id } });
    const taskIds = tasks.map(t=>t.id);
    const plans = await prisma.studyPlan.findMany({ where: { taskId: { in: taskIds } } });
    const planIds = plans.map(p=>p.id);
    await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: { in: planIds } } } });
    await prisma.studyDay.deleteMany({ where: { studyPlanId: { in: planIds } } });
    await prisma.studyPlan.deleteMany({ where: { id: { in: planIds } } });
    await prisma.task.deleteMany({ where: { userId: user.id } });
    return new Response(null, { status: 204 });
  }
  return new Response('Specify ?all=true or use /api/tasks/[id]', { status: 400 });
}

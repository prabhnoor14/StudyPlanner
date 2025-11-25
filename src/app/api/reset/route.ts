import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function POST(_req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  // Collect all tasks and plans
  const tasks = await prisma.task.findMany({ where: { userId: user.id } });
  const taskIds = tasks.map(t=>t.id);
  const plans = await prisma.studyPlan.findMany({ where: { taskId: { in: taskIds } } });
  const planIds = plans.map(p=>p.id);
  await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: { in: planIds } } } });
  await prisma.studyDay.deleteMany({ where: { studyPlanId: { in: planIds } } });
  await prisma.studyPlan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.course.deleteMany({ where: { userId: user.id } });
  return new Response(JSON.stringify({ status: 'reset' }), { status: 200 });
}

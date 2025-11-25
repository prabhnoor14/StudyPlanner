import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task || task.userId !== user.id) return new Response('Not found', { status: 404 });
  const plan = await prisma.studyPlan.findUnique({ where: { taskId: task.id }, include: { days: { include: { tasks: true } } } });
  if (plan) {
    await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: plan.id } } });
    await prisma.studyDay.deleteMany({ where: { studyPlanId: plan.id } });
    await prisma.studyPlan.delete({ where: { id: plan.id } });
  }
  await prisma.task.delete({ where: { id: task.id } });
  return new Response(null, { status: 204 });
}

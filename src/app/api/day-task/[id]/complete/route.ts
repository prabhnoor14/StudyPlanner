import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const task = await prisma.studyDayTask.findUnique({ where: { id: params.id }, include: { studyDay: { include: { studyPlan: { include: { task: true } } } } } });
  if (!task || task.studyDay.studyPlan.task.userId !== user.id) return new Response('Not found', { status: 404 });
  const updated = await prisma.studyDayTask.update({ where: { id: task.id }, data: { completed: !task.completed } });
  return Response.json({ id: updated.id, completed: updated.completed });
}

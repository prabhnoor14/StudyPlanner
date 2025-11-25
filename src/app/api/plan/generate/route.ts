import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import { persistGeneratedPlan } from '../../../../lib/ai';
import { prisma } from '../../../../lib/prisma';

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { taskId } = await req.json();
  if (!taskId) return new Response('taskId required', { status: 400 });
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.userId !== user.id) return new Response('Not found', { status: 404 });
  const planId = await persistGeneratedPlan(taskId);
  return Response.json({ planId });
}

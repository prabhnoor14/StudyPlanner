import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const course = await prisma.course.findUnique({ where: { id: params.id } });
  if (!course || course.userId !== user.id) return new Response('Not found', { status: 404 });
  // Delete tasks belonging to this course
  const tasks = await prisma.task.findMany({ where: { courseId: course.id } });
  const taskIds = tasks.map(t=>t.id);
  const plans = await prisma.studyPlan.findMany({ where: { taskId: { in: taskIds } } });
  const planIds = plans.map(p=>p.id);
  await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: { in: planIds } } } });
  await prisma.studyDay.deleteMany({ where: { studyPlanId: { in: planIds } } });
  await prisma.studyPlan.deleteMany({ where: { id: { in: planIds } } });
  await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
  await prisma.course.delete({ where: { id: course.id } });
  return new Response(null, { status: 204 });
}

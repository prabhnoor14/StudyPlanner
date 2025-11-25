import { NextRequest } from 'next/server';
import { getAuthUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const courses = await prisma.course.findMany({ where: { userId: user.id } });
  return Response.json(courses);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const data = await req.json();
  const { name, instructor, meetingDays } = data;
  if (!name) return new Response('Name required', { status: 400 });
  const course = await prisma.course.create({ data: { name, instructor, meetingDays: meetingDays || [], userId: user.id } });
  return Response.json(course, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const url = new URL(req.url);
  const all = url.searchParams.get('all');
  if (all === 'true') {
    // Delete tasks for these courses after removing plans
    const courses = await prisma.course.findMany({ where: { userId: user.id } });
    const courseIds = courses.map(c=>c.id);
    const tasks = await prisma.task.findMany({ where: { userId: user.id, courseId: { in: courseIds } } });
    const taskIds = tasks.map(t=>t.id);
    const plans = await prisma.studyPlan.findMany({ where: { taskId: { in: taskIds } } });
    const planIds = plans.map(p=>p.id);
    await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: { in: planIds } } } });
    await prisma.studyDay.deleteMany({ where: { studyPlanId: { in: planIds } } });
    await prisma.studyPlan.deleteMany({ where: { id: { in: planIds } } });
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
    return new Response(null, { status: 204 });
  }
  return new Response('Specify ?all=true or use /api/courses/[id]', { status: 400 });
}

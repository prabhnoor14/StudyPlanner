import { prisma } from '../../lib/prisma';
import { getAuthUser } from '../../lib/auth';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';

export default async function ManagePage() {
  const user = await getAuthUser();
  if (!user) return <div className="p-6">Not logged in</div>;
  const courses = await prisma.course.findMany({ where: { userId: user.id } });
  const tasks = await prisma.task.findMany({ where: { userId: user.id, isCompleted: false }, include: { course: true } });
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Manage Data</h1>
        <form action={async () => {
          'use server';
          const user = await getAuthUser();
          if (!user) return;
          const tasks = await prisma.task.findMany({ where: { userId: user.id } });
          const taskIds = tasks.map(t => t.id);
          const plans = await prisma.studyPlan.findMany({ where: { taskId: { in: taskIds } } });
          const planIds = plans.map(p => p.id);
          await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: { in: planIds } } } });
          await prisma.studyDay.deleteMany({ where: { studyPlanId: { in: planIds } } });
          await prisma.studyPlan.deleteMany({ where: { id: { in: planIds } } });
          await prisma.task.deleteMany({ where: { userId: user.id } });
          await prisma.course.deleteMany({ where: { userId: user.id } });
          revalidatePath('/manage');
          revalidatePath('/dashboard');
        }}>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium" type="submit">Reset All</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <section className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Courses</h2>
          <Link href="/courses/add" className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Course</Link>
        </div>
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-6 text-lg">No courses yet.</p>
            <Link href="/courses/add" className="btn text-base px-6 py-3">Add Your First Course</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {courses.map(c => (
              <li key={c.id} className="flex items-center justify-between border border-gray-200 bg-white p-5 rounded-lg hover:border-gray-300 transition-colors">
                <div>
                  <div className="font-medium text-gray-900 text-lg">{c.name}</div>
                  {c.instructor && <div className="text-sm text-gray-600">{c.instructor}</div>}
                  <div className="text-xs text-gray-500 mt-1">{c.meetingDays.join(', ')}</div>
                </div>
                <form action={async () => {
                  'use server';
                  const user = await getAuthUser();
                  if (!user) return;
                  const course = await prisma.course.findFirst({ where: { id: c.id, userId: user.id } });
                  if (!course) return;
                  const tasks = await prisma.task.findMany({ where: { courseId: course.id } });
                  const taskIds = tasks.map(t => t.id);
                  const plans = await prisma.studyPlan.findMany({ where: { taskId: { in: taskIds } } });
                  const planIds = plans.map(p => p.id);
                  await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: { in: planIds } } } });
                  await prisma.studyDay.deleteMany({ where: { studyPlanId: { in: planIds } } });
                  await prisma.studyPlan.deleteMany({ where: { id: { in: planIds } } });
                  await prisma.task.deleteMany({ where: { courseId: course.id } });
                  await prisma.course.delete({ where: { id: course.id } });
                  revalidatePath('/manage');
                  revalidatePath('/dashboard');
                }}>
                  <button type="submit" className="text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md font-medium">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Tasks</h2>
          <Link href="/tasks/add" className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Task</Link>
        </div>
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-6 text-lg">No active tasks.</p>
            <Link href="/tasks/add" className="btn text-base px-6 py-3">Add Your First Task</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {tasks.map(t => (
              <li key={t.id} className="flex items-center justify-between border border-gray-200 bg-white p-5 rounded-lg hover:border-gray-300 transition-colors">
                <div className="flex-1">
                  <Link href={`/plan/${t.id}`} className="font-medium text-gray-900 hover:text-brand-600 text-lg">{t.title}</Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">{t.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      (t as any).priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                      (t as any).priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>{(t as any).priority}</span>
                    {t.course && <span className="text-xs text-gray-500">{t.course.name}</span>}
                    <span className="text-xs text-gray-500">Due {new Date(t.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <form action={async () => {
                    'use server';
                    const user = await getAuthUser();
                    if (!user) return;
                    await (prisma as any).task.update({ where: { id: t.id }, data: { isCompleted: true } });
                    revalidatePath('/manage');
                    revalidatePath('/dashboard');
                  }}>
                    <button type="submit" className="text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md font-medium">Mark Done</button>
                  </form>
                  <form action={async () => {
                    'use server';
                    const user = await getAuthUser();
                    if (!user) return;
                    const task = await prisma.task.findFirst({ where: { id: t.id, userId: user.id } });
                    if (!task) return;
                    const plan = await prisma.studyPlan.findFirst({ where: { taskId: task.id } });
                    if (plan) {
                      await prisma.studyDayTask.deleteMany({ where: { studyDay: { studyPlanId: plan.id } } });
                      await prisma.studyDay.deleteMany({ where: { studyPlanId: plan.id } });
                      await prisma.studyPlan.deleteMany({ where: { id: plan.id } });
                    }
                    await prisma.task.delete({ where: { id: task.id } });
                    revalidatePath('/manage');
                    revalidatePath('/dashboard');
                  }}>
                    <button type="submit" className="text-sm px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md font-medium">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/dashboard" className="text-brand-600 hover:text-brand-700 font-medium">← Back to Dashboard</Link>
      </div>
    </div>
  );
}

import { getAuthUser } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { persistGeneratedPlan } from '../../lib/ai';
import { revalidatePath } from 'next/cache';

export default async function SettingsPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  const tasks = await prisma.task.findMany({ where: { userId: user.id }, include: { plan: true } });
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold">Settings & Regeneration</h2>
      <div className="card space-y-4">
        <h3 className="font-medium">Regenerate Study Plans</h3>
        <form action={async () => {
          'use server';
          for (const t of tasks) {
            await persistGeneratedPlan(t.id);
          }
          revalidatePath('/dashboard');
        }}>
          <button className="btn" type="submit">Regenerate All</button>
        </form>
        <ul className="space-y-2 text-sm">
          {tasks.map(t => (
            <li key={t.id} className="flex items-center justify-between">
              <span>{t.title}</span>
              <form action={async () => {
                'use server';
                await persistGeneratedPlan(t.id);
                revalidatePath('/dashboard');
                revalidatePath(`/plan/${t.id}`);
              }}>
                <button className="btn btn-secondary" type="submit">Regenerate</button>
              </form>
            </li>
          ))}
        </ul>
      </div>
      <div className="card text-sm text-gray-600">
        <p>Plans are currently generated using a stub. Configure your <code>OPENAI_API_KEY</code> to enable real AI summaries.</p>
        <p className="mt-2">View a plan via task list or directly: {tasks[0] && <Link className="link" href={`/plan/${tasks[0].id}`}>First Task Plan</Link>}</p>
      </div>
    </div>
  );
}

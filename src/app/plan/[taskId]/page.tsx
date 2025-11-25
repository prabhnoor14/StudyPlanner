import { prisma } from '../../../lib/prisma';
import { getAuthUser } from '../../../lib/auth';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { persistGeneratedPlan } from '../../../lib/ai';
import { revalidatePath } from 'next/cache';

interface Params { params: { taskId: string } }

export default async function StudyPlanPage({ params }: Params) {
  const user = await getAuthUser();
  if (!user) return <div className="card p-6"><p>Please <Link href="/login" className="link">login</Link>.</p></div>;
  const task = await prisma.task.findUnique({ 
    where: { id: params.taskId },
    include: {
      plan: {
        include: {
          days: {
            include: { tasks: true },
            orderBy: { date: 'asc' }
          }
        }
      }
    }
  });
  if (!task || task.userId !== user.id) notFound();
  
  const plan = task.plan;
  if (!plan) {
    return (
      <div className="card p-6">
        <p className="mb-4">No plan generated yet.</p>
        <GenerateButton taskId={task.id} />
      </div>
    );
  }

  // Flatten all subtasks from all days
  const allSubtasks = plan.days.flatMap(day => 
    day.tasks.map(t => ({
      id: t.id,
      description: t.description,
      minutes: t.allocatedMinutes,
      completed: t.completed,
      date: day.date
    }))
  );

  const completedCount = allSubtasks.filter(st => st.completed).length;
  const totalCount = allSubtasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalMinutes = allSubtasks.reduce((sum, st) => sum + st.minutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{task.title}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {task.type} • Due {new Date(task.dueDate).toLocaleDateString()}
          </p>
        </div>
        <GenerateButton taskId={task.id} />
      </div>

      {/* Progress Overview */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Progress</h3>
          <span className="text-sm text-gray-600">{completedCount}/{totalCount} complete</span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-brand-600 transition-all duration-300" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-gray-600">
          ⏱️ AI Estimate: ~{totalHours} hours total
        </p>
      </div>

      {/* Subtasks List */}
      <div className="card p-6">
        <h3 className="font-semibold mb-4">Subtasks</h3>
        <div className="space-y-2">
          {allSubtasks.length === 0 ? (
            <p className="text-sm text-gray-600">No subtasks generated.</p>
          ) : (
            allSubtasks.map((subtask) => (
              <SubtaskItem key={subtask.id} subtask={subtask} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SubtaskItem({ subtask }: { subtask: any }) {
  return (
    <form action={async () => {
      'use server';
      await prisma.studyDayTask.update({
        where: { id: subtask.id },
        data: { completed: !subtask.completed }
      });
      revalidatePath('/dashboard');
      const task = await prisma.studyDayTask.findUnique({
        where: { id: subtask.id },
        include: {
          studyDay: {
            include: {
              studyPlan: true
            }
          }
        }
      });
      if (task?.studyDay?.studyPlan?.taskId) {
        revalidatePath(`/plan/${task.studyDay.studyPlan.taskId}`);
      }
    }}>
      <button 
        type="submit"
        className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
          subtask.completed 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-white border-gray-300 hover:border-brand-500 hover:bg-brand-50'
        }`}
      >
        <input 
          type="checkbox" 
          checked={subtask.completed} 
          onChange={() => {}} // Controlled by form submit
          className="w-5 h-5 rounded border-gray-300"
        />
        <div className="flex-1 text-left">
          <p className={`text-sm ${subtask.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
            {subtask.description}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {subtask.minutes}m • {new Date(subtask.date).toLocaleDateString()}
          </p>
        </div>
      </button>
    </form>
  );
}

function GenerateButton({ taskId }: { taskId: string }) {
  return (
    <form action={async () => {
      'use server';
      await persistGeneratedPlan(taskId);
      revalidatePath(`/plan/${taskId}`);
      revalidatePath('/dashboard');
    }}>
      <button className="btn" type="submit">Regenerate Plan</button>
    </form>
  );
}

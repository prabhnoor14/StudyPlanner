import { getAuthUser } from '../../lib/auth';
import { prisma } from '../../lib/prisma';
import Link from 'next/link';
import { format, differenceInDays } from 'date-fns';
import { revalidatePath } from 'next/cache';

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) return <div className="card p-6"><p>Please <Link href="/login" className="link">login</Link>.</p></div>;

  const today = new Date();
  
  // Get all incomplete tasks with their AI-generated subtasks
  const allTasks = await prisma.task.findMany({
    where: { userId: user.id, isCompleted: false },
    include: {
      plan: {
        include: {
          days: {
            include: { tasks: true }
          }
        }
      }
    },
    orderBy: { dueDate: 'asc' }
  });

  // Calculate aggregate progress
  const plans = await prisma.studyPlan.findMany({
    where: { task: { userId: user.id } },
    include: { days: { include: { tasks: true } }, task: true }
  });

  const aggregate = plans.reduce((acc, p) => {
    const allTasks = p.days.flatMap(d => d.tasks);
    acc.total += allTasks.length;
    acc.completed += allTasks.filter(t => t.completed).length;
    return acc;
  }, { total: 0, completed: 0 });

  const overallPct = aggregate.total ? Math.round((aggregate.completed / aggregate.total) * 100) : 0;

  // Group tasks by priority
  const tasksByPriority = {
    HIGH: allTasks.filter(t => (t as any).priority === 'HIGH'),
    MEDIUM: allTasks.filter(t => (t as any).priority === 'MEDIUM'),
    LOW: allTasks.filter(t => (t as any).priority === 'LOW'),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Overall Progress: <span className="font-semibold text-brand-600">{overallPct}%</span> ({aggregate.completed}/{aggregate.total})
          </div>
        </div>
      </div>
      
      <TaskBoard tasksByPriority={tasksByPriority} />
    </div>
  );
}

function TaskBoard({ tasksByPriority }: { tasksByPriority: any }) {
  const priorityConfig = {
    HIGH: { label: 'High Priority', color: 'border-red-500 bg-red-50', badgeColor: 'bg-red-600' },
    MEDIUM: { label: 'Medium Priority', color: 'border-yellow-500 bg-yellow-50', badgeColor: 'bg-yellow-500' },
    LOW: { label: 'Low Priority', color: 'border-green-500 bg-green-50', badgeColor: 'bg-green-600' },
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {Object.entries(priorityConfig).map(([priority, config]) => {
        const tasks = tasksByPriority[priority as keyof typeof tasksByPriority] || [];
        return (
          <div key={priority} className={`border-2 rounded-lg ${config.color} p-4`}>
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-3 h-3 rounded-full ${config.badgeColor}`} />
              <h3 className="font-semibold text-gray-800">{config.label}</h3>
              <span className="ml-auto text-sm text-gray-600">{tasks.length}</span>
            </div>
            
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No tasks</p>
              ) : (
                tasks.map((task: any) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({ task }: { task: any }) {
  const today = new Date();
  const daysUntilDue = differenceInDays(task.dueDate, today);
  const urgencyLabel = daysUntilDue < 0 
    ? 'Overdue!' 
    : daysUntilDue === 0 
    ? 'Due today' 
    : daysUntilDue === 1 
    ? 'Due tomorrow'
    : `${daysUntilDue} days left`;
  
  const urgencyColor = daysUntilDue < 0 
    ? 'text-red-600 font-semibold' 
    : daysUntilDue <= 2 
    ? 'text-orange-600 font-medium' 
    : 'text-gray-600';

  // Extract AI-generated subtasks from study plan
  const subtasks = task.plan?.days?.flatMap((day: any) => 
    day.tasks.map((t: any) => ({
      id: t.id,
      description: t.description,
      minutes: t.allocatedMinutes,
      completed: t.completed,
      date: day.date
    }))
  ) || [];

  // Get user-provided subtasks if they exist
  const userSubtasks = task.subtasks || [];
  const hasUserSubtasks = userSubtasks.length > 0;

  // Calculate total estimated time
  const totalMinutes = subtasks.reduce((sum: number, st: any) => sum + (st.minutes || 0), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  
  const completedSubtasks = subtasks.filter((st: any) => st.completed).length;
  const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <Link href={`/plan/${task.id}`} className="font-medium text-gray-900 hover:text-brand-600">
            {task.title}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{task.type}</span>
            <span className={`text-xs ${urgencyColor}`}>{urgencyLabel}</span>
          </div>
        </div>
      </div>

      {/* AI Time Estimate */}
      {totalMinutes > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
          <span>⏱️ AI Estimate: ~{totalHours}h</span>
          {hasUserSubtasks && <span className="text-brand-600">• Custom breakdown</span>}
        </div>
      )}

      {/* Progress Bar */}
      {subtasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>{completedSubtasks}/{subtasks.length} subtasks done</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-600 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upcoming Subtasks Preview */}
      {subtasks.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-700">Next up:</p>
          {subtasks.slice(0, 3).map((st: any) => (
            <form key={st.id} action={async () => {
              'use server';
              await prisma.studyDayTask.update({
                where: { id: st.id },
                data: { completed: !st.completed }
              });
              revalidatePath('/dashboard');
            }}>
              <button type="submit" className={`w-full text-xs flex items-center gap-2 hover:bg-gray-50 p-1 rounded ${st.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                <input 
                  type="checkbox" 
                  checked={st.completed} 
                  readOnly
                  className="w-3 h-3 pointer-events-none"
                />
                <span className="flex-1 truncate text-left">{st.description}</span>
                {st.minutes > 0 && <span className="text-gray-500">{st.minutes}m</span>}
              </button>
            </form>
          ))}
        </div>
      )}

      {/* No plan yet */}
      {subtasks.length === 0 && (
        <Link href={`/plan/${task.id}`} className="text-xs text-brand-600 hover:underline">
          View AI breakdown →
        </Link>
      )}
    </div>
  );
}

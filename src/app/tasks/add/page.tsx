import { getAuthUser } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';
import { redirect } from 'next/navigation';
import { persistGeneratedPlan } from '../../../lib/ai';
import { revalidatePath } from 'next/cache';

export default async function AddTaskPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  const courses = await prisma.course.findMany({ where: { userId: user.id } });
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Add Exam / Assignment</h2>
      <form className="card p-6 space-y-4" action={async (formData) => {
        'use server';
        const title = String(formData.get('title'));
        const type = String(formData.get('type'));
        const priority = String(formData.get('priority') || 'MEDIUM');
        const dueDate = String(formData.get('dueDate'));
        const notes = String(formData.get('notes') || '');
        const courseId = String(formData.get('courseId') || '');
        const subtasksRaw = String(formData.get('subtasks') || '');
        
        // Parse subtasks: split by newlines and filter empty entries
        const subtasks = subtasksRaw
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        const task = await prisma.task.create({
          data: {
            title,
            type: type as any,
            priority: priority as any,
            dueDate: new Date(dueDate),
            notes: notes || undefined,
            courseId: courseId || undefined,
            userId: user.id,
            subtasks: subtasks.length > 0 ? subtasks : undefined
          }
        });
        await persistGeneratedPlan(task.id);
        revalidatePath('/dashboard');
        revalidatePath('/manage');
        revalidatePath(`/plan/${task.id}`);
        redirect('/dashboard');
      }}>
        <div>
          <label className="label">Title</label>
          <input name="title" className="input" required />
        </div>
        <div>
          <label className="label">Type</label>
          <select name="type" className="input" required>
            <option value="EXAM">Exam</option>
            <option value="ASSIGNMENT">Assignment</option>
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select name="priority" className="input" required defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div>
          <label className="label">Due Date</label>
          <input name="dueDate" type="date" className="input" required />
        </div>
        <div>
          <label className="label">Course</label>
          <select name="courseId" className="input">
            <option value="">(Optional)</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea name="notes" className="input" rows={3} />
        </div>
        <div>
          <label className="label">Custom Subtasks (Optional)</label>
          <textarea 
            name="subtasks" 
            className="input" 
            rows={4}
            placeholder="Enter one subtask per line, e.g.:&#10;Review chapters 1-3&#10;Complete problem set&#10;Practice past exams&#10;&#10;Leave empty for AI-generated breakdown"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 Enter specific tasks you want to complete. If left empty, AI will generate a smart breakdown for you.
          </p>
        </div>
        <button className="btn w-full">Save</button>
      </form>
    </div>
  );
}

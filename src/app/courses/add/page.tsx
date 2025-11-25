import { getAuthUser } from '../../../lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '../../../lib/prisma';

export default async function AddCoursePage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  return (
    <div className="max-w-md mx-auto space-y-6">
      <h2 className="text-xl font-semibold">Add Course</h2>
      <form className="card p-6 space-y-4" action={async (formData) => {
        'use server';
        const name = String(formData.get('name'));
        const instructor = String(formData.get('instructor') || '');
        const meetingDays = String(formData.get('meetingDays') || '').split(',').map(d => d.trim()).filter(Boolean);
        await prisma.course.create({ data: { name, instructor, meetingDays, userId: user.id } });
        redirect('/dashboard');
      }}>
        <div>
          <label className="label">Course Name</label>
          <input name="name" className="input" required />
        </div>
        <div>
          <label className="label">Instructor</label>
            <input name="instructor" className="input" />
        </div>
        <div>
          <label className="label">Meeting Days (comma separated)</label>
          <input name="meetingDays" placeholder="Mon,Wed" className="input" />
        </div>
        <button className="btn w-full">Save</button>
      </form>
    </div>
  );
}

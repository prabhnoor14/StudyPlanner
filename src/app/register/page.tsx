import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '../../lib/auth';

export default async function RegisterPage() {
  const user = await getAuthUser();
  if (user) redirect('/dashboard');
  return (
    <div className="max-w-4xl mx-auto mt-20">
      <div className="card p-24">
        <h2 className="text-2xl font-semibold mb-12 text-center">Create Account</h2>
        <form action="/api/auth/register" method="post" className="space-y-8">
          <div>
            <label className="label text-lg mb-2 block">Username</label>
            <input name="username" className="input text-xl p-4" required />
          </div>
          <div>
            <label className="label text-lg mb-2 block">Password</label>
            <input name="password" type="password" className="input text-xl p-4" required minLength={6} />
            <p className="text-sm text-gray-500 mt-2">At least 6 characters</p>
          </div>
          <button className="btn w-full text-xl py-4 mt-8" type="submit">Register</button>
        </form>
        <p className="text-base text-gray-600 text-center mt-8">
          Already have an account? <Link href="/login" className="link font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}

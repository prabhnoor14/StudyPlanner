import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthUser } from '../../lib/auth';

export default async function LoginPage() {
  const user = await getAuthUser();
  if (user) redirect('/dashboard');
  return (
    <div className="max-w-4xl mx-auto mt-20">
      <div className="card p-24">
        <h2 className="text-2xl font-semibold mb-12 text-center">Login</h2>
        <form action="/api/auth/login" method="post" className="space-y-8">
          <div>
            <label className="label text-lg mb-2 block">Username</label>
            <input name="username" className="input text-xl p-4" required />
          </div>
          <div>
            <label className="label text-lg mb-2 block">Password</label>
            <input name="password" type="password" className="input text-xl p-4" required />
          </div>
          <button className="btn w-full text-xl py-4 mt-8" type="submit">Login</button>
        </form>
        <p className="text-base text-gray-600 text-center mt-8">
          Don't have an account? <Link href="/register" className="link font-medium">Register</Link>
        </p>
      </div>
    </div>
  );
}

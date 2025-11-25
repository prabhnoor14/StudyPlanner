import '../styles/globals.css';
import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthUser } from '../lib/auth';

export const metadata: Metadata = {
  title: 'AI Study Plan Generator',
  description: 'Personalized AI-driven study schedules for students.'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  async function logoutAction() {
    'use server';
    cookies().set('auth_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    redirect('/login');
  }
  const user = await getAuthUser();
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white">
            <div className="container-page py-3 flex items-center justify-between">
              <Link href="/dashboard" className="text-lg font-semibold">StudyPlan AI</Link>
              <nav className="text-sm flex gap-4 items-center">
                {user && (
                  <>
                    <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                    <Link href="/tasks/add" className="hover:underline">Add Task</Link>
                    <Link href="/courses/add" className="hover:underline">Add Course</Link>
                    <Link href="/manage" className="hover:underline">Manage</Link>
                    <form action={logoutAction}>
                      <button type="submit" className="text-red-600 hover:underline">Logout</button>
                    </form>
                  </>
                )}
                {!user && (
                  <>
                    <Link href="/login" className="hover:underline">Login</Link>
                    <Link href="/register" className="hover:underline">Register</Link>
                  </>
                )}
              </nav>
            </div>
          </header>
            <main className="flex-1 container-page py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

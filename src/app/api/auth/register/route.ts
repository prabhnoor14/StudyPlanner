import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcrypt';
import { signAuthToken } from '../../../../lib/jwt';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  if (!username || !password) {
    return new Response('Missing credentials', { status: 400 });
  }
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return new Response('Username taken', { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username, passwordHash: hash } });
  const token = signAuthToken({ userId: user.id, username: user.username });
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      'Location': '/dashboard'
    }
  });
}

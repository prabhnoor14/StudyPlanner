import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import bcrypt from 'bcrypt';
import { signAuthToken } from '../../../../lib/jwt';

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return new Response('Invalid credentials', { status: 401 });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return new Response('Invalid credentials', { status: 401 });
  const token = signAuthToken({ userId: user.id, username: user.username });
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': `auth_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
      'Location': '/dashboard'
    }
  });
}

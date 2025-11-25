import { cookies } from 'next/headers';
import { verifyAuthToken } from './jwt';
import { prisma } from './prisma';

export async function getAuthUser() {
  const cookieStore = cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;
  const payload = verifyAuthToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.userId } });
}

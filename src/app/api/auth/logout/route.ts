import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function POST(_req: NextRequest) {
  cookies().set('auth', '', { httpOnly: true, path: '/', maxAge: 0 });
  return new Response(JSON.stringify({ status: 'logged_out' }), { status: 200 });
}

export async function GET(req: NextRequest) {
  return POST(req);
}

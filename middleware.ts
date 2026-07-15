import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from './lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('chat-session')?.value

  // Protect /chat and auth pages
  const isChatPath = pathname.startsWith('/chat')
  const isAuthPath = pathname === '/login' || pathname === '/register' || pathname === '/'

  let user = null
  if (token) {
    user = await verifyJWT(token)
  }

  // Redirect to login if not authenticated and accessing chat
  if (isChatPath && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect to chat if authenticated and accessing auth pages
  if (isAuthPath && user) {
    return NextResponse.redirect(new URL('/chat', request.url))
  }

  // Redirect / to /login if not authenticated
  if (pathname === '/' && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/chat/:path*',
    '/login',
    '/register',
  ],
}

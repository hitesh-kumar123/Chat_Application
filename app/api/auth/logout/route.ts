import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value

    if (token) {
      const user = await verifyJWT(token)
      if (user) {
        await db.user.update({
          where: { id: user.id },
          data: { status: 'OFFLINE', lastActiveAt: new Date() },
        })
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.delete('chat-session')
    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Something went wrong during logout' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyJWT, signJWT } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  avatarUrl: z.string().url('Invalid avatar URL').optional(),
})

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const sessionUser = await verifyJWT(token)
    if (!sessionUser) {
      return NextResponse.json({ user: null })
    }

    const user = await db.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
        lastActiveAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Fetch profile error:', error)
    return NextResponse.json(
      { error: 'Something went wrong fetching user profile' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = await verifyJWT(token)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, avatarUrl } = updateProfileSchema.parse(body)

    if (email && email !== sessionUser.email) {
      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
    }

    const updatedUser = await db.user.update({
      where: { id: sessionUser.id },
      data: {
        name: name ?? undefined,
        email: email ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        status: true,
      }
    })

    const newToken = await signJWT({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatarUrl: updatedUser.avatarUrl,
    })

    const response = NextResponse.json({ success: true, user: updatedUser })
    response.cookies.set('chat-session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionUser = await verifyJWT(token)
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rooms = await db.room.findMany({
      where: { userIds: { has: sessionUser.id } }
    })

    for (const room of rooms) {
      const updatedUserIds = room.userIds.filter(id => id !== sessionUser.id)
      if (updatedUserIds.length === 0) {
        await db.message.deleteMany({ where: { roomId: room.id } })
        await db.room.delete({ where: { id: room.id } })
      } else {
        await db.room.update({
          where: { id: room.id },
          data: {
            userIds: updatedUserIds,
            users: { disconnect: { id: sessionUser.id } }
          }
        })
      }
    }

    await db.message.deleteMany({
      where: { userId: sessionUser.id }
    })

    await db.user.delete({
      where: { id: sessionUser.id }
    })

    const response = NextResponse.json({ success: true })
    response.cookies.delete('chat-session')
    return response
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}

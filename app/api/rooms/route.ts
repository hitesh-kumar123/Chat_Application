import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'
import { z } from 'zod'
import { broadcastEvent, broadcastToUsers } from '@/lib/broadcast'

const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').optional(),
  description: z.string().optional(),
  isGroup: z.boolean().default(false),
  userIds: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyJWT(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all rooms where the user is a member
    const rooms = await db.room.findMany({
      where: {
        userIds: {
          has: user.id,
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error('Fetch rooms error:', error)
    return NextResponse.json(
      { error: 'Something went wrong fetching rooms' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await verifyJWT(token)
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, description, isGroup, userIds } = createRoomSchema.parse(body)

    const allUserIds = Array.from(new Set([...userIds, currentUser.id]))

    // If it's a DM, check if room already exists
    if (!isGroup && allUserIds.length === 2) {
      const existingRoom = await db.room.findFirst({
        where: {
          isGroup: false,
          userIds: {
            hasEvery: allUserIds,
          },
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              status: true,
            },
          },
        },
      })

      if (existingRoom && existingRoom.userIds.length === 2) {
        return NextResponse.json({ room: existingRoom, exists: true })
      }
    }

    // Create room and link users
    const room = await db.room.create({
      data: {
        name: name || (isGroup ? 'Group Chat' : 'Direct Message'),
        description,
        isGroup,
        userIds: allUserIds,
        users: {
          connect: allUserIds.map(id => ({ id })),
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
    })

    // Broadcast new room creation to all members so their sidebars update in real-time
    await broadcastToUsers(allUserIds, 'ROOM_CREATED', { room })

    return NextResponse.json({ room, exists: false })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Create room error:', error)
    return NextResponse.json(
      { error: 'Something went wrong creating the room' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.cookies.get('chat-session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await verifyJWT(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const action = searchParams.get('action') || 'delete' // clear, delete, leave

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
    }

    const room = await db.room.findFirst({
      where: {
        id: roomId,
        userIds: {
          has: user.id,
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 })
    }

    if (action === 'clear') {
      await db.message.deleteMany({
        where: { roomId },
      })
      await broadcastEvent(roomId, 'ROOM_CLEARED', { roomId })
      return NextResponse.json({ success: true, action: 'clear' })
    }

    if (action === 'leave') {
      const updatedUserIds = room.userIds.filter(id => id !== user.id)

      if (updatedUserIds.length === 0) {
        await db.message.deleteMany({ where: { roomId } })
        await db.room.delete({ where: { id: roomId } })
      } else {
        await db.room.update({
          where: { id: roomId },
          data: {
            userIds: updatedUserIds,
            users: {
              disconnect: { id: user.id }
            }
          }
        })
      }

      await broadcastEvent(roomId, 'USER_LEFT_ROOM', { roomId, userId: user.id })
      return NextResponse.json({ success: true, action: 'leave' })
    }

    // Default: 'delete' (Delete entire room + messages)
    await db.message.deleteMany({
      where: { roomId },
    })

    await db.room.delete({
      where: { id: roomId },
    })

    await broadcastEvent(roomId, 'ROOM_DELETED', { roomId })
    return NextResponse.json({ success: true, action: 'delete' })
  } catch (error: any) {
    console.error('Delete room error:', error)
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500 }
    )
  }
}


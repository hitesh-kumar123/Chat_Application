import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'
import { broadcastEvent } from '@/lib/broadcast'
import { z } from 'zod'

const sendMessageSchema = z.object({
  roomId: z.string().min(1, 'Room ID is required'),
  content: z.string().optional().default(''),
  clientMsgId: z.string().min(1, 'Client Message ID is required'),
  replyToId: z.string().optional(),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
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

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '40', 10)

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 })
    }

    const isMember = await db.room.findFirst({
      where: {
        id: roomId,
        userIds: {
          has: user.id,
        },
      },
    })

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const messages = await db.message.findMany({
      where: {
        roomId,
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    const reversed = [...messages].reverse()
    const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null

    return NextResponse.json({
      messages: reversed,
      nextCursor,
    })
  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json(
      { error: 'Something went wrong fetching messages' },
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

    const user = await verifyJWT(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { roomId, content, clientMsgId, replyToId, fileUrl, fileName } = sendMessageSchema.parse(body)

    const isMember = await db.room.findFirst({
      where: {
        id: roomId,
        userIds: {
          has: user.id,
        },
      },
    })

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingMessage = await db.message.findUnique({
      where: { clientMsgId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (existingMessage) {
      return NextResponse.json({ message: existingMessage })
    }

    const message = await db.message.create({
      data: {
        content,
        clientMsgId,
        roomId,
        userId: user.id,
        replyToId: replyToId || undefined,
        status: 'SENT',
        fileUrl: fileUrl || undefined,
        fileName: fileName || undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    await broadcastEvent(roomId, 'NEW_MESSAGE', message)

    return NextResponse.json({ message })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: error.message || String(error) },
      { status: 500 }
    )
  }
}

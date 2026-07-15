import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyJWT } from '@/lib/auth'
import { broadcastEvent } from '@/lib/broadcast'
import { z } from 'zod'

const reactSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  emoji: z.string().min(1, 'Emoji is required'),
})

interface Reaction {
  userId: string
  userName: string
  emoji: string
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
    const { messageId, emoji } = reactSchema.parse(body)

    const message = await db.message.findUnique({
      where: { id: messageId },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    let reactions: Reaction[] = []
    if (message.reactions) {
      try {
        reactions = typeof message.reactions === 'string'
          ? JSON.parse(message.reactions)
          : (message.reactions as unknown as Reaction[])
      } catch (e) {
        reactions = []
      }
    }

    const existingIndex = reactions.findIndex(
      r => r.userId === user.id && r.emoji === emoji
    )

    if (existingIndex > -1) {
      reactions.splice(existingIndex, 1)
    } else {
      reactions.push({
        userId: user.id,
        userName: user.name,
        emoji,
      })
    }

    const updatedMessage = await db.message.update({
      where: { id: messageId },
      data: {
        reactions: reactions as any,
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

    await broadcastEvent(message.roomId, 'MESSAGE_REACTION_UPDATE', {
      messageId: updatedMessage.id,
      reactions: updatedMessage.reactions,
    })

    return NextResponse.json({ success: true, message: updatedMessage })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }
    console.error('Reaction error:', error)
    return NextResponse.json(
      { error: 'Something went wrong processing reaction' },
      { status: 500 }
    )
  }
}

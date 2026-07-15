import { useEffect, useRef, useCallback } from 'react'
import { useChatStore } from '@/store/use-chat-store'

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef<number>(0)
  
  const {
    user,
    activeRoomId,
    connectionStatus,
    offlineQueue,
    setConnectionStatus,
    addMessage,
    addReaction,
    setTypingUsers,
    clearOfflineQueue,
  } = useChatStore()

  const flushOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return

    console.log(`Syncing ${offlineQueue.length} offline messages...`)
    const items = [...offlineQueue]
    clearOfflineQueue()

    for (const item of items) {
      try {
        const res = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(item),
        })

        if (!res.ok) {
          useChatStore.getState().addToOfflineQueue(item)
        }
      } catch (err) {
        console.error('Failed to sync offline message:', err)
        useChatStore.getState().addToOfflineQueue(item)
      }
    }
  }, [offlineQueue, clearOfflineQueue])

  const connect = useCallback(() => {
    if (!user) return
    if (socketRef.current && (socketRef.current.readyState === WebSocket.CONNECTING || socketRef.current.readyState === WebSocket.OPEN)) {
      return
    }

    setConnectionStatus('CONNECTING')
    
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    const socket = new WebSocket(wsUrl)
    socketRef.current = socket

    socket.onopen = () => {
      console.log('WebSocket Connected')
      setConnectionStatus('CONNECTED')
      reconnectAttemptsRef.current = 0
      
      const activeId = useChatStore.getState().activeRoomId
      if (activeId) {
        socket.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: activeId }))
      }

      flushOfflineQueue()
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        const { type, roomId, data } = message

        switch (type) {
          case 'NEW_MESSAGE':
            addMessage(roomId, data)
            break
          case 'MESSAGE_REACTION_UPDATE':
            addReaction(roomId, data.messageId, data.reactions)
            break
          case 'ROOM_DELETED':
            useChatStore.getState().setRooms(
              useChatStore.getState().rooms.filter(r => r.id !== data.roomId)
            )
            if (useChatStore.getState().activeRoomId === data.roomId) {
              useChatStore.getState().setActiveRoomId(null)
              window.location.href = '/chat'
            }
            break
          case 'ROOM_CLEARED':
            useChatStore.getState().setMessages(roomId, [])
            break
          case 'USER_LEFT_ROOM': {
            const currentRooms = useChatStore.getState().rooms
            const targetRoom = currentRooms.find(r => r.id === roomId)
            if (targetRoom) {
              const updatedUsers = targetRoom.users.filter(u => u.id !== data.userId)
              useChatStore.getState().setRooms(
                currentRooms.map(r => r.id === roomId ? { ...r, users: updatedUsers } : r)
              )
            }
            if (data.userId === useChatStore.getState().user?.id) {
              useChatStore.getState().setRooms(
                currentRooms.filter(r => r.id !== roomId)
              )
              if (useChatStore.getState().activeRoomId === roomId) {
                useChatStore.getState().setActiveRoomId(null)
                window.location.href = '/chat'
              }
            }
            break
          }
          case 'USER_TYPING': {
            const currentTyping = useChatStore.getState().typingUsers[roomId] || []
            if (data.isTyping) {
              if (!currentTyping.some(u => u.userId === data.userId)) {
                setTypingUsers(roomId, [...currentTyping, { userId: data.userId, userName: data.userName }])
              }
            } else {
              setTypingUsers(roomId, currentTyping.filter(u => u.userId !== data.userId))
            }
            break
          }
          default:
            break
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err)
      }
    }

    socket.onclose = (event) => {
      console.log('WebSocket Disconnected:', event.reason)
      setConnectionStatus('DISCONNECTED')
      socketRef.current = null

      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
      reconnectAttemptsRef.current += 1

      console.log(`Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttemptsRef.current})`)
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }

    socket.onerror = (err) => {
      console.error('WebSocket Error:', err)
      socket.close()
    }
  }, [user, setConnectionStatus, addMessage, addReaction, setTypingUsers, flushOfflineQueue])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (socketRef.current) {
      socketRef.current.onclose = null
      socketRef.current.onerror = null
      socketRef.current.onmessage = null
      socketRef.current.onopen = null
      socketRef.current.close()
      socketRef.current = null
    }
    setConnectionStatus('DISCONNECTED')
  }, [setConnectionStatus])

  useEffect(() => {
    if (user) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user, connect, disconnect])

  useEffect(() => {
    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      if (activeRoomId) {
        ws.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: activeRoomId }))
      }
    }

    return () => {
      if (ws && ws.readyState === WebSocket.OPEN && activeRoomId) {
        ws.send(JSON.stringify({ type: 'LEAVE_ROOM', roomId: activeRoomId }))
      }
    }
  }, [activeRoomId])

  useEffect(() => {
    const handleOnline = () => {
      console.log('Browser online. Reconnecting...')
      connect()
    }

    const handleOffline = () => {
      console.log('Browser offline.')
      setConnectionStatus('DISCONNECTED')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [connect, setConnectionStatus])

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!activeRoomId || !user) return

    const clientMsgId = Math.random().toString(36).substring(2) + Date.now().toString(36)
    
    const optimisticMessage = {
      id: clientMsgId,
      content,
      clientMsgId,
      createdAt: new Date().toISOString(),
      userId: user.id,
      roomId: activeRoomId,
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      status: 'PENDING' as const,
      replyTo: useChatStore.getState().replyTo ? {
        id: useChatStore.getState().replyTo!.id,
        content: useChatStore.getState().replyTo!.content,
        user: {
          id: useChatStore.getState().replyTo!.userId,
          name: useChatStore.getState().replyTo!.user.name,
        }
      } : undefined
    }

    addMessage(activeRoomId, optimisticMessage)
    useChatStore.getState().setReplyTo(null)

    if (!navigator.onLine) {
      console.log('Offline: Queuing message for sync.')
      useChatStore.getState().addToOfflineQueue({
        roomId: activeRoomId,
        content,
        clientMsgId,
        replyToId,
      })
      return
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: activeRoomId,
          content,
          clientMsgId,
          replyToId,
        }),
      })

      if (!res.ok) {
        throw new Error('Failed to send message')
      }

      const data = await res.json()
      addMessage(activeRoomId, { ...data.message, status: 'SENT' })
    } catch (err) {
      console.error('Error sending message:', err)
      useChatStore.getState().updateMessage(activeRoomId, clientMsgId, { status: 'ERROR' })
    }
  }, [activeRoomId, user, addMessage])

  const sendTypingState = useCallback((isTyping: boolean) => {
    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN && activeRoomId) {
      ws.send(JSON.stringify({
        type: 'TYPING',
        roomId: activeRoomId,
        isTyping,
      }))
    }
  }, [activeRoomId])

  return {
    sendMessage,
    sendTypingState,
    reconnect: connect,
  }
}

export async function broadcastEvent(roomId: string, type: string, data: any) {
  try {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    let httpUrl = wsUrl.replace(/^ws(s)?:\/\//, (_, isSecure) => isSecure ? 'https://' : 'http://')
    const url = `${httpUrl.replace(/\/$/, '')}/broadcast`
    const secret = process.env.WS_BROADCAST_SECRET || 'internal-websocket-broadcast-secret-key-999'

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
      body: JSON.stringify({
        roomId,
        type,
        data,
      }),
    })
  } catch (error) {
    console.error('Failed to send broadcast event to WebSocket server:', error)
  }
}

export async function broadcastToUsers(userIds: string[], type: string, data: any) {
  try {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    let httpUrl = wsUrl.replace(/^ws(s)?:\/\//, (_, isSecure) => isSecure ? 'https://' : 'http://')
    const url = `${httpUrl.replace(/\/$/, '')}/broadcast`
    const secret = process.env.WS_BROADCAST_SECRET || 'internal-websocket-broadcast-secret-key-999'

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
      body: JSON.stringify({
        userIds,
        type,
        data,
      }),
    })
  } catch (error) {
    console.error('Failed to send user broadcast event:', error)
  }
}

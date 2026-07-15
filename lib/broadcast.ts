export async function broadcastEvent(roomId: string, type: string, data: any) {
  try {
    const wsPort = process.env.WS_PORT || '3001'
    const url = `http://localhost:${wsPort}/broadcast`
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

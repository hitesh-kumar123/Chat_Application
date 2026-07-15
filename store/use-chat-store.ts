import { create } from 'zustand'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string
  status: string
}

export interface Reaction {
  userId: string
  userName: string
  emoji: string
}

export interface Message {
  id: string
  content: string
  clientMsgId: string
  createdAt: string
  userId: string
  roomId: string
  user: {
    id: string
    name: string
    avatarUrl: string
  }
  replyTo?: {
    id: string
    content: string
    user: {
      id: string
      name: string
    }
  }
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'ERROR'
  reactions?: Reaction[]
}

export interface Room {
  id: string
  name: string
  description?: string
  isGroup: boolean
  createdAt: string
  users: User[]
}

export interface TypingUser {
  userId: string
  userName: string
}

interface ChatState {
  user: User | null
  rooms: Room[]
  activeRoomId: string | null
  messages: Record<string, Message[]> // roomId -> messages
  typingUsers: Record<string, TypingUser[]> // roomId -> typing users
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING'
  offlineQueue: { roomId: string; content: string; clientMsgId: string; replyToId?: string }[]
  replyTo: Message | null

  setUser: (user: User | null) => void
  setRooms: (rooms: Room[]) => void
  addRoom: (room: Room) => void
  setActiveRoomId: (roomId: string | null) => void
  setMessages: (roomId: string, messages: Message[]) => void
  addMessage: (roomId: string, message: Message) => void
  updateMessage: (roomId: string, clientMsgId: string, updates: Partial<Message>) => void
  addReaction: (roomId: string, messageId: string, reactions: Reaction[]) => void
  setTypingUsers: (roomId: string, users: TypingUser[]) => void
  setConnectionStatus: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void
  addToOfflineQueue: (item: { roomId: string; content: string; clientMsgId: string; replyToId?: string }) => void
  clearOfflineQueue: () => void
  setReplyTo: (message: Message | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  user: null,
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: {},
  connectionStatus: 'DISCONNECTED',
  offlineQueue: [],
  replyTo: null,

  setUser: (user) => set({ user }),
  setRooms: (rooms) => set({ rooms }),
  addRoom: (room) => set((state) => {
    if (state.rooms.some(r => r.id === room.id)) return state
    return { rooms: [room, ...state.rooms] }
  }),
  setActiveRoomId: (activeRoomId) => set({ activeRoomId, replyTo: null }),
  setMessages: (roomId, messages) => set((state) => ({
    messages: { ...state.messages, [roomId]: messages }
  })),
  addMessage: (roomId, message) => set((state) => {
    const list = state.messages[roomId] || []
    if (list.some(m => m.clientMsgId === message.clientMsgId || m.id === message.id)) {
      return {
        messages: {
          ...state.messages,
          [roomId]: list.map(m =>
            m.clientMsgId === message.clientMsgId ? { ...m, ...message } : m
          )
        }
      }
    }
    return {
      messages: { ...state.messages, [roomId]: [...list, message] }
    }
  }),
  updateMessage: (roomId, clientMsgId, updates) => set((state) => {
    const list = state.messages[roomId] || []
    return {
      messages: {
        ...state.messages,
        [roomId]: list.map(m => m.clientMsgId === clientMsgId ? { ...m, ...updates } : m)
      }
    }
  }),
  addReaction: (roomId, messageId, reactions) => set((state) => {
    const list = state.messages[roomId] || []
    return {
      messages: {
        ...state.messages,
        [roomId]: list.map(m => m.id === messageId ? { ...m, reactions } : m)
      }
    }
  }),
  setTypingUsers: (roomId, users) => set((state) => ({
    typingUsers: { ...state.typingUsers, [roomId]: users }
  })),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  addToOfflineQueue: (item) => set((state) => ({
    offlineQueue: [...state.offlineQueue, item]
  })),
  clearOfflineQueue: () => set({ offlineQueue: [] }),
  setReplyTo: (replyTo) => set({ replyTo }),
}))

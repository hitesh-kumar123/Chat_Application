'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '@/hooks/use-socket'
import { useChatStore } from '@/store/use-chat-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Send,
  Smile,
  Paperclip,
  CornerUpLeft,
  X,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react'

const EMOJI_LIST = ['👍', '❤️', '😂', '🔥', '😮', '🎉', '🚀', '😢']

export default function RoomPage() {
  const { roomId } = useParams() as { roomId: string }
  const { sendMessage, sendTypingState } = useSocket()
  
  const {
    user,
    messages,
    typingUsers,
    setMessages,
    addMessage,
    replyTo,
    setReplyTo,
    addReaction,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState<string | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const activeMessages = messages[roomId] || []
  const activeTyping = typingUsers[roomId] || []

  useEffect(() => {
    if (!roomId) return
    setIsLoadingHistory(true)
    
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/messages?roomId=${roomId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(roomId, data.messages)
        }
      } catch (err) {
        console.error('Failed to load message history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }

    fetchHistory()
  }, [roomId, setMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages.length])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)

    if (!isTyping) {
      setIsTyping(true)
      sendTypingState(true)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      sendTypingState(false)
    }, 2000)
  }

  const handleSend = () => {
    if (!input.trim()) return
    sendMessage(input, replyTo?.id)
    setInput('')
    setIsTyping(false)
    sendTypingState(false)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    setIsEmojiPickerOpen(null)
    try {
      const res = await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, emoji }),
      })

      if (res.ok) {
        const data = await res.json()
        addReaction(roomId, messageId, data.message.reactions)
      }
    } catch (err) {
      console.error('Failed to add reaction:', err)
    }
  }

  return (
    <div className="h-full flex flex-col justify-between bg-zinc-950/20">
      <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollAreaRef}>
        {isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-zinc-500 text-xs font-sans">Streaming message log...</p>
          </div>
        ) : activeMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-xl border border-white/5 bg-zinc-900/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">This is the beginning of the feed</p>
              <p className="text-xs text-zinc-500">Send a message to start conversing</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 min-h-full flex flex-col justify-end">
            {activeMessages.map((msg) => {
              const isMe = msg.userId === user?.id
              const isPending = msg.status === 'PENDING'
              const isError = msg.status === 'ERROR'
              const messageReactions = msg.reactions || []

              const groupedReactions = messageReactions.reduce((acc, curr) => {
                const existing = acc.find(r => r.emoji === curr.emoji)
                if (existing) {
                  existing.count += 1
                  existing.users.push(curr.userName)
                } else {
                  acc.push({ emoji: curr.emoji, count: 1, users: [curr.userName] })
                }
                return acc
              }, [] as { emoji: string; count: number; users: string[] }[])

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex gap-3 group relative max-w-[80%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0 border border-white/5 mt-0.5">
                    <AvatarImage src={msg.user.avatarUrl} />
                    <AvatarFallback>{msg.user.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col space-y-1">
                    <div className={`flex items-baseline gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-semibold text-zinc-300">{msg.user.name}</span>
                      <span className="text-[10px] text-zinc-600">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {msg.replyTo && (
                      <div className={`text-[11px] p-2 border-l-2 rounded bg-zinc-950/40 text-zinc-400 max-w-sm mb-1 ${
                        isMe ? 'border-indigo-500/50' : 'border-zinc-800'
                      }`}>
                        <span className="font-semibold text-zinc-300 text-xs">Replying to {msg.replyTo.user.name}:</span>
                        <p className="truncate mt-0.5">{msg.replyTo.content}</p>
                      </div>
                    )}

                    <div className="relative">
                      <div
                        className={`px-4 py-2.5 rounded-2xl text-sm relative group overflow-hidden ${
                          isMe
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-none'
                            : 'bg-zinc-900 border border-white/5 text-zinc-100 rounded-tl-none'
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        
                        {isMe && (
                          <div className="flex justify-end mt-1 text-white/50 text-[10px] gap-0.5">
                            {isPending && <Clock className="w-3 h-3 text-white/40 animate-pulse" />}
                            {isError && (
                              <span title="Failed to send">
                                <AlertCircle className="w-3 h-3 text-red-400" />
                              </span>
                            )}
                            {msg.status === 'SENT' && <Check className="w-3 h-3 text-white/60" />}
                            {(msg.status === 'DELIVERED' || msg.status === 'READ') && <CheckCheck className="w-3 h-3 text-cyan-400" />}
                          </div>
                        )}
                      </div>

                      <div className={`absolute top-0 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 flex items-center gap-1 bg-[#18181B] border border-white/5 shadow-lg rounded-full p-1 ${
                        isMe ? 'left-0 -translate-x-[110%]' : 'right-0 translate-x-[110%]'
                      }`}>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsEmojiPickerOpen(isEmojiPickerOpen === msg.id ? null : msg.id)}
                            className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
                          >
                            <Smile className="w-4 h-4" />
                          </Button>

                          {isEmojiPickerOpen === msg.id && (
                            <div className="absolute top-8 left-0 glass-panel p-1.5 rounded-xl shadow-xl flex gap-1.5 z-20">
                              {EMOJI_LIST.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msg.id, emoji)}
                                  className="text-base hover:scale-125 transition-transform duration-200 cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setReplyTo(msg)}
                          className="h-7 w-7 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                          <CornerUpLeft className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {groupedReactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1.5 ${isMe ? 'justify-end' : ''}`}>
                        {groupedReactions.map(group => (
                          <div
                            key={group.emoji}
                            onClick={() => handleReact(msg.id, group.emoji)}
                            title={group.users.join(', ')}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-all duration-200 text-zinc-300"
                          >
                            <span>{group.emoji}</span>
                            <span className="text-[10px] font-semibold">{group.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-6 border-t border-white/5 bg-zinc-950/40 backdrop-blur-md">
        <div className="h-6 mb-1 text-xs text-zinc-400">
          <AnimatePresence>
            {activeTyping.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="flex items-center gap-2"
              >
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>
                  {activeTyping.map(u => u.userName).join(', ')}{' '}
                  {activeTyping.length === 1 ? 'is' : 'are'} typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between p-2 mb-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-indigo-400 text-xs">Replying to {replyTo.user.name}</span>
                <span className="text-zinc-400 truncate max-w-md">{replyTo.content}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setReplyTo(null)}
                className="h-6 w-6 rounded-full text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3 items-end">
          <div className="flex-1 relative flex items-end">
            <Textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Type your message here..."
              rows={1}
              className="min-h-11 max-h-40 py-3 pr-20 pl-4 glass-input rounded-xl text-sm text-white resize-none border-zinc-800 placeholder-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 overflow-y-auto"
            />
            <div className="absolute right-2.5 bottom-2 flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <Smile className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              className="h-11 w-11 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 text-white flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-500/15"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { Sparkles, MessageSquare, Compass, Hash } from 'lucide-react'

export default function ChatPage() {
  return (
    <div className="h-full flex items-center justify-center p-6 relative">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center space-y-6 glass-panel p-8 rounded-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner relative group">
          <MessageSquare className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform duration-300" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-2xl border border-dashed border-indigo-500/30 p-1"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>Welcome to Aether Workspace</span>
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          </h1>
          <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Select an existing channel from the sidebar, create a new topic, or invite friends to join your private conversations.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 border border-white/5 bg-zinc-950/20 rounded-xl flex flex-col items-center gap-1">
            <Hash className="w-5 h-5 text-indigo-400 mb-1" />
            <span className="text-xs font-semibold text-white">Join Channels</span>
            <span className="text-[10px] text-zinc-500">Discuss specific topics</span>
          </div>
          <div className="p-3 border border-white/5 bg-zinc-950/20 rounded-xl flex flex-col items-center gap-1">
            <Compass className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-xs font-semibold text-white">Direct Messages</span>
            <span className="text-[10px] text-zinc-500">1-on-1 private chats</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

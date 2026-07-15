'use client'

import { motion } from 'framer-motion'

export function PremiumBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-[#09090B] pointer-events-none select-none">
      {/* Aurora Ambient Glow Gradient */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.12),rgba(139,92,246,0.06),transparent_50%)] blur-[120px]" 
      />

      {/* Floating Orb 1 (Cyan/Indigo) */}
      <motion.div
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] md:w-[35rem] md:h-[35rem] rounded-full bg-gradient-to-tr from-[#06B6D4]/12 to-[#6366F1]/8 blur-[100px]"
      />

      {/* Floating Orb 2 (Secondary Purple) */}
      <motion.div
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 50, -40, 0],
          scale: [1, 0.85, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[10%] right-[10%] w-[50vw] h-[50vw] md:w-[40rem] md:h-[40rem] rounded-full bg-gradient-to-br from-[#8B5CF6]/12 to-[#EF4444]/4 blur-[120px]"
      />

      {/* Floating Orb 3 (Accent Light) */}
      <motion.div
        animate={{
          x: [0, 30, -30, 0],
          y: [0, 30, 30, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[40%] right-[30%] w-[30vw] h-[30vw] md:w-[25rem] md:h-[25rem] rounded-full bg-indigo-600/4 blur-[90px]"
      />

      {/* Grid Overlay & Mask */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" 
      />

      {/* Subtle Noise Texture */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZHRoPSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii41Ii8+Cjwvc3ZnPg==')] bg-repeat" />
    </div>
  )
}

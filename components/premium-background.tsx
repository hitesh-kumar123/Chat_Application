'use client'

import { motion } from 'framer-motion'

export function PremiumBackground() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-[#0A0A0B] pointer-events-none select-none">

      {/* Base studio-light glow — single source, top-left, warm not purple */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(196,145,88,0.10),transparent_55%)]"
      />

      {/* Secondary cool counter-glow, bottom-right, very faint — gives depth without a second "orb" */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_85%_110%,rgba(64,82,97,0.10),transparent_50%)]"
      />

      {/* Single slow-drifting light source instead of 3 bouncing blobs */}
      <motion.div
        animate={{
          x: [0, 60, 0],
          y: [0, 30, 0],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[10%] w-[38rem] h-[38rem] rounded-full bg-[#C49158]/[0.05] blur-[140px]"
      />

      {/* Fine hairline grid — barely visible, adds texture not decoration */}
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_20%,#000_60%,transparent_100%)]"
      />

      {/* Vignette to focus attention toward center content */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,transparent_40%,rgba(0,0,0,0.35)_100%)]"
      />

      {/* Grain texture for material depth (kept, it's doing real work) */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9Ii41Ii8+Cjwvc3ZnPg==')] bg-repeat" />
    </div>
  )
}
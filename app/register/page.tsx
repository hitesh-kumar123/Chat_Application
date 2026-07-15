'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useChatStore } from '@/store/use-chat-store'
import { PremiumBackground } from '@/components/premium-background'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UserPlus, User, Mail, Lock, ShieldAlert, Sparkles } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type RegisterFormValues = z.infer<typeof registerSchema>

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/chat'
  const setUser = useChatStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true)
    setError(null)
    setShake(false)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const body = await res.json()

      if (!res.ok) {
        throw new Error(body.error || 'Registration failed')
      }

      setUser(body.user)
      router.push(redirect)
    } catch (err: any) {
      setError(err.message)
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div
      animate={shake ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
      transition={{ duration: 0.5 }}
      className="glass-panel p-8 md:p-10 rounded-2xl relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />
      
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/25 mb-4">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Create Account</h1>
        <p className="text-sm text-zinc-400">Join the real-time Premium SaaS platform</p>
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg flex items-center gap-3 mb-6 text-sm"
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-zinc-300 font-medium">Full Name</Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <User className="w-4 h-4" />
            </span>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              className="pl-10 glass-input h-11 text-white placeholder-zinc-500 border-zinc-800"
              {...register('name')}
            />
          </div>
          {errors.name && (
            <span className="text-xs text-red-400 block mt-1">{errors.name.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-zinc-300 font-medium">Email Address</Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Mail className="w-4 h-4" />
            </span>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="pl-10 glass-input h-11 text-white placeholder-zinc-500 border-zinc-800"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <span className="text-xs text-red-400 block mt-1">{errors.email.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-zinc-300 font-medium">Password</Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500">
              <Lock className="w-4 h-4" />
            </span>
            <Input
              id="password"
              type="password"
              placeholder="•••••••• (min 6 chars)"
              className="pl-10 glass-input h-11 text-white placeholder-zinc-500 border-zinc-800"
              {...register('password')}
            />
          </div>
          {errors.password && (
            <span className="text-xs text-red-400 block mt-1">{errors.password.message}</span>
          )}
        </div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="pt-2"
        >
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-lg bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white font-medium shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all duration-300"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            )}
          </Button>
        </motion.div>
      </form>

      <div className="mt-8 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
          Sign in
        </Link>
      </div>
    </motion.div>
  )
}

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <PremiumBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <Suspense fallback={
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center h-80">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mb-4" />
            <p className="text-sm text-zinc-400">Loading form...</p>
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </motion.div>
    </div>
  )
}

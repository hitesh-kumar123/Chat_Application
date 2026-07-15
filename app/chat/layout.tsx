'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useSocket } from '@/hooks/use-socket'
import { useChatStore, User } from '@/store/use-chat-store'
import { PremiumBackground } from '@/components/premium-background'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Hash,
  Search,
  LogOut,
  Plus,
  Wifi,
  WifiOff,
  Users,
  Compass,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Settings,
} from 'lucide-react'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  useSocket()

  const {
    user,
    rooms,
    activeRoomId,
    connectionStatus,
    setRooms,
    addRoom,
    setUser,
    setActiveRoomId,
  } = useChatStore()

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isNewChannelOpen, setIsNewChannelOpen] = useState(false)
  const [isNewDmOpen, setIsNewDmOpen] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelDesc, setNewChannelDesc] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Profile Edit states
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editEmail, setEditEmail] = useState(user?.email || '')
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const { setMessages } = useChatStore()

  useEffect(() => {
    if (user) {
      setEditName(user.name)
      setEditEmail(user.email)
      setEditAvatarUrl(user.avatarUrl)
    }
  }, [user])

  const handleRegenerateAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(7)
    setEditAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(randomSeed)}&backgroundColor=b6e3f4`)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)
    setProfileSuccess(false)
    setProfileError(null)

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          avatarUrl: editAvatarUrl,
        })
      })

      const data = await res.json()
      if (res.ok) {
        setUser(data.user)
        setProfileSuccess(true)
        setTimeout(() => setIsProfileSettingsOpen(false), 1500)
      } else {
        setProfileError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      console.error(err)
      setProfileError('Failed to update profile')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('WARNING: Are you sure you want to delete your account? This action is permanent and will delete all your rooms and messages.')) return

    try {
      const res = await fetch('/api/auth/me', {
        method: 'DELETE'
      })

      if (res.ok) {
        setUser(null)
        setActiveRoomId(null)
        router.push('/login')
      } else {
        const data = await res.json()
        setProfileError(data.error || 'Failed to delete account')
      }
    } catch (err) {
      console.error(err)
      setProfileError('Failed to delete account')
    }
  }

  const handleDeleteRoomAction = async (action: string) => {
    if (!activeRoomId) return
    let confirmMsg = 'Are you sure?'
    if (action === 'clear') confirmMsg = 'Are you sure you want to clear all message history? This cannot be undone.'
    if (action === 'leave') confirmMsg = 'Are you sure you want to leave this channel?'
    if (action === 'delete') confirmMsg = 'Are you sure you want to delete this conversation? This will delete all message history.'

    if (!confirm(confirmMsg)) return

    try {
      const res = await fetch(`/api/rooms?roomId=${activeRoomId}&action=${action}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        if (action === 'delete' || action === 'leave') {
          setRooms(rooms.filter(r => r.id !== activeRoomId))
          setActiveRoomId(null)
          router.push('/chat')
        } else if (action === 'clear') {
          setMessages(activeRoomId, [])
        }
      }
    } catch (err) {
      console.error('Delete room error:', err)
    }
  }

  useEffect(() => {
    if (!user) return
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms')
        if (res.ok) {
          const data = await res.json()
          setRooms(data.rooms)
        }
      } catch (err) {
        console.error('Fetch rooms error:', err)
      }
    }
    fetchRooms()
  }, [user, setRooms])

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setAllUsers(data.users)
      }
    } catch (err) {
      console.error('Fetch users error:', err)
    }
  }

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChannelName.trim()) return

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newChannelName,
          description: newChannelDesc,
          isGroup: true,
          userIds: selectedUserIds,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        addRoom(data.room)
        setIsNewChannelOpen(false)
        setNewChannelName('')
        setNewChannelDesc('')
        setSelectedUserIds([])
        setActiveRoomId(data.room.id)
        router.push(`/chat/${data.room.id}`)
      }
    } catch (err) {
      console.error('Create channel error:', err)
    }
  }

  const handleStartDm = async (targetUser: User) => {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isGroup: false,
          userIds: [targetUser.id],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        addRoom(data.room)
        setIsNewDmOpen(false)
        setActiveRoomId(data.room.id)
        router.push(`/chat/${data.room.id}`)
      }
    } catch (err) {
      console.error('Start DM error:', err)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setActiveRoomId(null)
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev =>
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    )
  }

  const channels = rooms.filter(r => r.isGroup)
  const dms = rooms.filter(r => !r.isGroup)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B] relative">
        <PremiumBackground />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Authenticating session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#09090B]">
      <PremiumBackground />

      <motion.div
        animate={{ width: isSidebarCollapsed ? '4.5rem' : '18rem' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex-shrink-0 border-r border-white/5 bg-[#111827]/30 backdrop-blur-xl flex flex-col h-full z-10 overflow-hidden"
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/5">
          {!isSidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2"
            >
              <Compass className="w-5 h-5 text-indigo-400" />
              <span>Aether</span>
            </motion.span>
          )}

          {isSidebarCollapsed && (
            <div className="mx-auto">
              <Compass className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer ml-auto"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {!isSidebarCollapsed && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs glass-input text-white border-zinc-800 placeholder-zinc-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 text-zinc-400">
              {!isSidebarCollapsed ? (
                <>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-sans">Channels</span>
                  <Dialog open={isNewChannelOpen} onOpenChange={(open) => { setIsNewChannelOpen(open); if (open) loadUsers(); }}>
                    <DialogTrigger render={
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white rounded hover:bg-white/5 cursor-pointer">
                        <Plus className="w-4 h-4" />
                      </Button>
                    } />
                    <DialogContent className="glass-panel border-white/10 text-white rounded-xl">
                      <DialogHeader>
                        <DialogTitle>Create a Channel</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateChannel} className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="cname" className="text-zinc-300">Channel Name</Label>
                          <Input
                            id="cname"
                            value={newChannelName}
                            onChange={(e) => setNewChannelName(e.target.value)}
                            placeholder="e.g. general"
                            className="glass-input text-white border-zinc-800"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cdesc" className="text-zinc-300">Description</Label>
                          <Input
                            id="cdesc"
                            value={newChannelDesc}
                            onChange={(e) => setNewChannelDesc(e.target.value)}
                            placeholder="What is this channel about?"
                            className="glass-input text-white border-zinc-800"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-zinc-300">Invite Members</Label>
                          <div className="max-h-40 overflow-y-auto space-y-2 p-2 border border-white/5 rounded bg-zinc-950/40">
                            {allUsers.length === 0 ? (
                              <p className="text-xs text-zinc-500">No other users registered</p>
                            ) : (
                              allUsers.map(u => (
                                <div key={u.id} className="flex items-center gap-3 justify-between p-1.5 hover:bg-white/5 rounded">
                                  <div className="flex items-center gap-2">
                                    <Avatar className="w-6 h-6">
                                      <AvatarImage src={u.avatarUrl} />
                                      <AvatarFallback>{u.name.substring(0, 2)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{u.name}</span>
                                  </div>
                                  <Button
                                    type="button"
                                    onClick={() => toggleSelectUser(u.id)}
                                    size="sm"
                                    variant={selectedUserIds.includes(u.id) ? "default" : "outline"}
                                    className="h-7 text-xs border-zinc-800"
                                  >
                                    {selectedUserIds.includes(u.id) ? "Selected" : "Invite"}
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                        <Button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 text-white shadow-lg cursor-pointer">
                          Create Channel
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <div className="w-full h-px bg-white/5 my-2" />
              )}
            </div>

            <div className="space-y-0.5">
              {channels
                .filter(c => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((room) => {
                  const isActive = activeRoomId === room.id
                  return (
                    <Link key={room.id} href={`/chat/${room.id}`} onClick={() => setActiveRoomId(room.id)}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border-l-[3px] border-indigo-500'
                            : 'text-zinc-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Hash className="w-4 h-4 flex-shrink-0 text-indigo-400" />
                        {!isSidebarCollapsed && <span className="truncate">{room.name}</span>}
                      </div>
                    </Link>
                  )
                })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2 text-zinc-400">
              {!isSidebarCollapsed ? (
                <>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-sans">Direct Messages</span>
                  <Dialog open={isNewDmOpen} onOpenChange={(open) => { setIsNewDmOpen(open); if (open) loadUsers(); }}>
                    <DialogTrigger render={
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white rounded hover:bg-white/5 cursor-pointer">
                        <Plus className="w-4 h-4" />
                      </Button>
                    } />
                    <DialogContent className="glass-panel border-white/10 text-white rounded-xl max-w-sm">
                      <DialogHeader>
                        <DialogTitle>New Conversation</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2 pt-4">
                        <Label className="text-zinc-300">Select a User</Label>
                        <div className="max-h-60 overflow-y-auto space-y-2 p-1 border border-white/5 rounded bg-zinc-950/40">
                          {allUsers.length === 0 ? (
                            <p className="text-xs text-zinc-500 p-2 text-center">No other users registered</p>
                          ) : (
                            allUsers.map(u => (
                              <div
                                key={u.id}
                                onClick={() => handleStartDm(u)}
                                className="flex items-center gap-3 p-2 hover:bg-indigo-500/20 rounded cursor-pointer transition-all duration-200"
                              >
                                <Avatar className="w-8 h-8">
                                  <AvatarImage src={u.avatarUrl} />
                                  <AvatarFallback>{u.name.substring(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate text-white">{u.name}</p>
                                  <p className="text-xs text-zinc-500 truncate">{u.email}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <div className="w-full h-px bg-white/5 my-2" />
              )}
            </div>

            <div className="space-y-0.5">
              {dms.map((room) => {
                const isActive = activeRoomId === room.id
                const otherParticipant = room.users.find(u => u.id !== user.id)
                const name = otherParticipant ? otherParticipant.name : 'Direct Chat'
                const avatar = otherParticipant ? otherParticipant.avatarUrl : ''
                const isOnline = otherParticipant ? otherParticipant.status === 'ONLINE' : false

                return (
                  <Link key={room.id} href={`/chat/${room.id}`} onClick={() => setActiveRoomId(room.id)}>
                    <div
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white border-l-[3px] border-indigo-500'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={avatar} />
                          <AvatarFallback>{name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-[#10B981] border border-[#09090B] rounded-full" />
                        )}
                      </div>
                      {!isSidebarCollapsed && <span className="truncate text-zinc-400 hover:text-white">{name}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-white/5 bg-zinc-950/40">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>{user.name.substring(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#10B981] border-2 border-[#09090B] rounded-full animate-pulse" />
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate text-white">{user.name}</span>
                  <span className="text-xs text-zinc-500 truncate">{user.email}</span>
                </div>
              )}
            </div>

            {!isSidebarCollapsed && (
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Dialog open={isProfileSettingsOpen} onOpenChange={setIsProfileSettingsOpen}>
                  <DialogTrigger render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
                      title="Profile Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  } />
                  <DialogContent className="glass-panel border-white/10 text-white rounded-xl max-w-md">
                    <DialogHeader>
                      <DialogTitle>Profile Settings</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateProfile} className="space-y-4 pt-2">
                      {profileError && (
                        <div className="text-xs text-red-400 bg-red-500/10 p-2 border border-red-500/20 rounded">
                          {profileError}
                        </div>
                      )}
                      {profileSuccess && (
                        <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2 border border-emerald-500/20 rounded">
                          Profile updated successfully!
                        </div>
                      )}
                      
                      <div className="flex flex-col items-center gap-3">
                        <Avatar className="w-16 h-16 border border-white/10">
                          <AvatarImage src={editAvatarUrl} />
                          <AvatarFallback>{editName.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <Button
                          type="button"
                          onClick={handleRegenerateAvatar}
                          variant="outline"
                          size="sm"
                          className="h-8 border-zinc-800 text-xs"
                        >
                          Generate New Avatar
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pname" className="text-zinc-300 font-sans">Name</Label>
                        <Input
                          id="pname"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="glass-input text-white border-zinc-800"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="pemail" className="text-zinc-300 font-sans">Email Address</Label>
                        <Input
                          id="pemail"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="glass-input text-white border-zinc-800"
                          required
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="submit"
                          disabled={isUpdatingProfile}
                          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 text-white cursor-pointer"
                        >
                          {isUpdatingProfile ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleDeleteAccount}
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                        >
                          Delete Account
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-zinc-500 hover:text-red-400 rounded-lg hover:bg-white/5 cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#111827]/10 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            {activeRoomId && rooms.find(r => r.id === activeRoomId) ? (
              <>
                <div className="flex items-center gap-2">
                  {rooms.find(r => r.id === activeRoomId)!.isGroup ? (
                    <Hash className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={rooms.find(r => r.id === activeRoomId)!.users.find(u => u.id !== user.id)?.avatarUrl || ''} />
                      <AvatarFallback>DM</AvatarFallback>
                    </Avatar>
                  )}
                  <h2 className="text-base font-semibold text-white">
                    {rooms.find(r => r.id === activeRoomId)!.isGroup
                      ? rooms.find(r => r.id === activeRoomId)!.name
                      : rooms.find(r => r.id === activeRoomId)!.users.find(u => u.id !== user.id)?.name || 'Direct Chat'}
                  </h2>
                </div>
                {rooms.find(r => r.id === activeRoomId)!.isGroup && (
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{rooms.find(r => r.id === activeRoomId)!.users.length} members</span>
                  </div>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-white/5 rounded-lg cursor-pointer flex-shrink-0"
                      title="Delete Options"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end" className="glass-panel border-white/10 text-zinc-300 rounded-xl w-48 z-50">
                    <DropdownMenuItem
                      onClick={() => handleDeleteRoomAction('clear')}
                      className="hover:bg-white/5 hover:text-white cursor-pointer px-3 py-2 text-xs"
                    >
                      Clear Message Log
                    </DropdownMenuItem>
                    {rooms.find(r => r.id === activeRoomId)!.isGroup && (
                      <DropdownMenuItem
                        onClick={() => handleDeleteRoomAction('leave')}
                        className="hover:bg-white/5 hover:text-white cursor-pointer px-3 py-2 text-xs text-amber-400 focus:text-amber-400"
                      >
                        Leave Channel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleDeleteRoomAction('delete')}
                      className="hover:bg-red-500/10 hover:text-red-400 cursor-pointer px-3 py-2 text-xs text-red-400 focus:text-red-400"
                      variant="destructive"
                    >
                      Delete Entire Conversation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <span className="text-zinc-400 text-sm font-medium">No selected chat</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              connectionStatus === 'CONNECTED'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : connectionStatus === 'CONNECTING'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {connectionStatus === 'CONNECTED' ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Live</span>
                </>
              ) : connectionStatus === 'CONNECTING' ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
      </div>
    </div>
  )
}

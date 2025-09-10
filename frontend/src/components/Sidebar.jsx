import React, { useEffect, useState } from 'react'
import { useChatStore } from '../store/useChatStore'
import SidebarSkeleton from "./skeletons/SidebarSkeleton"
import { Users } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { Menu } from 'lucide-react'

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading } = useChatStore()
  const { onlineUsers } = useAuthStore()
  const [showOnlineOnly, setShowOnlineOnly] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    getUsers()
  }, [getUsers])

  const filteredUsers = showOnlineOnly ? users.filter(user => onlineUsers.includes(user._id)) : users

  if (isUsersLoading) return <SidebarSkeleton />

  return (
    <>
      {/* Toggle button for small screens */}
      <div className="lg:hidden p-2">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="btn btn-ghost btn-sm"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-20 bg-base-100 border-r border-base-300 flex flex-col transition-all duration-300
          ${isSidebarOpen ? 'w-64' : 'w-20'}
          lg:static lg:w-72
        `}
      >
        {/* Header */}
        <div className="border-b border-base-300 w-full p-5 flex items-center gap-2">
          <Users className="size-6" />
          <span className={`font-medium transition-all duration-300 ${isSidebarOpen || window.innerWidth >= 1024 ? 'block' : 'hidden'} lg:block`}>
            Contacts
          </span>
        </div>

        {/* Checkbox: Show online only */}
        <div className={`mt-3 px-5 flex items-center gap-2`}>
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            {/* Responsive text label */}
            <span className="text-sm block lg:hidden">Online only</span>
            <span className="text-sm hidden lg:block">Show online only</span>
          </label>
          <span className="text-xs text-zinc-500 hidden lg:block">({onlineUsers.length - 1} online)</span>
          <span className="text-xs text-zinc-500 block lg:hidden">({onlineUsers.length - 1})</span>
        </div>

        {/* Users list */}
        <div className="overflow-y-auto w-full py-3 flex-1">
          {filteredUsers.map((user) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`w-full p-3 flex items-center gap-3 hover:bg-base-300 transition-colors
                ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-base-300" : ""}`}
            >
              {/* Profile image */}
              <div className="relative mx-auto lg:mx-0">
                <img
                  src={user.profilepic || "/avatar.png"}
                  alt={user.name}
                  className="size-12 object-cover rounded-full"
                />
                {onlineUsers.includes(user._id) && (
                  <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-zinc-900" />
                )}
              </div>

              {/* Name + Status */}
              <div className={`min-w-0 text-left hidden lg:block ${isSidebarOpen ? 'block' : 'hidden'}`}>
                <div className="font-medium truncate">{user.fullname}</div>
                <div className="text-sm text-zinc-400">
                  {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                </div>
              </div>
            </button>
          ))}

          {filteredUsers.length === 0 && (
            <div className="text-center text-zinc-500 py-4">No Online Users</div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar

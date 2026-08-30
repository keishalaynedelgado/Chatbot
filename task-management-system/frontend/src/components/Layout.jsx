import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  KanbanSquare,
  Users,
  MessageSquare,
  BarChart3,
  LogOut,
  CheckSquare,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

const Layout = () => {
  const { user, logout } = useAuth()

  const navigation = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: BarChart3,
    },
    {
      name: 'Tasks',
      path: '/tasks',
      icon: ClipboardList,
    },
    {
      name: 'Task Board',
      path: '/tasks/board',
      icon: KanbanSquare,
    },
    {
      name: 'Users',
      path: '/users',
      icon: Users,
    },
    {
      name: 'AI Chat',
      path: '/chat',
      icon: MessageSquare,
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">

        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-card md:flex">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <CheckSquare className="h-5 w-5 text-primary-foreground" />
            </div>

            <div>
              <h2 className="text-sm font-semibold">
                Task Manager
              </h2>
              <p className="text-xs text-muted-foreground">
                Management System
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Main Menu
            </p>

            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>

          {/* User */}
          <div className="border-t p-4">
            <div className="mb-3 rounded-lg bg-muted p-3">
              <p className="truncate text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {user?.role}
              </p>
            </div>

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main area */}
        <div className="flex min-w-0 flex-1 flex-col">

          {/* Top Header */}
          <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            <div>
              <p className="text-sm font-medium">
                Task Management System
              </p>

              <p className="text-xs text-muted-foreground">
                Manage your team and tasks
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>

                <p className="text-xs capitalize text-muted-foreground">
                  {user?.role}
                </p>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {user?.firstName?.charAt(0)}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout
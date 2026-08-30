import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TenantManagement from './pages/TenantManagement'
import UserManagement from './pages/UserManagement'
import TaskManagement from './pages/TaskManagement'
import TaskBoard from './pages/TaskBoard'
import AIChat from './pages/AIChat'
import Reports from './pages/Reports'
import Layout from './components/Layout'

// Protected Route component
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-lg">Loading...</div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="tenants" element={
            <ProtectedRoute roles={['super_admin']}>
              <TenantManagement />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="tasks" element={
            <ProtectedRoute roles={['super_admin', 'admin']}>
              <TaskManagement />
            </ProtectedRoute>
          } />
          <Route path="tasks/board" element={
            <ProtectedRoute roles={['super_admin', 'admin', 'staff']}>
              <TaskBoard />
            </ProtectedRoute>
          } />
          <Route path="chat" element={
            <ProtectedRoute>
              <AIChat />
            </ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
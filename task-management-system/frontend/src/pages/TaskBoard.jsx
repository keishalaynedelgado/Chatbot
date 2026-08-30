import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { taskService } from '../services/taskService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '../hooks/useAuth'

const TaskBoard = () => {
  const { user } = useAuth()
  const isStaff = user?.role === 'staff'

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => isStaff ? taskService.getMyTasks() : taskService.getAll()
  })

  const tasks = data?.data || []

  const columns = {
    pending: tasks.filter(task => task.status === 'pending'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    completed: tasks.filter(task => task.status === 'completed'),
    cancelled: tasks.filter(task => task.status === 'cancelled')
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }
    return colors[status]
  }

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority]
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Board</h1>
        <p className="text-gray-500 mt-1">
          {isStaff ? 'View your assigned tasks' : 'View all tasks in your organization'}
        </p>
      </div>

      {isLoading ? (
        <p>Loading tasks...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(columns).map(([status, statusTasks]) => (
            <div key={status}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex justify-between items-center">
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <Badge variant="outline">{statusTasks.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 min-h-[200px]">
                    {statusTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border ${getStatusColor(task.status)}`}
                      >
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {task.description && (
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          {task.assignee && (
                            <Badge variant="outline" className="text-xs">
                              {task.assignee.firstName} {task.assignee.lastName}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                    {statusTasks.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No tasks in this column
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TaskBoard
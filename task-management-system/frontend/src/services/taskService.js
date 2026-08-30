import api from './api'

export const taskService = {
  getAll: async (params = {}) => {
    return api.get('/tasks', { params })
  },

  getMyTasks: async (params = {}) => {
    return api.get('/tasks/my-tasks', { params })
  },

  getById: async (id) => {
    return api.get(`/tasks/${id}`)
  },

  create: async (data) => {
    return api.post('/tasks', data)
  },

  update: async (id, data) => {
    return api.put(`/tasks/${id}`, data)
  },

  delete: async (id) => {
    return api.delete(`/tasks/${id}`)
  }
}
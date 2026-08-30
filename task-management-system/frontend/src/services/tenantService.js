import api from './api'

export const tenantService = {
  getAll: async (params = {}) => {
    return api.get('/tenants', { params })
  },

  getById: async (id) => {
    return api.get(`/tenants/${id}`)
  },

  create: async (data) => {
    return api.post('/tenants', data)
  },

  update: async (id, data) => {
    return api.put(`/tenants/${id}`, data)
  },

  delete: async (id) => {
    return api.delete(`/tenants/${id}`)
  }
}
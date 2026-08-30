import api from './api'

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))
    }
    return response.data
  },

  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getCurrentUser: async () => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      return JSON.parse(storedUser)
    }
    const response = await api.get('/users/me')
    return response.data
  }
}
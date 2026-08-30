import apiClient from './api';

export const reportService = {
  /**
   * Fetch scoped database analytics for given period or custom date range
   */
  getAnalytics: async ({ period = 'this_month', startDate, endDate } = {}) => {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    return apiClient.get(`/reports/analytics?${params.toString()}`);
  },

  /**
   * Generate AI Report with LLM and live PostgreSQL grounding
   */
  generateAIReport: async ({ period = 'this_month', startDate, endDate, model, provider, apiKey } = {}) => {
    return apiClient.post('/reports/generate-ai-report', {
      period,
      startDate,
      endDate,
      model,
      provider,
      apiKey
    });
  }
};

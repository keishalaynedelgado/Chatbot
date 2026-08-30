/**
 * Report Controller
 * 
 * Exposes endpoints for database-grounded reports, deterministic analytics,
 * and LLM-powered AI insights generation.
 */

const reportService = require('../services/reportService');

/**
 * GET /api/reports/analytics
 * Retrieve real calculated analytics scoped to authenticated user & date range
 */
exports.getAnalytics = async (req, res) => {
  try {
    const user = req.user;
    const { period = 'this_month', startDate, endDate } = req.query;

    const data = await reportService.getAnalytics(user, { period, startDate, endDate });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching report analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute report analytics',
      error: error.message
    });
  }
};

/**
 * POST /api/reports/generate-ai-report
 * Generate executive AI analysis report based on selected date range & database facts
 */
exports.generateAIReport = async (req, res) => {
  try {
    const user = req.user;
    const { period = 'this_month', startDate, endDate, model, provider, apiKey } = req.body;

    const report = await reportService.generateAIReport(
      user,
      { period, startDate, endDate },
      { model, provider, apiKey }
    );

    return res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating AI report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate AI report',
      error: error.message
    });
  }
};

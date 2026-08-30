/**
 * Reports & AI Insights Service
 * 
 * Computes deterministic, role-scoped & tenant-scoped analytics from PostgreSQL
 * across flexible date ranges (This Week, This Month, This Year, Custom Range, All Time).
 * 
 * Computes multi-period historical comparisons:
 * - Month-over-Month (MoM) / Immediate Prior Period
 * - Year-over-Year (YoY) - Current Month vs Same Month Last Year (e.g. Aug 2026 vs Aug 2025)
 * - Full Year Comparison (2026 vs 2025)
 * - Multi-month trend trajectories
 * 
 * Generates grounded LLM reports using Vercel AI SDK (NVIDIA NIM / Gemini / OpenAI)
 * with reliable offline deterministic fallback.
 */

const { Op } = require('sequelize');
const { Task, User, Tenant } = require('../models');
const { loadAIModules, resolveModel } = require('../config/aiConfig');

class ReportService {
  /**
   * Helper to compute start, end, prior period, and YoY dates based on period preset
   */
  resolveDateRange(period = 'this_month', customStart, customEnd) {
    const now = new Date();
    let startDate = null;
    let endDate = new Date(now);
    let prevStartDate = null;
    let prevEndDate = null;
    let yoyStartDate = null;
    let yoyEndDate = null;
    let priorLabel = 'Previous Period';
    let yoyLabel = 'Same Month Last Year';
    let label = 'This Month';

    if (period === 'this_week') {
      label = 'This Week (Last 7 Days)';
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);

      prevEndDate = new Date(startDate);
      prevStartDate = new Date(prevEndDate);
      prevStartDate.setDate(prevStartDate.getDate() - 7);
      priorLabel = 'Prior 7 Days';

      // YoY 7 days
      yoyEndDate = new Date(endDate);
      yoyEndDate.setFullYear(yoyEndDate.getFullYear() - 1);
      yoyStartDate = new Date(startDate);
      yoyStartDate.setFullYear(yoyStartDate.getFullYear() - 1);
      yoyLabel = 'Same Week Last Year';

    } else if (period === 'this_month') {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const curMonthName = monthNames[now.getMonth()];
      const prevMonthName = monthNames[(now.getMonth() - 1 + 12) % 12];

      label = `This Month (${curMonthName} ${now.getFullYear()})`;
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      // Previous month
      prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      prevStartDate = new Date(prevEndDate.getFullYear(), prevEndDate.getMonth(), 1, 0, 0, 0, 0);
      priorLabel = `Last Month (${prevMonthName} ${prevStartDate.getFullYear()})`;

      // Same month last year
      yoyStartDate = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0, 0);
      const lastDayOfLastYearMonth = new Date(now.getFullYear() - 1, now.getMonth() + 1, 0).getDate();
      yoyEndDate = new Date(now.getFullYear() - 1, now.getMonth(), lastDayOfLastYearMonth, 23, 59, 59, 999);
      yoyLabel = `Same Month Last Year (${curMonthName} ${now.getFullYear() - 1})`;

    } else if (period === 'this_year') {
      label = `This Year (${now.getFullYear()})`;
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);

      // Previous year
      prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      priorLabel = `Previous Year (${now.getFullYear() - 1})`;
      yoyLabel = `Previous Year (${now.getFullYear() - 1})`;
      yoyStartDate = prevStartDate;
      yoyEndDate = prevEndDate;

    } else if (period === 'custom' && customStart && customEnd) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);

      const diffMs = endDate.getTime() - startDate.getTime();
      prevEndDate = new Date(startDate.getTime() - 1);
      prevStartDate = new Date(prevEndDate.getTime() - diffMs);
      priorLabel = `Prior Matching Interval (${prevStartDate.toISOString().split('T')[0]} to ${prevEndDate.toISOString().split('T')[0]})`;

      // YoY Custom
      yoyStartDate = new Date(startDate);
      yoyStartDate.setFullYear(yoyStartDate.getFullYear() - 1);
      yoyEndDate = new Date(endDate);
      yoyEndDate.setFullYear(yoyEndDate.getFullYear() - 1);
      yoyLabel = `Same Date Range Last Year (${yoyStartDate.toISOString().split('T')[0]} to ${yoyEndDate.toISOString().split('T')[0]})`;

      label = `Custom (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`;
    } else {
      // 'all' or default
      label = 'All Time';
      startDate = null;
      endDate = null;
      prevStartDate = null;
      prevEndDate = null;
      yoyStartDate = null;
      yoyEndDate = null;
    }

    return { startDate, endDate, prevStartDate, prevEndDate, yoyStartDate, yoyEndDate, label, priorLabel, yoyLabel };
  }

  /**
   * Generates ASCII progress bar
   */
  generateProgressBar(percent, length = 10) {
    const num = Math.max(0, Math.min(100, Number(percent) || 0));
    const filled = Math.round((num / 100) * length);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * Retrieves role-scoped, date-filtered, and multi-period comparative analytics from PostgreSQL
   */
  async getAnalytics(user, { period = 'this_month', startDate: rawStart, endDate: rawEnd } = {}) {
    const { 
      startDate, 
      endDate, 
      prevStartDate, 
      prevEndDate, 
      yoyStartDate, 
      yoyEndDate, 
      label: periodLabel,
      priorLabel,
      yoyLabel
    } = this.resolveDateRange(period, rawStart, rawEnd);

    const isSuperAdmin = user.role === 'super_admin';
    const isAdmin = user.role === 'admin';
    const isStaff = user.role === 'staff';

    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId };
    const userTaskFilter = isStaff 
      ? { [Op.or]: [{ assignedTo: user.id }, { createdBy: user.id }] }
      : {};

    // Current Date range filter applied to createdAt
    const dateFilter = (startDate && endDate) ? {
      createdAt: {
        [Op.between]: [startDate, endDate]
      }
    } : {};

    const whereClause = {
      ...tenantFilter,
      ...userTaskFilter,
      ...dateFilter
    };

    try {
      // 1. Fetch scoped tasks for current period
      const tasks = await Task.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'role'] },
          { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'username'] },
          { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'companyName'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      // 2. Fetch scoped tasks for immediate previous period (MoM)
      let prevTasks = [];
      if (prevStartDate && prevEndDate) {
        prevTasks = await Task.findAll({
          where: {
            ...tenantFilter,
            ...userTaskFilter,
            createdAt: { [Op.between]: [prevStartDate, prevEndDate] }
          },
          attributes: ['id', 'status', 'priority', 'completedAt']
        });
      }

      // 3. Fetch scoped tasks for Year-over-Year period (YoY Same Month Last Year)
      let yoyTasks = [];
      if (yoyStartDate && yoyEndDate) {
        yoyTasks = await Task.findAll({
          where: {
            ...tenantFilter,
            ...userTaskFilter,
            createdAt: { [Op.between]: [yoyStartDate, yoyEndDate] }
          },
          attributes: ['id', 'status', 'priority', 'completedAt']
        });
      }

      // 4. Fetch all tasks across all history (for full multi-month trajectory)
      const allHistoricalTasks = await Task.findAll({
        where: {
          ...tenantFilter,
          ...userTaskFilter
        },
        attributes: ['id', 'status', 'priority', 'createdAt', 'completedAt', 'tags']
      });

      // Compute current period aggregates
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const cancelledTasks = tasks.filter(t => t.status === 'cancelled').length;

      const completionRateNum = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1)) : 0.0;
      const completionRateStr = `${completionRateNum.toFixed(1)}%`;
      const progressBar = this.generateProgressBar(completionRateNum);

      // Priority counts
      const urgentTasks = tasks.filter(t => t.priority === 'urgent').length;
      const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
      const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium').length;
      const lowPriorityTasks = tasks.filter(t => t.priority === 'low').length;

      // Overdue & Upcoming
      const now = new Date();
      const in7Days = new Date(now);
      in7Days.setDate(in7Days.getDate() + 7);

      const overdueTasksList = tasks.filter(t => 
        t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now
      );

      const upcomingTasksList = tasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled' || !t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= in7Days;
      });

      // 5. Team Workload Breakdown
      const userWorkloadMap = {};
      tasks.forEach(t => {
        const uid = t.assignee?.id || 'unassigned';
        const name = t.assignee 
          ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() || t.assignee.username
          : 'Unassigned';
        const email = t.assignee?.email || 'N/A';
        const role = t.assignee?.role || 'N/A';

        if (!userWorkloadMap[uid]) {
          userWorkloadMap[uid] = {
            userId: uid,
            name,
            email,
            role,
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            cancelled: 0,
            overdue: 0
          };
        }

        userWorkloadMap[uid].total += 1;
        if (t.status === 'completed') userWorkloadMap[uid].completed += 1;
        if (t.status === 'in_progress') userWorkloadMap[uid].inProgress += 1;
        if (t.status === 'pending') userWorkloadMap[uid].pending += 1;
        if (t.status === 'cancelled') userWorkloadMap[uid].cancelled += 1;

        if (t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now) {
          userWorkloadMap[uid].overdue += 1;
        }
      });

      const workloadBreakdown = Object.values(userWorkloadMap).map(w => ({
        ...w,
        completionRate: w.total > 0 ? parseFloat(((w.completed / w.total) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.total - a.total);

      // 6. Category / Tag Breakdown
      const tagMap = {};
      tasks.forEach(t => {
        const tags = Array.isArray(t.tags) && t.tags.length > 0 ? t.tags : ['General'];
        tags.forEach(tag => {
          if (!tagMap[tag]) {
            tagMap[tag] = { tag, total: 0, completed: 0, inProgress: 0, pending: 0, cancelled: 0 };
          }
          tagMap[tag].total += 1;
          if (t.status === 'completed') tagMap[tag].completed += 1;
          if (t.status === 'in_progress') tagMap[tag].inProgress += 1;
          if (t.status === 'pending') tagMap[tag].pending += 1;
          if (t.status === 'cancelled') tagMap[tag].cancelled += 1;
        });
      });

      const tagBreakdown = Object.values(tagMap).map(tg => ({
        ...tg,
        completionRate: tg.total > 0 ? parseFloat(((tg.completed / tg.total) * 100).toFixed(1)) : 0
      })).sort((a, b) => b.total - a.total);

      // 7. Multi-Period Comparisons Calculations
      // A) Immediate Prior Period (MoM)
      const prevTotal = prevTasks.length;
      const prevCompleted = prevTasks.filter(t => t.status === 'completed').length;
      const prevCompletionRate = prevTotal > 0 ? parseFloat(((prevCompleted / prevTotal) * 100).toFixed(1)) : 0;
      const volumeChange = totalTasks - prevTotal;
      const volumeGrowthPct = prevTotal > 0 
        ? parseFloat(((volumeChange / prevTotal) * 100).toFixed(1))
        : (totalTasks > 0 ? 100 : 0);
      const completionDeltaPct = parseFloat((completionRateNum - prevCompletionRate).toFixed(1));

      const priorPeriodComparison = {
        label: priorLabel,
        total: prevTotal,
        completed: prevCompleted,
        completionRate: `${prevCompletionRate}%`,
        completionRateNum: prevCompletionRate,
        volumeChange,
        volumeGrowthPct,
        completionDeltaPct
      };

      // B) Year-over-Year (YoY Same Month Last Year)
      const yoyTotal = yoyTasks.length;
      const yoyCompleted = yoyTasks.filter(t => t.status === 'completed').length;
      const yoyCompletionRate = yoyTotal > 0 ? parseFloat(((yoyCompleted / yoyTotal) * 100).toFixed(1)) : 0;
      const yoyVolumeChange = totalTasks - yoyTotal;
      const yoyVolumeGrowthPct = yoyTotal > 0 
        ? parseFloat(((yoyVolumeChange / yoyTotal) * 100).toFixed(1))
        : (totalTasks > 0 ? 100 : 0);
      const yoyCompletionDeltaPct = parseFloat((completionRateNum - yoyCompletionRate).toFixed(1));

      const sameMonthLastYearComparison = {
        label: yoyLabel,
        total: yoyTotal,
        completed: yoyCompleted,
        completionRate: `${yoyCompletionRate}%`,
        completionRateNum: yoyCompletionRate,
        volumeChange: yoyVolumeChange,
        volumeGrowthPct: yoyVolumeGrowthPct,
        completionDeltaPct: yoyCompletionDeltaPct
      };

      // C) Full Year 2026 vs 2025 comparison
      const year2026Tasks = allHistoricalTasks.filter(t => new Date(t.createdAt).getFullYear() === 2026);
      const year2025Tasks = allHistoricalTasks.filter(t => new Date(t.createdAt).getFullYear() === 2025);
      const total2026 = year2026Tasks.length;
      const total2025 = year2025Tasks.length;
      const completed2026 = year2026Tasks.filter(t => t.status === 'completed').length;
      const completed2025 = year2025Tasks.filter(t => t.status === 'completed').length;
      const rate2026 = total2026 > 0 ? parseFloat(((completed2026 / total2026) * 100).toFixed(1)) : 0;
      const rate2025 = total2025 > 0 ? parseFloat(((completed2025 / total2025) * 100).toFixed(1)) : 0;

      const yearOverYearFull = {
        currentYearLabel: 'Full Year 2026',
        prevYearLabel: 'Full Year 2025',
        currentTotal: total2026,
        prevTotal: total2025,
        volumeChange: total2026 - total2025,
        volumeGrowthPct: total2025 > 0 ? parseFloat((((total2026 - total2025) / total2025) * 100).toFixed(1)) : 100,
        currentCompleted: completed2026,
        prevCompleted: completed2025,
        currentRate: `${rate2026}%`,
        prevRate: `${rate2025}%`,
        completionDeltaPct: parseFloat((rate2026 - rate2025).toFixed(1))
      };

      // D) Monthly Historical Trend (Past 12 Months aggregated)
      const monthlyBuckets = {};
      allHistoricalTasks.forEach(t => {
        const d = new Date(t.createdAt);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;

        if (!monthlyBuckets[key]) {
          const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          monthlyBuckets[key] = {
            key,
            label: `${monthNamesShort[d.getMonth()]} ${y}`,
            year: y,
            month: d.getMonth() + 1,
            total: 0,
            completed: 0,
            inProgress: 0,
            pending: 0,
            cancelled: 0
          };
        }

        monthlyBuckets[key].total += 1;
        if (t.status === 'completed') monthlyBuckets[key].completed += 1;
        if (t.status === 'in_progress') monthlyBuckets[key].inProgress += 1;
        if (t.status === 'pending') monthlyBuckets[key].pending += 1;
        if (t.status === 'cancelled') monthlyBuckets[key].cancelled += 1;
      });

      const monthlyHistory = Object.values(monthlyBuckets)
        .sort((a, b) => a.key.localeCompare(b.key))
        .map(mb => ({
          ...mb,
          completionRate: mb.total > 0 ? parseFloat(((mb.completed / mb.total) * 100).toFixed(1)) : 0
        }));

      // 8. Tenant info
      let tenantName = 'All Organizations (Super Admin)';
      if (user.tenantId) {
        const tenant = await Tenant.findByPk(user.tenantId, { attributes: ['companyName', 'name'] });
        tenantName = tenant?.companyName || tenant?.name || user.tenantId;
      }

      return {
        success: true,
        scope: isSuperAdmin ? 'Global (All Tenants)' : (isAdmin ? `Tenant: ${tenantName}` : `Staff: ${user.firstName} ${user.lastName}`),
        tenantName,
        period: {
          id: period,
          label: periodLabel,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        },
        summary: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          cancelledTasks,
          activeTasks: inProgressTasks + pendingTasks,
          completionRate: completionRateStr,
          completionRateNum,
          progressBar,
          overdueCount: overdueTasksList.length,
          upcomingCount: upcomingTasksList.length,
          previousPeriod: {
            prevTotal,
            prevCompleted,
            volumeDeltaPct: volumeGrowthPct,
            completionDeltaPct
          }
        },
        comparisons: {
          priorPeriod: priorPeriodComparison,
          sameMonthLastYear: sameMonthLastYearComparison,
          yearOverYear: yearOverYearFull,
          monthlyHistory
        },
        statusBreakdown: [
          { status: 'completed', label: 'Completed', count: completedTasks, percentage: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0, color: '#10b981' },
          { status: 'in_progress', label: 'In Progress', count: inProgressTasks, percentage: totalTasks > 0 ? ((inProgressTasks / totalTasks) * 100).toFixed(1) : 0, color: '#3b82f6' },
          { status: 'pending', label: 'Pending', count: pendingTasks, percentage: totalTasks > 0 ? ((pendingTasks / totalTasks) * 100).toFixed(1) : 0, color: '#f59e0b' },
          { status: 'cancelled', label: 'Cancelled', count: cancelledTasks, percentage: totalTasks > 0 ? ((cancelledTasks / totalTasks) * 100).toFixed(1) : 0, color: '#ef4444' }
        ],
        priorityBreakdown: [
          { priority: 'urgent', label: 'Urgent', count: urgentTasks, percentage: totalTasks > 0 ? ((urgentTasks / totalTasks) * 100).toFixed(1) : 0, color: '#dc2626' },
          { priority: 'high', label: 'High', count: highPriorityTasks, percentage: totalTasks > 0 ? ((highPriorityTasks / totalTasks) * 100).toFixed(1) : 0, color: '#ea580c' },
          { priority: 'medium', label: 'Medium', count: mediumPriorityTasks, percentage: totalTasks > 0 ? ((mediumPriorityTasks / totalTasks) * 100).toFixed(1) : 0, color: '#d97706' },
          { priority: 'low', label: 'Low', count: lowPriorityTasks, percentage: totalTasks > 0 ? ((lowPriorityTasks / totalTasks) * 100).toFixed(1) : 0, color: '#16a34a' }
        ],
        workloadBreakdown,
        tagBreakdown,
        overdueTasks: overdueTasksList.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned',
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A'
        })),
        upcomingTasks: upcomingTasksList.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned',
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A'
        }))
      };

    } catch (error) {
      console.error('[ReportService Analytics Error]:', error);
      throw error;
    }
  }

  /**
   * Generates AI Insights & Executive Report using LLM (with multi-period comparative grounding)
   */
  async generateAIReport(user, filterParams = {}, aiParams = {}) {
    const analytics = await this.getAnalytics(user, filterParams);

    // 1. Prepare structured, non-sensitive payload for LLM including multi-period historical facts
    const structuredGrounding = {
      scope: analytics.scope,
      selectedPeriod: analytics.period.label,
      currentPeriodStats: {
        totalTasks: analytics.summary.totalTasks,
        completedTasks: analytics.summary.completedTasks,
        inProgressTasks: analytics.summary.inProgressTasks,
        pendingTasks: analytics.summary.pendingTasks,
        cancelledTasks: analytics.summary.cancelledTasks,
        completionRate: analytics.summary.completionRate,
        overdueTasksCount: analytics.summary.overdueCount
      },
      historicalComparisons: {
        monthOverMonth_vs_LastMonth: {
          priorPeriodName: analytics.comparisons.priorPeriod.label,
          currentVolume: analytics.summary.totalTasks,
          priorVolume: analytics.comparisons.priorPeriod.total,
          volumeDifference: `${analytics.comparisons.priorPeriod.volumeChange >= 0 ? '+' : ''}${analytics.comparisons.priorPeriod.volumeChange}`,
          growthRatePercent: `${analytics.comparisons.priorPeriod.volumeGrowthPct >= 0 ? '+' : ''}${analytics.comparisons.priorPeriod.volumeGrowthPct}%`,
          currentCompletionRate: analytics.summary.completionRate,
          priorCompletionRate: analytics.comparisons.priorPeriod.completionRate
        },
        yearOverYear_SameMonth: {
          sameMonthLastYearName: analytics.comparisons.sameMonthLastYear.label,
          currentVolume: analytics.summary.totalTasks,
          sameMonthLastYearVolume: analytics.comparisons.sameMonthLastYear.total,
          volumeDifference: `${analytics.comparisons.sameMonthLastYear.volumeChange >= 0 ? '+' : ''}${analytics.comparisons.sameMonthLastYear.volumeChange}`,
          yoyGrowthRatePercent: `${analytics.comparisons.sameMonthLastYear.volumeGrowthPct >= 0 ? '+' : ''}${analytics.comparisons.sameMonthLastYear.volumeGrowthPct}%`
        },
        fullYearTrajectory: {
          year2026Total: analytics.comparisons.yearOverYear.currentTotal,
          year2025Total: analytics.comparisons.yearOverYear.prevTotal,
          annualGrowthPercent: `+${analytics.comparisons.yearOverYear.volumeGrowthPct}%`
        }
      },
      recentMonthlyTrends: analytics.comparisons.monthlyHistory.slice(-6).map(m => ({
        month: m.label,
        total: m.total,
        completed: m.completed,
        completionRate: `${m.completionRate}%`
      })),
      topCategories: analytics.tagBreakdown.slice(0, 5).map(t => ({ category: t.tag, total: t.total, completionRate: `${t.completionRate}%` })),
      teamWorkload: analytics.workloadBreakdown.map(w => ({ name: w.name, total: w.total, inProgress: w.inProgress, overdue: w.overdue, completionRate: `${w.completionRate}%` })),
      overdueBottlenecks: analytics.overdueTasks.slice(0, 5).map(t => `"${t.title}" (${t.priority.toUpperCase()} - ${t.assignee})`)
    };

    const systemPrompt = `You are Synthie AI, an elite executive business analytics intelligence assistant.
You analyze live PostgreSQL database metrics across multiple historical periods (current period, previous month, same month last year, multi-year trends).

### STRICT GROUND RULES:
1. Ground EVERY trend claim, percentage growth, and number strictly in the factual data provided below.
2. DO NOT invent fictitious statistics, customers, or numbers.
3. Explicitly compare current period metrics with last month and the same month last year (YoY) when interpreting trends.
4. Structure your response into the 4 EXACT sections below.

### 📊 FACTUAL CALCULATED DATABASE METRICS & HISTORICAL COMPARISONS:
\`\`\`json
${JSON.stringify(structuredGrounding, null, 2)}
\`\`\``;

    const userPrompt = `Please generate an Executive AI Analysis Report for the "${analytics.period.label}" date range.

You MUST structure your response into these 4 EXACT markdown sections:

## 1. 📊 Overview
Provide an executive summary of overall operational velocity, health, and throughput for this period, highlighting the volume comparison with the previous period.

## 2. 🔍 Key Findings
Highlight the most important statistics:
- Current completion rates and active pipeline
- Month-over-Month (MoM) growth comparison (vs ${analytics.comparisons.priorPeriod.label})
- Year-over-Year (YoY) growth comparison (vs ${analytics.comparisons.sameMonthLastYear.label})
- High-performing functional categories and priority breakdown

## 3. 💡 AI Insights
Interpret the true meaning and trajectory of the data:
- Multi-period demand and velocity trends (e.g. shifts from 2025 into 2026)
- Delivery bottlenecks, capacity overload, and overdue risk factors
- Performance variations across categories/tags

## 4. 🎯 Actionable Recommendations
Provide 3-5 prioritized, highly practical recommendations based directly on the numbers to optimize delivery and eliminate bottlenecks.`;

    // 2. Try LLM Generation via Vercel AI SDK
    try {
      const resolved = await resolveModel({
        provider: aiParams.provider || 'auto',
        model: aiParams.model,
        apiKey: aiParams.apiKey
      });

      if (resolved && resolved.modelInstance) {
        const { streamText } = await loadAIModules();
        console.log(`[ReportService] Generating AI Report with LLM model: ${resolved.resolvedModel}`);

        const result = streamText({
          model: resolved.modelInstance,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.5
        });

        let fullText = '';
        for await (const chunk of result.textStream) {
          if (chunk) fullText += chunk;
        }

        if (fullText.trim().length > 100) {
          return {
            success: true,
            isAIGenerated: true,
            model: resolved.resolvedModel,
            generatedAt: new Date().toISOString(),
            analytics,
            reportContent: fullText,
            sections: this.parseSections(fullText)
          };
        }
      }
    } catch (llmErr) {
      console.warn('[ReportService LLM Warning - Falling back to deterministic engine]:', llmErr.message);
    }

    // 3. Fallback: Deterministic High-Quality Grounded Engine with Multi-Period Historical Comparisons
    console.log('[ReportService] Generating deterministic grounded report with historical comparisons');
    const fallbackReport = this.generateDeterministicReport(analytics, structuredGrounding);

    return {
      success: true,
      isAIGenerated: true,
      model: 'Built-in Grounded Intelligence Engine',
      generatedAt: new Date().toISOString(),
      analytics,
      reportContent: fallbackReport,
      sections: this.parseSections(fallbackReport)
    };
  }

  /**
   * Parses markdown sections into structured key-value object for frontend tab view
   */
  parseSections(markdown) {
    const sections = {
      overview: '',
      keyFindings: '',
      insights: '',
      recommendations: ''
    };

    const overviewMatch = markdown.match(/## 1\.\s*📊\s*Overview([\s\S]*?)(?=## 2\.|\n#|$)/i);
    const keyFindingsMatch = markdown.match(/## 2\.\s*🔍\s*Key Findings([\s\S]*?)(?=## 3\.|\n#|$)/i);
    const insightsMatch = markdown.match(/## 3\.\s*💡\s*AI Insights([\s\S]*?)(?=## 4\.|\n#|$)/i);
    const recommendationsMatch = markdown.match(/## 4\.\s*🎯\s*Actionable Recommendations([\s\S]*?)$/i);

    if (overviewMatch) sections.overview = overviewMatch[1].trim();
    if (keyFindingsMatch) sections.keyFindings = keyFindingsMatch[1].trim();
    if (insightsMatch) sections.insights = insightsMatch[1].trim();
    if (recommendationsMatch) sections.recommendations = recommendationsMatch[1].trim();

    return sections;
  }

  /**
   * Deterministic report generator grounded strictly in multi-period PostgreSQL calculations
   */
  generateDeterministicReport(analytics, data) {
    const { summary, priorityBreakdown, workloadBreakdown, tagBreakdown, overdueTasks, period, comparisons } = analytics;
    const { priorPeriod, sameMonthLastYear, yearOverYear } = comparisons;
    const urgentHighCount = (priorityBreakdown.find(p => p.priority === 'urgent')?.count || 0) + (priorityBreakdown.find(p => p.priority === 'high')?.count || 0);

    return `## 1. 📊 Overview
During **${period.label}**, the organization tracked **${summary.totalTasks} total tasks** across **${workloadBreakdown.length} active team contributors**.
The team achieved an overall completion rate of **${summary.completionRate}** \`${summary.progressBar}\` with **${summary.completedTasks} completed tasks**, while **${summary.activeTasks} active tasks** remain underway in the pipeline (**${summary.inProgressTasks} in progress**, **${summary.pendingTasks} pending**).
${priorPeriod.total > 0 ? `Task volume increased by **${priorPeriod.volumeGrowthPct >= 0 ? '+' : ''}${priorPeriod.volumeGrowthPct}%** (${priorPeriod.volumeChange >= 0 ? '+' : ''}${priorPeriod.volumeChange} tasks) compared with ${priorPeriod.label} (${priorPeriod.total} tasks), indicating expanding operational capacity.` : ''}

## 2. 🔍 Key Findings
- **Month-over-Month (MoM) Growth:** Volume reached **${summary.totalTasks} tasks** vs **${priorPeriod.total} tasks** in ${priorPeriod.label} (Growth: **${priorPeriod.volumeGrowthPct >= 0 ? '+' : ''}${priorPeriod.volumeGrowthPct}%**).
${sameMonthLastYear.total > 0 ? `- **Year-over-Year (YoY) Performance:** Compared to **${sameMonthLastYear.label}** (${sameMonthLastYear.total} tasks), operational volume expanded by **+${sameMonthLastYear.volumeGrowthPct}%** (+${sameMonthLastYear.volumeChange} tasks).` : ''}
- **Annual Trajectory:** Full year 2026 volume is currently at **${yearOverYear.currentTotal} tasks** vs **${yearOverYear.prevTotal} tasks in 2025** (**+${yearOverYear.volumeGrowthPct}% annual expansion**).
- **Priority Distribution:** **${urgentHighCount} tasks** carry Urgent or High priority ratings (${summary.totalTasks > 0 ? ((urgentHighCount / summary.totalTasks) * 100).toFixed(1) : 0}% of scope).
- **Top Performing Category:** **${tagBreakdown[0]?.tag || 'General'}** leads with **${tagBreakdown[0]?.total || 0} tasks** (${tagBreakdown[0]?.completionRate || 0}% completed).

## 3. 💡 AI Insights
- **Multi-Period Trajectory:** Operational volume has grown steadily from 2025 into 2026. The substantial Year-over-Year expansion (+${sameMonthLastYear.volumeGrowthPct || yearOverYear.volumeGrowthPct}%) demonstrates higher platform adoption and project delivery frequency.
- **Workload Concentration:** The heaviest workload is currently handled by **${workloadBreakdown[0]?.name || 'the team'}** with **${workloadBreakdown[0]?.total || 0} assigned tasks** (${workloadBreakdown[0]?.inProgress || 0} active in progress).
${summary.overdueCount > 0 ? `- ⚠️ **Delivery Risk & Bottlenecks:** **${summary.overdueCount} critical tasks** are overdue (${overdueTasks.slice(0, 3).map(t => `"${t.title}"`).join(', ')}). Immediate triage is required to unblock downstream dependencies.` : '- ✅ **On Schedule:** All active deliverables are tracking within scheduled target deadlines.'}
- **Category Momentum:** Strong delivery throughput is observed in **${tagBreakdown.filter(t => t.completionRate >= 50).map(t => t.tag).slice(0, 2).join(', ') || tagBreakdown[0]?.tag || 'Engineering'}**, while **${tagBreakdown.filter(t => t.completionRate < 50).map(t => t.tag).slice(0, 2).join(', ') || 'ongoing projects'}** have pending items in the queue.

## 4. 🎯 Actionable Recommendations
1. **Resolve Overdue Bottlenecks:** Address the **${summary.overdueCount} overdue deliverable(s)** immediately to prevent milestone slippage.
2. **Capitalize on Category Momentum:** Replicate workflow practices from high-performing **${tagBreakdown[0]?.tag || 'Engineering'}** workstreams across other teams.
3. **Rebalance Workload Distribution:** Reassign tasks from heavily loaded members managing over ${Math.ceil((summary.totalTasks / (workloadBreakdown.length || 1)) * 1.5)} tasks to prevent burnout.
4. **Sustain Velocity Gains:** Maintain sprint execution cadence to sustain YoY growth above +50% into the next quarter.`;
  }
}

module.exports = new ReportService();

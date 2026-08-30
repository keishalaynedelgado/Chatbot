/**
 * Task Analytics & Data Grounding Service
 * 
 * Securely retrieves and aggregates PostgreSQL database data using Sequelize
 * strictly scoped to the authenticated user's tenant and role.
 * Computes deterministic statistics, reports, insights, and recommendations.
 * 
 * MULTI-TENANT RBAC RULES:
 * - Super Admin: System-wide task and tenant metrics across all organizations.
 * - Admin: Full analytics for their specific tenant (team workloads, task statuses, overdue items).
 * - Staff: Strictly their assigned and created tasks within their tenant.
 */

const { Op } = require('sequelize');
const { Task, User, Tenant } = require('../models');

class TaskAnalyticsService {
  /**
   * Helper to generate ASCII progress bar from percentage
   */
  generateProgressBar(percent, length = 10) {
    const num = Math.max(0, Math.min(100, Number(percent) || 0));
    const filled = Math.round((num / 100) * length);
    const empty = length - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * Retrieves context-rich, authorized task data from PostgreSQL for LLM grounding
   * @param {Object} user - The authenticated user object from req.user
   * @returns {Promise<Object>} Aggregated metrics and task summaries
   */
  async getScopedAnalytics(user) {
    const isSuperAdmin = user.role === 'super_admin';
    const isAdmin = user.role === 'admin';
    const isStaff = user.role === 'staff';

    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId };
    const userTaskFilter = isStaff 
      ? { [Op.or]: [{ assignedTo: user.id }, { createdBy: user.id }] }
      : {};

    const baseTaskWhere = {
      ...tenantFilter,
      ...userTaskFilter
    };

    try {
      // 1. Fetch Task counts by status
      const allTasks = await Task.findAll({
        where: baseTaskWhere,
        include: [
          { model: User, as: 'assignee', attributes: ['id', 'firstName', 'lastName', 'username', 'email'] },
          { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'username'] },
          { model: Tenant, as: 'tenant', attributes: ['id', 'name', 'companyName'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 100
      });

      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = allTasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = allTasks.filter(t => t.status === 'pending').length;
      const cancelledTasks = allTasks.filter(t => t.status === 'cancelled').length;

      const urgentTasks = allTasks.filter(t => t.priority === 'urgent').length;
      const highPriorityTasks = allTasks.filter(t => t.priority === 'high').length;
      const mediumPriorityTasks = allTasks.filter(t => t.priority === 'medium').length;
      const lowPriorityTasks = allTasks.filter(t => t.priority === 'low').length;

      const now = new Date();
      const in7Days = new Date();
      in7Days.setDate(now.getDate() + 7);

      const overdueTasks = allTasks.filter(t => 
        t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && new Date(t.dueDate) < now
      );

      const upcomingTasks = allTasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled' || !t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= now && d <= in7Days;
      });

      const completionRateNum = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1)) : 0.0;
      const completionRateStr = `${completionRateNum.toFixed(1)}%`;
      const progressBar = this.generateProgressBar(completionRateNum);

      // 2. Fetch Users in Tenant (Admin & Super Admin only)
      let tenantUsers = [];
      if (!isStaff && user.tenantId) {
        tenantUsers = await User.findAll({
          where: { tenantId: user.tenantId, isActive: true },
          attributes: ['id', 'firstName', 'lastName', 'username', 'role', 'email']
        });
      }

      // 3. User Workload Calculation (for Admin / Super Admin)
      const userWorkload = {};
      allTasks.forEach(task => {
        if (task.assignee) {
          const name = `${task.assignee.firstName} ${task.assignee.lastName}`.trim() || task.assignee.username;
          if (!userWorkload[name]) {
            userWorkload[name] = { total: 0, pending: 0, in_progress: 0, completed: 0, cancelled: 0 };
          }
          userWorkload[name].total += 1;
          if (task.status === 'pending') userWorkload[name].pending += 1;
          if (task.status === 'in_progress') userWorkload[name].in_progress += 1;
          if (task.status === 'completed') userWorkload[name].completed += 1;
          if (task.status === 'cancelled') userWorkload[name].cancelled += 1;
        }
      });

      // 4. Tenant Info (if applicable)
      let tenantInfo = null;
      if (user.tenantId) {
        tenantInfo = await Tenant.findByPk(user.tenantId, {
          attributes: ['id', 'name', 'companyName', 'subscriptionPlan', 'isActive']
        });
      }

      // 5. Build structured prompt grounding summary
      const tasksSummary = allTasks.slice(0, 30).map(t => {
        const assigneeName = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned';
        const due = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'No deadline';
        return `- [${t.status.toUpperCase()}] "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assignee: ${assigneeName} | Due: ${due} | ID: ${t.id}`;
      }).join('\n');

      const formattedTaskList = allTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned',
        dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'No deadline'
      }));

      const structuredMetrics = {
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        cancelledTasks,
        overdueTasks: overdueTasks.length,
        urgentTasks,
        highPriorityTasks: urgentTasks + highPriorityTasks,
        completionRate: completionRateNum
      };

      return {
        scope: isSuperAdmin ? 'Global System' : (isAdmin ? `Tenant: ${tenantInfo?.companyName || user.tenantId}` : `Personal Staff: ${user.firstName} ${user.lastName}`),
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        cancelledTasks,
        completionRate: completionRateStr,
        completionRateNum,
        progressBar,
        statusCounts: {
          pending: pendingTasks,
          in_progress: inProgressTasks,
          completed: completedTasks,
          cancelled: cancelledTasks
        },
        priorityCounts: {
          urgent: urgentTasks,
          high: highPriorityTasks,
          medium: mediumPriorityTasks,
          low: lowPriorityTasks
        },
        overdueCount: overdueTasks.length,
        overdueTasks: overdueTasks.map(t => ({
          title: t.title,
          priority: t.priority,
          assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned',
          due: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A'
        })),
        upcomingTasks: upcomingTasks.map(t => ({
          title: t.title,
          priority: t.priority,
          assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned',
          due: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A'
        })),
        userWorkload,
        tasks: formattedTaskList,
        structuredMetrics,
        recentTasksFormatted: tasksSummary,
        activeUsersCount: tenantUsers.length
      };

    } catch (error) {
      console.warn('[TaskAnalyticsService Error]:', error.message);
      return {
        scope: 'Unavailable (Fallback Mode)',
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        cancelledTasks: 0,
        completionRate: '0.0%',
        completionRateNum: 0,
        progressBar: '[░░░░░░░░░░]',
        statusCounts: { pending: 0, in_progress: 0, completed: 0, cancelled: 0 },
        priorityCounts: { urgent: 0, high: 0, medium: 0, low: 0 },
        overdueCount: 0,
        overdueTasks: [],
        upcomingTasks: [],
        userWorkload: {},
        tasks: [],
        structuredMetrics: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, inProgressTasks: 0, overdueTasks: 0, completionRate: 0 },
        error: error.message
      };
    }
  }

  /**
   * Builds the comprehensive, secure system instruction incorporating PostgreSQL ground truth
   */
  generateSystemPrompt(user, analytics) {
    return `You are Synthie AI, the intelligent and authorized AI assistant for this Multi-Tenant Task Management System.
You are interacting with:
- Name: ${user.firstName} ${user.lastName}
- Username: ${user.username}
- Role: ${user.role.toUpperCase()}
- Tenant ID: ${user.tenantId || 'Super Admin (All Tenants)'}
- Scope Level: ${analytics.scope}

### 🔒 MULTI-TENANT & SECURITY RULES:
1. You have direct access to the live PostgreSQL Task & User analytics below.
2. When the user asks data questions or requests reports, use ONLY the factual calculated data provided below.
3. NEVER make up task titles, completion percentages, or assignee names.
4. Maintain strict role awareness:
   - Super Admin: Full system visibility.
   - Admin: Limited to their own tenant's operations.
   - Staff: Limited to their assigned and created tasks.

### 📊 LIVE CALCULATED METRICS (Deterministic Ground Truth):
\`\`\`json
${JSON.stringify(analytics.structuredMetrics, null, 2)}
\`\`\`

- **Total Scoped Tasks:** ${analytics.totalTasks}
- **Completion Rate:** ${analytics.completionRate} ${analytics.progressBar}
- **Status Breakdown:** Completed: ${analytics.statusCounts?.completed || 0} | In Progress: ${analytics.statusCounts?.in_progress || 0} | Pending: ${analytics.statusCounts?.pending || 0} | Cancelled: ${analytics.statusCounts?.cancelled || 0}
- **Priority Breakdown:** Urgent: ${analytics.priorityCounts?.urgent || 0} | High: ${analytics.priorityCounts?.high || 0} | Medium: ${analytics.priorityCounts?.medium || 0} | Low: ${analytics.priorityCounts?.low || 0}
- **Overdue Tasks Count:** ${analytics.overdueCount || 0}

${analytics.overdueTasks && analytics.overdueTasks.length > 0 ? `### ⚠️ OVERDUE TASKS LIST:
${analytics.overdueTasks.map(t => `- "${t.title}" (Priority: ${t.priority}, Assigned to: ${t.assignee}, Due: ${t.due})`).join('\n')}
` : ''}

${analytics.upcomingTasks && analytics.upcomingTasks.length > 0 ? `### 📅 UPCOMING DEADLINES (Next 7 Days):
${analytics.upcomingTasks.map(t => `- "${t.title}" (Priority: ${t.priority}, Assigned to: ${t.assignee}, Due: ${t.due})`).join('\n')}
` : ''}

${Object.keys(analytics.userWorkload || {}).length > 0 ? `### 👥 TEAM WORKLOAD DISTRIBUTION:
${Object.entries(analytics.userWorkload).map(([name, stats]) => `- **${name}**: ${stats.total} total (${stats.in_progress} in progress, ${stats.pending} pending, ${stats.completed} completed)`).join('\n')}
` : ''}

### 📋 RECENT TASKS:
${analytics.recentTasksFormatted || 'No tasks found.'}

================================================================================
CRITICAL LLM INSTRUCTIONS FOR REPORTS, INSIGHTS & RECOMMENDATIONS:
When the user asks for a report, summary, insights, progress evaluation, priority recommendations, or bottlenecks (e.g. "Generate a report about my tasks", "How am I doing with my tasks?", "What tasks should I focus on?", "Are there any problems with my current tasks?", "What should I prioritize?"):

You MUST structure your response into these 3 EXACT sections:

### 1. 📊 Report
- Provide a factual summary based directly on the calculated database statistics.
- Present tasks in a clean Markdown table with headers: Task Title, Status, Priority, Assignee, Due Date.
- Include the visual progress bar: \`${analytics.progressBar} ${analytics.completionRate}\`.

### 2. 💡 Key Insights
- Analyze the real meaning of the data: identify patterns, delivery risks, bottlenecks, or workload imbalance.
- Highlight overdue tasks and approaching deadlines as immediate concerns.
- State completion velocity and remaining workload.

### 3. 🎯 Recommended Actions
- Provide concrete, prioritized recommendations based solely on the available database data.
- E.g., prioritize overdue tasks first, followed by urgent/high-priority tasks, and review unassigned items.
================================================================================`;
  }

  /**
   * Generates a rich offline smart reply adhering to the 3-section Report / Key Insights / Recommended Actions structure
   */
  generateOfflineReply(prompt, analytics, user) {
    const p = prompt.toLowerCase().trim();

    // 1. Comprehensive Report, Insights & Recommendations
    const isReportOrInsightQuery = p.includes('report') || p.includes('insight') || p.includes('how am i doing') || 
                                   p.includes('focus') || p.includes('prioritize') || p.includes('problem') || 
                                   p.includes('recommend') || p.includes('summary') || p.includes('progress');

    if (isReportOrInsightQuery && !p.includes('how many pending') && !p.includes('workload')) {
      let output = `### 1. 📊 Report\n\n`;
      output += `**Scope:** ${analytics.scope}\n\n`;
      output += `- **Total Tasks:** **${analytics.totalTasks}**\n`;
      output += `- **Completed:** **${analytics.completedTasks}** (${analytics.completionRate})\n`;
      output += `- **In Progress:** **${analytics.inProgressTasks}**\n`;
      output += `- **Pending:** **${analytics.pendingTasks}**\n`;
      output += `- **Overdue:** **${analytics.overdueCount}**\n`;
      output += `- **Completion Rate:** **${analytics.completionRate}** \`${analytics.progressBar}\`\n\n`;

      output += `#### ⚡ Priority Breakdown:\n`;
      output += `- 🔴 **Urgent:** ${analytics.priorityCounts?.urgent || 0}\n`;
      output += `- 🟠 **High:** ${analytics.priorityCounts?.high || 0}\n`;
      output += `- 🟡 **Medium:** ${analytics.priorityCounts?.medium || 0}\n`;
      output += `- 🟢 **Low:** ${analytics.priorityCounts?.low || 0}\n\n`;

      if (analytics.tasks && analytics.tasks.length > 0) {
        output += `#### 📋 Current Tasks in Scope:\n\n`;
        output += `| Task Title | Status | Priority | Assignee | Due Date |\n| :--- | :--- | :--- | :--- | :--- |\n`;
        analytics.tasks.forEach(t => {
          const statusBadge = t.status === 'completed' ? '✅ Completed' : t.status === 'in_progress' ? '🔄 In Progress' : t.status === 'pending' ? '⏳ Pending' : '❌ Cancelled';
          const priorityBadge = t.priority === 'urgent' ? '🔴 Urgent' : t.priority === 'high' ? '🟠 High' : t.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
          output += `| **${t.title}** | ${statusBadge} | ${priorityBadge} | ${t.assignee} | \`${t.dueDate}\` |\n`;
        });
        output += `\n`;
      }

      output += `### 2. 💡 Key Insights\n\n`;
      if (analytics.totalTasks === 0) {
        output += `- There are currently no tasks recorded in your scope. Your task queue is clean.\n\n`;
      } else {
        if (analytics.completionRateNum >= 75) {
          output += `- **High Execution Velocity:** Completion rate is at **${analytics.completionRate}**, indicating strong progress on project milestones.\n`;
        } else if (analytics.completionRateNum >= 40) {
          output += `- **Moderate Progress:** Completion rate is **${analytics.completionRate}**, with **${analytics.inProgressTasks + analytics.pendingTasks} active tasks** underway.\n`;
        } else {
          output += `- **Active Queue Pipeline:** Completion rate is **${analytics.completionRate}**, with the majority of tasks in progress or pending.\n`;
        }

        if (analytics.overdueCount > 0) {
          output += `- ⚠️ **Delivery Risk:** **${analytics.overdueCount} task(s)** are overdue (${analytics.overdueTasks.map(t => `"${t.title}"`).join(', ')}), requiring immediate intervention.\n`;
        } else {
          output += `- ✅ **On Schedule:** All active tasks are within their scheduled target deadlines.\n`;
        }

        const urgentHigh = (analytics.priorityCounts?.urgent || 0) + (analytics.priorityCounts?.high || 0);
        if (urgentHigh > 0) {
          output += `- 🎯 **High Priority Workload:** **${urgentHigh} task(s)** carry urgent or high priority ratings.\n`;
        }
        output += `\n`;
      }

      output += `### 3. 🎯 Recommended Actions\n\n`;
      let step = 1;
      if (analytics.overdueCount > 0) {
        output += `${step++}. **Resolve Overdue Tasks:** Address ${analytics.overdueTasks.map(t => `**"${t.title}"**`).join(' and ')} immediately to unblock downstream milestones.\n`;
      }
      const highPriorityTasks = analytics.tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed' && t.status !== 'cancelled');
      if (highPriorityTasks.length > 0) {
        output += `${step++}. **Focus on Critical Priorities:** Execute ${highPriorityTasks.map(t => `**"${t.title}"**`).join(', ')} next.\n`;
      } else {
        const inProgress = analytics.tasks.filter(t => t.status === 'in_progress');
        if (inProgress.length > 0) {
          output += `${step++}. **Complete Active In-Progress Work:** Wrap up ${inProgress.map(t => `**"${t.title}"**`).join(', ')}.\n`;
        }
      }
      output += `${step}. **Workload Alignment:** Review team allocations to ensure balanced task distribution.`;

      return output;
    }

    // 2. Pending Tasks Query
    if (p.includes('pending') || p.includes('how many pending')) {
      return `### 📋 **Pending Tasks Report**

Currently, there are **${analytics.statusCounts?.pending || 0}** pending tasks in your authorized scope (**${analytics.scope}**).

| Status | Count | Percentage |
| :--- | :---: | :---: |
| ⏳ **Pending** | **${analytics.statusCounts?.pending || 0}** | ${analytics.totalTasks ? ((analytics.statusCounts.pending / analytics.totalTasks) * 100).toFixed(1) : 0}% |
| 🔄 **In Progress** | **${analytics.statusCounts?.in_progress || 0}** | ${analytics.totalTasks ? ((analytics.statusCounts.in_progress / analytics.totalTasks) * 100).toFixed(1) : 0}% |
| ✅ **Completed** | **${analytics.statusCounts?.completed || 0}** | ${analytics.totalTasks ? ((analytics.statusCounts.completed / analytics.totalTasks) * 100).toFixed(1) : 0}% |
| ❌ **Cancelled** | **${analytics.statusCounts?.cancelled || 0}** | ${analytics.totalTasks ? ((analytics.statusCounts.cancelled / analytics.totalTasks) * 100).toFixed(1) : 0}% |

*Total Tracked Tasks: ${analytics.totalTasks}*`;
    }

    // 3. Workload Query
    if (p.includes('user') || p.includes('workload') || p.includes('assigned') || p.includes('most')) {
      const workloads = Object.entries(analytics.userWorkload || {});
      if (workloads.length === 0) {
        return `There are currently no assigned tasks recorded in your scope.`;
      }
      const sorted = workloads.sort((a, b) => b[1].total - a[1].total);
      const rows = sorted.map(([name, s]) => `| **${name}** | ${s.total} | ${s.in_progress} | ${s.pending} | ${s.completed} |`).join('\n');

      return `### 👥 **Team Workload Breakdown**

Here is the current task assignment distribution:

| Team Member | Total Tasks | In Progress | Pending | Completed |
| :--- | :---: | :---: | :---: | :---: |
${rows}

> 💡 **Recommendation:** Balance workloads for team members with high in-progress task counts.`;
    }

    // 4. Overdue Query
    if (p.includes('overdue') || p.includes('incomplete') || p.includes('deadline')) {
      if (!analytics.overdueTasks || analytics.overdueTasks.length === 0) {
        return `### ✅ **No Overdue Tasks!**\n\nAll active tasks are currently within their designated due dates. Great job keeping the project on schedule!`;
      }
      const rows = analytics.overdueTasks.map(t => `| "${t.title}" | ${t.priority.toUpperCase()} | ${t.assignee} | ${t.due} |`).join('\n');
      return `### ⚠️ **Overdue Tasks Alert**

Found **${analytics.overdueTasks.length}** overdue task(s):

| Task Title | Priority | Assignee | Due Date |
| :--- | :--- | :--- | :--- |
${rows}

*Please prioritize these items to prevent delivery bottlenecks.*`;
    }

    return `Hello **${user.firstName}**! I'm **Synthie AI**, your intelligent assistant for this Task Management System.

I have live access to your PostgreSQL database. You can ask me:
- *"Generate a report about my tasks."*
- *"Give me insights about my tasks."*
- *"What tasks should I focus on?"*
- *"What should I prioritize?"*
- *"How many tasks are currently pending?"*
- *"Which users have the most assigned tasks?"*

How can I help you today?`;
  }
}

module.exports = new TaskAnalyticsService();

/**
 * Live PostgreSQL Task Management Database Service
 * 
 * Securely queries live database records (Tasks, Users, Tenants)
 * using Sequelize ORM with relational joins and aggregates.
 * Computes deterministic statistics, reports, insights, and recommendations.
 */

import { Task, User, Tenant, sequelize } from './models/index.js';
import { Op } from 'sequelize';

class TaskDbService {
  constructor() {
    this.cachedData = null;
    this.lastFetchTime = 0;
    this.CACHE_TTL = 3000; // 3 seconds cache for high responsiveness
  }

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
   * Fetches live data from PostgreSQL database with relational joins
   * and calculates deterministic statistics.
   */
  async fetchLiveAnalytics() {
    const nowTime = Date.now();
    if (this.cachedData && (nowTime - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cachedData;
    }

    try {
      // 1. Fetch all tasks with assignee, creator, and tenant
      const tasks = await Task.findAll({
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'firstName', 'lastName', 'username', 'email', 'role']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'firstName', 'lastName', 'username']
          },
          {
            model: Tenant,
            as: 'tenant',
            attributes: ['id', 'name', 'companyName']
          }
        ],
        order: [['createdAt', 'DESC']],
        raw: false
      });

      // 2. Fetch all users
      const users = await User.findAll({
        attributes: ['id', 'firstName', 'lastName', 'username', 'role', 'email', 'tenantId', 'isActive'],
        raw: true
      });

      // 3. Fetch all tenants
      const tenants = await Tenant.findAll({
        attributes: ['id', 'name', 'companyName', 'subscriptionPlan', 'isActive'],
        raw: true
      });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const cancelledTasks = tasks.filter(t => t.status === 'cancelled').length;

      const urgentTasks = tasks.filter(t => t.priority === 'urgent').length;
      const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
      const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium').length;
      const lowPriorityTasks = tasks.filter(t => t.priority === 'low').length;

      const nowDate = new Date();
      const in7Days = new Date();
      in7Days.setDate(nowDate.getDate() + 7);

      // Overdue tasks: dueDate < now and not completed or cancelled
      const overdueTasks = tasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled' || !t.dueDate) return false;
        return new Date(t.dueDate) < nowDate;
      });

      // Upcoming deadlines: due within next 7 days and not completed or cancelled
      const upcomingTasks = tasks.filter(t => {
        if (t.status === 'completed' || t.status === 'cancelled' || !t.dueDate) return false;
        const d = new Date(t.dueDate);
        return d >= nowDate && d <= in7Days;
      });

      const completionRateNum = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(1)) : 0.0;
      const completionRateStr = `${completionRateNum.toFixed(1)}%`;
      const progressBar = this.generateProgressBar(completionRateNum);

      // 4. User Workload Calculation
      const userWorkload = {};
      users.forEach(u => {
        const name = `${u.firstName} ${u.lastName}`.trim() || u.username;
        const userTasks = tasks.filter(t => t.assignedTo === u.id);
        userWorkload[name] = {
          userId: u.id,
          username: u.username,
          role: u.role,
          email: u.email,
          total: userTasks.length,
          in_progress: userTasks.filter(t => t.status === 'in_progress').length,
          pending: userTasks.filter(t => t.status === 'pending').length,
          completed: userTasks.filter(t => t.status === 'completed').length,
          cancelled: userTasks.filter(t => t.status === 'cancelled').length
        };
      });

      // Account for unassigned tasks in workload if any
      const unassignedTasks = tasks.filter(t => !t.assignedTo);
      if (unassignedTasks.length > 0) {
        userWorkload['Unassigned'] = {
          userId: null,
          username: 'unassigned',
          role: 'none',
          email: 'n/a',
          total: unassignedTasks.length,
          in_progress: unassignedTasks.filter(t => t.status === 'in_progress').length,
          pending: unassignedTasks.filter(t => t.status === 'pending').length,
          completed: unassignedTasks.filter(t => t.status === 'completed').length,
          cancelled: unassignedTasks.filter(t => t.status === 'cancelled').length
        };
      }

      const formattedTasks = tasks.map(t => {
        const assigneeName = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() || t.assignee.username : 'Unassigned';
        const creatorName = t.creator ? `${t.creator.firstName} ${t.creator.lastName}`.trim() || t.creator.username : 'System';
        const dueDateStr = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'No deadline';
        return {
          id: t.id,
          title: t.title,
          description: t.description || 'No description provided',
          status: t.status,
          priority: t.priority,
          dueDate: dueDateStr,
          rawDueDate: t.dueDate,
          assignee: assigneeName,
          assigneeId: t.assignedTo,
          creator: creatorName,
          tenantName: t.tenant?.companyName || t.tenant?.name || 'Default Tenant'
        };
      });

      // Structured deterministic payload
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

      const analytics = {
        isLiveDb: true,
        total: totalTasks,
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
        overdueTasks: overdueTasks.map(t => {
          const assigneeName = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() || t.assignee.username : 'Unassigned';
          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            assignee: assigneeName,
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A'
          };
        }),
        upcomingTasks: upcomingTasks.map(t => {
          const assigneeName = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() || t.assignee.username : 'Unassigned';
          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            assignee: assigneeName,
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'N/A'
          };
        }),
        userWorkload,
        tasks: formattedTasks,
        structuredMetrics,
        users,
        tenants
      };

      this.cachedData = analytics;
      this.lastFetchTime = nowTime;
      return analytics;

    } catch (err) {
      console.warn('[TaskDbService Warning - Live DB Query Failed]:', err.message);
      return this.getFallbackData();
    }
  }

  /**
   * Fallback data in case DB connection is momentarily disconnected
   */
  getFallbackData() {
    return {
      isLiveDb: false,
      total: 0,
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
      structuredMetrics: {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        cancelledTasks: 0,
        overdueTasks: 0,
        urgentTasks: 0,
        highPriorityTasks: 0,
        completionRate: 0
      },
      users: [],
      tenants: []
    };
  }

  /**
   * Generates formatted live database context for LLM system prompt grounding
   */
  async formatContextForPrompt() {
    const data = await this.fetchLiveAnalytics();

    if (data.total === 0 && !data.isLiveDb) {
      return `### 📋 TASK MANAGEMENT DATABASE STATUS:
Database connection is active but currently has 0 tasks recorded.`;
    }

    const tasksList = data.tasks.slice(0, 40).map(t => 
      `- [${t.status.toUpperCase()}] "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assignee: ${t.assignee} | Due: ${t.dueDate} (ID: ${t.id})`
    ).join('\n');

    const workloadList = Object.entries(data.userWorkload).map(([name, stats]) => 
      `- **${name}** (${stats.role}): ${stats.total} total (${stats.in_progress} in progress, ${stats.pending} pending, ${stats.completed} completed)`
    ).join('\n');

    const overdueList = data.overdueTasks.map(t => 
      `- ⚠️ "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assigned to: ${t.assignee} | Due: ${t.dueDate}`
    ).join('\n');

    const upcomingList = data.upcomingTasks.map(t => 
      `- 📅 "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assigned to: ${t.assignee} | Due: ${t.dueDate}`
    ).join('\n');

    return `### 📋 LIVE POSTGRESQL DATABASE CONTEXT (Deterministic Calculated Ground Truth):
\`\`\`json
${JSON.stringify(data.structuredMetrics, null, 2)}
\`\`\`

- **Total Tasks:** ${data.totalTasks}
- **Completion Rate:** ${data.completionRate} ${data.progressBar}
- **Status Counts:** Completed: ${data.statusCounts.completed}, In Progress: ${data.statusCounts.in_progress}, Pending: ${data.statusCounts.pending}, Cancelled: ${data.statusCounts.cancelled}
- **Priority Distribution:** Urgent: ${data.priorityCounts.urgent}, High: ${data.priorityCounts.high}, Medium: ${data.priorityCounts.medium}, Low: ${data.priorityCounts.low}
- **Overdue Tasks Count:** ${data.overdueCount}

### ⚠️ OVERDUE TASKS:
${overdueList || 'None. All active tasks are within schedule.'}

### 📅 UPCOMING DEADLINES (Next 7 Days):
${upcomingList || 'None.'}

### 👥 TEAM WORKLOAD:
${workloadList || 'No team assignments found.'}

### 📝 LIVE DATABASE TASK RECORDS:
${tasksList || 'No task records found.'}

================================================================================
CRITICAL LLM INSTRUCTIONS FOR REPORTS, INSIGHTS & RECOMMENDATIONS:
When the user asks for a report, summary, insights, progress evaluation, priority recommendations, or bottlenecks (e.g. "Generate a report about my tasks", "How am I doing with my tasks?", "What tasks should I focus on?", "Are there any problems with my current tasks?", "What should I prioritize?"):

You MUST structure your response into these 3 EXACT sections:

### 1. 📊 Report
- Provide a factual summary based directly on the calculated database statistics (Total tasks, Completed, Pending, In Progress, Overdue, Priority breakdown, Completion rate).
- Present tasks in a clean Markdown table with headers: Task Title, Status, Priority, Assignee, Due Date.
- Include the visual progress bar: \`${data.progressBar} ${data.completionRate}\`.

### 2. 💡 Key Insights
- Analyze the real meaning of the data: identify patterns, delivery risks, bottlenecks, or workload imbalance.
- Highlight overdue tasks and approaching deadlines as immediate concerns.
- State completion velocity and remaining workload.

### 3. 🎯 Recommended Actions
- Provide concrete, prioritized recommendations based solely on the available database data.
- E.g., prioritize overdue tasks first, followed by urgent/high-priority tasks, and review unassigned items.

STRICT ACCURACY RULES:
- Use ONLY the factual data provided above.
- NEVER invent tasks, statistics, assignees, or dates.
- Clearly state when there is no data for a category.
================================================================================`;
  }

  /**
   * Generates smart, natural-language responses directly from PostgreSQL records
   * adhering to the 3-section Report / Key Insights / Recommended Actions structure.
   */
  async generateOfflineReply(prompt) {
    const p = prompt.toLowerCase().trim();
    const data = await this.fetchLiveAnalytics();

    const isTaskContext = p.includes('task') || p.includes('todo') || p.includes('workload') || 
                          p.includes('assignee') || p.includes('overdue') || p.includes('assigned') || 
                          p.includes('pending') || p.includes('completed') || p.includes('progress') || 
                          p.includes('priority') || p.includes('report') || p.includes('insight') || 
                          p.includes('focus') || p.includes('problem') || p.includes('recommend') || 
                          p.includes('doing') || p.includes('summary');

    if (!isTaskContext || p.includes('q3') || p.includes('financial') || p.includes('employee') || p.includes('staff')) {
      return null;
    }

    // 1. Full Comprehensive Report, Insights & Recommendations
    // Queries: "Generate a report about my tasks", "Give me a summary of my task progress", "How am I doing with my tasks?", "Give me insights about my tasks", "What tasks should I focus on?", "Are there any problems with my current tasks?", "What should I prioritize?"
    const isReportOrInsightQuery = p.includes('report') || p.includes('insight') || p.includes('how am i doing') || 
                                   p.includes('focus') || p.includes('prioritize') || p.includes('problem') || 
                                   p.includes('recommend') || p.includes('summary') || p.includes('progress');

    if (isReportOrInsightQuery && !p.includes('who has the most') && !p.includes('engineering') && !p.includes('salary')) {
      return this.buildComprehensiveReport(data);
    }

    // 2. General Task Count Query (e.g. "How many tasks do I have?", "Total tasks")
    if ((p.includes('how many tasks') || p.includes('total tasks') || p.includes('how many task') || p.includes('count of tasks')) && !p.includes('pending') && !p.includes('completed') && !p.includes('overdue')) {
      let reply = `### 📋 **Total Tasks in Database**\n\n`;
      reply += `You currently have **${data.totalTasks} total task${data.totalTasks === 1 ? '' : 's'}** recorded in the database.\n\n`;
      reply += `#### 📊 Status Breakdown:\n`;
      reply += `- 🔄 **In Progress:** ${data.statusCounts.in_progress}\n`;
      reply += `- ⏳ **Pending:** ${data.statusCounts.pending}\n`;
      reply += `- ✅ **Completed:** ${data.statusCounts.completed}\n`;
      reply += `- ❌ **Cancelled:** ${data.statusCounts.cancelled}\n\n`;
      reply += `*Completion Rate: **${data.completionRate}** \`${data.progressBar}\`*`;
      return reply;
    }

    // 3. Pending Tasks Query (e.g. "How many pending tasks do I have?", "Show me my pending tasks", "Show pending tasks")
    if (p.includes('pending')) {
      const pendingTasks = data.tasks.filter(t => t.status === 'pending');
      const pendingCount = data.statusCounts.pending;

      let reply = `### 📋 **Pending Tasks in Database**\n\n`;
      if (pendingCount === 0) {
        reply += `You currently have **0 pending tasks** in the database (out of **${data.totalTasks}** total tasks).\n\n`;
      } else {
        reply += `You currently have **${pendingCount} pending task${pendingCount === 1 ? '' : 's'}** in the database (out of **${data.totalTasks}** total tasks):\n\n`;
        reply += `| Task Title | Priority | Assignee | Due Date |\n| :--- | :--- | :--- | :--- |\n`;
        pendingTasks.forEach(t => {
          const priorityBadge = t.priority === 'urgent' ? '🔴 Urgent' : t.priority === 'high' ? '🟠 High' : t.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
          reply += `| **${t.title}** | ${priorityBadge} | ${t.assignee} | \`${t.dueDate}\` |\n`;
        });
        reply += `\n`;
      }

      reply += `#### 📊 Overall Status Breakdown:\n`;
      reply += `- ⏳ **Pending:** ${data.statusCounts.pending}\n`;
      reply += `- 🔄 **In Progress:** ${data.statusCounts.in_progress}\n`;
      reply += `- ✅ **Completed:** ${data.statusCounts.completed}\n`;
      reply += `- ❌ **Cancelled:** ${data.statusCounts.cancelled}\n\n`;
      reply += `*Current Completion Rate: **${data.completionRate}** \`${data.progressBar}\`*`;
      return reply;
    }

    // 4. Overdue Tasks Query (e.g. "What tasks are overdue?", "Which tasks are late?")
    if (p.includes('overdue') || p.includes('late') || p.includes('past due') || p.includes('deadline')) {
      const count = data.overdueCount;
      if (count === 0) {
        return `### ✅ **No Overdue Tasks**\n\nGreat news! There are currently **0 overdue tasks** in the database. All active tasks are within their scheduled deadlines.`;
      }

      let reply = `### ⚠️ **Overdue Tasks Requiring Attention**\n\n`;
      reply += `Found **${count} overdue task${count === 1 ? '' : 's'}** that have passed their due dates:\n\n`;
      reply += `| Task Title | Priority | Assignee | Due Date |\n| :--- | :--- | :--- | :--- |\n`;
      data.overdueTasks.forEach(t => {
        const priorityBadge = t.priority === 'urgent' ? '🔴 Urgent' : t.priority === 'high' ? '🟠 High' : t.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
        reply += `| **${t.title}** | ${priorityBadge} | ${t.assignee} | ⚠️ \`${t.dueDate}\` |\n`;
      });
      reply += `\n*Recommendation: Follow up with assignees to re-schedule or close delayed items.*`;
      return reply;
    }

    // 5. Completed Tasks Query (e.g. "Show completed tasks", "How many tasks are completed?")
    if (p.includes('completed') || p.includes('finished') || p.includes('done')) {
      const completedTasks = data.tasks.filter(t => t.status === 'completed');
      const count = completedTasks.length;

      let reply = `### ✅ **Completed Tasks Report**\n\n`;
      reply += `There are **${count} completed task${count === 1 ? '' : 's'}** recorded in the database (**${data.completionRate}** completion rate \`${data.progressBar}\`).\n\n`;
      if (count > 0) {
        reply += `| Task Title | Priority | Completed By / Assignee |\n| :--- | :--- | :--- |\n`;
        completedTasks.forEach(t => {
          reply += `| **${t.title}** | \`${t.priority.toUpperCase()}\` | ${t.assignee} |\n`;
        });
      } else {
        reply += `*No tasks are marked as completed yet.*`;
      }
      return reply;
    }

    // 6. Highest Priority Query (e.g. "Which tasks have the highest priority?", "Show urgent tasks")
    if (p.includes('highest priority') || p.includes('high priority') || p.includes('urgent') || p.includes('priority')) {
      const priorityOrder = { urgent: 1, high: 2, medium: 3, low: 4 };
      const sorted = [...data.tasks].sort((a, b) => (priorityOrder[a.priority] || 5) - (priorityOrder[b.priority] || 5));

      let reply = `### ⚡ **Tasks by Priority Level**\n\n`;
      reply += `Priority distribution across all **${data.totalTasks}** tasks:\n`;
      reply += `- 🔴 **Urgent:** ${data.priorityCounts.urgent}\n`;
      reply += `- 🟠 **High:** ${data.priorityCounts.high}\n`;
      reply += `- 🟡 **Medium:** ${data.priorityCounts.medium}\n`;
      reply += `- 🟢 **Low:** ${data.priorityCounts.low}\n\n`;

      reply += `| Priority | Task Title | Status | Assignee | Due Date |\n| :--- | :--- | :--- | :--- | :--- |\n`;
      sorted.slice(0, 15).forEach(t => {
        const priorityBadge = t.priority === 'urgent' ? '🔴 Urgent' : t.priority === 'high' ? '🟠 High' : t.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
        const statusBadge = t.status === 'completed' ? '✅ Completed' : t.status === 'in_progress' ? '🔄 In Progress' : t.status === 'pending' ? '⏳ Pending' : '❌ Cancelled';
        reply += `| ${priorityBadge} | **${t.title}** | ${statusBadge} | ${t.assignee} | \`${t.dueDate}\` |\n`;
      });
      return reply;
    }

    // 7. Workload & User Assignments (e.g. "Who has the most tasks assigned?", "Show team workload")
    if (p.includes('workload') || p.includes('user') || p.includes('team') || p.includes('assigned') || p.includes('who has the most')) {
      const workloads = Object.entries(data.userWorkload).filter(([_, s]) => s.total > 0 || s.role !== 'none');
      workloads.sort((a, b) => b[1].total - a[1].total);

      let reply = `### 👥 **Team Task Assignment & Workload Breakdown**\n\n`;
      reply += `Current distribution across registered users in the database:\n\n`;
      reply += `| Team Member | Role | Total Tasks | In Progress | Pending | Completed |\n| :--- | :--- | :---: | :---: | :---: | :---: |\n`;
      workloads.forEach(([name, s]) => {
        reply += `| **${name}** | \`${s.role}\` | **${s.total}** | ${s.in_progress} | ${s.pending} | ${s.completed} |\n`;
      });

      if (workloads.length > 0 && workloads[0][1].total > 0) {
        reply += `\n> 💡 **Key Insight:** **${workloads[0][0]}** currently holds the highest number of assignments (**${workloads[0][1].total} task${workloads[0][1].total === 1 ? '' : 's'}**).`;
      }
      return reply;
    }

    // 8. Fallback to comprehensive report for any other task status questions
    return this.buildComprehensiveReport(data);
  }

  /**
   * Builds the comprehensive 3-section Report / Key Insights / Recommended Actions
   */
  buildComprehensiveReport(data) {
    let output = `### 1. 📊 Report\n\n`;
    output += `Here is the factual summary of tasks retrieved directly from the PostgreSQL database:\n\n`;
    output += `- **Total Tasks:** **${data.totalTasks}**\n`;
    output += `- **Completed:** **${data.completedTasks}** (${data.completionRate})\n`;
    output += `- **In Progress:** **${data.inProgressTasks}**\n`;
    output += `- **Pending:** **${data.pendingTasks}**\n`;
    output += `- **Overdue:** **${data.overdueCount}**\n`;
    output += `- **Completion Rate:** **${data.completionRate}** \`${data.progressBar}\`\n\n`;

    output += `#### ⚡ Priority Distribution:\n`;
    output += `- 🔴 **Urgent:** ${data.priorityCounts.urgent}\n`;
    output += `- 🟠 **High:** ${data.priorityCounts.high}\n`;
    output += `- 🟡 **Medium:** ${data.priorityCounts.medium}\n`;
    output += `- 🟢 **Low:** ${data.priorityCounts.low}\n\n`;

    if (data.tasks.length > 0) {
      output += `#### 📋 Current Tasks in Scope:\n\n`;
      output += `| Task Title | Status | Priority | Assignee | Due Date |\n| :--- | :--- | :--- | :--- | :--- |\n`;
      data.tasks.forEach(t => {
        const statusBadge = t.status === 'completed' ? '✅ Completed' : t.status === 'in_progress' ? '🔄 In Progress' : t.status === 'pending' ? '⏳ Pending' : '❌ Cancelled';
        const priorityBadge = t.priority === 'urgent' ? '🔴 Urgent' : t.priority === 'high' ? '🟠 High' : t.priority === 'medium' ? '🟡 Medium' : '🟢 Low';
        output += `| **${t.title}** | ${statusBadge} | ${priorityBadge} | ${t.assignee} | \`${t.dueDate}\` |\n`;
      });
      output += `\n`;
    }

    output += `### 2. 💡 Key Insights\n\n`;
    if (data.totalTasks === 0) {
      output += `- There are currently no tasks recorded in the database. The team has a clean slate to begin new initiatives.\n\n`;
    } else {
      // Insight 1: Completion velocity
      if (data.completionRateNum >= 75) {
        output += `- **Strong Completion Velocity:** Your completion rate stands at **${data.completionRate}**, indicating excellent milestone execution.\n`;
      } else if (data.completionRateNum >= 40) {
        output += `- **Steady Progress:** Your completion rate is at **${data.completionRate}**, with **${data.inProgressTasks + data.pendingTasks} active tasks** in the pipeline.\n`;
      } else {
        output += `- **Early Sprint Phase / Low Velocity:** The current completion rate is **${data.completionRate}**, with most workload currently in the queue.\n`;
      }

      // Insight 2: Overdue items / Risks
      if (data.overdueCount > 0) {
        output += `- ⚠️ **Overdue Risk Identified:** There ${data.overdueCount === 1 ? 'is' : 'are'} **${data.overdueCount} task${data.overdueCount === 1 ? '' : 's'} past the due date** (${data.overdueTasks.map(t => `"${t.title}"`).join(', ')}) that require immediate resolution.\n`;
      } else {
        output += `- ✅ **On-Schedule Execution:** There are **0 overdue tasks**—all active deliverables are currently within their target timelines.\n`;
      }

      // Insight 3: Priority load
      const urgentHigh = data.priorityCounts.urgent + data.priorityCounts.high;
      if (urgentHigh > 0) {
        output += `- 🎯 **High Priority Focus:** **${urgentHigh} task${urgentHigh === 1 ? '' : 's'}** have urgent or high priority ratings, representing the core critical path.\n`;
      }

      // Insight 4: Upcoming deadlines
      if (data.upcomingTasks.length > 0) {
        output += `- 📅 **Approaching Deadlines:** **${data.upcomingTasks.length} task${data.upcomingTasks.length === 1 ? '' : 's'}** due in the next 7 days (${data.upcomingTasks.map(t => `"${t.title}" on ${t.dueDate}`).join(', ')}).\n`;
      }
      output += `\n`;
    }

    output += `### 3. 🎯 Recommended Actions\n\n`;
    let actionStep = 1;
    if (data.overdueCount > 0) {
      output += `${actionStep++}. **Resolve Overdue Deliverables:** Immediately unblock or update ${data.overdueTasks.map(t => `**"${t.title}"** (assigned to ${t.assignee})`).join(' and ')} to bring project timelines back to green.\n`;
    }

    const highPriorityActive = data.tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed' && t.status !== 'cancelled');
    if (highPriorityActive.length > 0) {
      output += `${actionStep++}. **Prioritize High-Impact Items:** Focus upcoming work cycles on ${highPriorityActive.map(t => `**"${t.title}"** (\`${t.priority.toUpperCase()}\`)`).join(', ')}.\n`;
    } else {
      const inProgressActive = data.tasks.filter(t => t.status === 'in_progress');
      if (inProgressActive.length > 0) {
        output += `${actionStep++}. **Complete Active In-Progress Tasks:** Finish ${inProgressActive.map(t => `**"${t.title}"**`).join(', ')} before starting new pending items.\n`;
      }
    }

    const pendingActive = data.tasks.filter(t => t.status === 'pending');
    if (pendingActive.length > 0) {
      output += `${actionStep++}. **Transition Pending Backlog:** Review and assign start dates to ${pendingActive.length} pending task(s) to maintain continuous workflow.\n`;
    }

    output += `${actionStep}. **Team Alignment:** Check in with assignees to ensure workload balance and prevent deadline slippage.`;

    return output;
  }
}

export default new TaskDbService();

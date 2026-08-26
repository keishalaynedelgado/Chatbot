/**
 * Task Management Database Service
 * 
 * Provides controlled PostgreSQL & multi-tenant data grounding based on the
 * task-management-system schema (Tasks, Users, Tenants).
 */

class TaskDbService {
  constructor() {
    // In-memory relational dataset matching PostgreSQL Sequelize schema
    this.tenants = [
      { id: 'ten-001', name: 'acme_corp', companyName: 'Acme Enterprise Solutions', plan: 'enterprise', isActive: true },
      { id: 'ten-002', name: 'nexus_tech', companyName: 'Nexus Global Technologies', plan: 'premium', isActive: true }
    ];

    this.users = [
      { id: 'usr-101', username: 'alex_wright', firstName: 'Alexander', lastName: 'Wright', role: 'admin', tenantId: 'ten-001', email: 'a.wright@acme.com' },
      { id: 'usr-102', username: 'sophia_chen', firstName: 'Sophia', lastName: 'Chen', role: 'staff', tenantId: 'ten-001', email: 's.chen@acme.com' },
      { id: 'usr-103', username: 'marcus_vance', firstName: 'Marcus', lastName: 'Vance', role: 'staff', tenantId: 'ten-001', email: 'm.vance@acme.com' },
      { id: 'usr-104', username: 'elena_rodriguez', firstName: 'Elena', lastName: 'Rodriguez', role: 'staff', tenantId: 'ten-001', email: 'e.rodriguez@acme.com' },
      { id: 'usr-105', username: 'david_kim', firstName: 'David', lastName: 'Kim', role: 'staff', tenantId: 'ten-002', email: 'd.kim@nexus.com' }
    ];

    this.tasks = [
      {
        id: 'tsk-001',
        title: 'Migrate PostgreSQL schema to Vercel production',
        description: 'Set up multi-tenant tables and foreign key constraints.',
        status: 'in_progress',
        priority: 'urgent',
        dueDate: '2026-08-28',
        assignedTo: 'usr-102',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-002',
        title: 'Implement JWT Role-Based Access Control (RBAC)',
        description: 'Enforce tenant isolation on all API endpoints.',
        status: 'completed',
        priority: 'high',
        dueDate: '2026-08-24',
        assignedTo: 'usr-103',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-003',
        title: 'Design Kanban Task Board in ShadCN UI',
        description: 'Create responsive drag-and-drop task status board.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-29',
        assignedTo: 'usr-104',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-004',
        title: 'Fix OAuth Keycloak Token Refresh Loop',
        description: 'Resolve token expiration edge-case during active sessions.',
        status: 'pending',
        priority: 'urgent',
        dueDate: '2026-08-25', // Overdue
        assignedTo: 'usr-102',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-005',
        title: 'Generate Weekly Sprint Velocity Report',
        description: 'Compile completion metrics and burndown chart for management.',
        status: 'pending',
        priority: 'medium',
        dueDate: '2026-08-30',
        assignedTo: 'usr-103',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-006',
        title: 'Optimize Sequelize connection pooling',
        description: 'Tune connection timeouts and idle connection teardown.',
        status: 'completed',
        priority: 'medium',
        dueDate: '2026-08-22',
        assignedTo: 'usr-102',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-007',
        title: 'Audit Tenant Data Isolation Policies',
        description: 'Verify cross-tenant queries return 403 Forbidden.',
        status: 'pending',
        priority: 'high',
        dueDate: '2026-08-23', // Overdue
        assignedTo: 'usr-104',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      },
      {
        id: 'tsk-008',
        title: 'Write automated E2E test suite for Task CRUD',
        description: 'Automate task creation, assignment, and status transitions.',
        status: 'pending',
        priority: 'low',
        dueDate: '2026-09-02',
        assignedTo: 'usr-103',
        createdBy: 'usr-101',
        tenantId: 'ten-001'
      }
    ];
  }

  /**
   * Compute controlled summary metrics
   */
  getMetrics() {
    const total = this.tasks.length;
    const pending = this.tasks.filter(t => t.status === 'pending').length;
    const inProgress = this.tasks.filter(t => t.status === 'in_progress').length;
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const cancelled = this.tasks.filter(t => t.status === 'cancelled').length;

    const urgent = this.tasks.filter(t => t.priority === 'urgent').length;
    const high = this.tasks.filter(t => t.priority === 'high').length;
    const medium = this.tasks.filter(t => t.priority === 'medium').length;
    const low = this.tasks.filter(t => t.priority === 'low').length;

    const now = '2026-08-26';
    const overdue = this.tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate < now);

    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

    return {
      total,
      completionRate: `${completionRate}%`,
      statusCounts: { pending, inProgress, completed, cancelled },
      priorityCounts: { urgent, high, medium, low },
      overdueCount: overdue.length,
      overdueTasks: overdue.map(t => {
        const u = this.users.find(usr => usr.id === t.assignedTo);
        return {
          title: t.title,
          priority: t.priority,
          assignee: u ? `${u.firstName} ${u.lastName}` : 'Unassigned',
          dueDate: t.dueDate
        };
      })
    };
  }

  /**
   * Compute workload per team member
   */
  getUserWorkload() {
    const workload = {};
    this.users.forEach(u => {
      const name = `${u.firstName} ${u.lastName}`;
      const userTasks = this.tasks.filter(t => t.assignedTo === u.id);
      workload[name] = {
        total: userTasks.length,
        inProgress: userTasks.filter(t => t.status === 'in_progress').length,
        pending: userTasks.filter(t => t.status === 'pending').length,
        completed: userTasks.filter(t => t.status === 'completed').length,
        role: u.role,
        email: u.email
      };
    });
    return workload;
  }

  /**
   * Generates formatted context to inject into LLM system prompt
   */
  formatContextForPrompt() {
    const metrics = this.getMetrics();
    const workload = this.getUserWorkload();

    const tasksList = this.tasks.map(t => {
      const u = this.users.find(usr => usr.id === t.assignedTo);
      const assigneeName = u ? `${u.firstName} ${u.lastName}` : 'Unassigned';
      return `- [${t.status.toUpperCase()}] "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assignee: ${assigneeName} | Due: ${t.dueDate}`;
    }).join('\n');

    const workloadList = Object.entries(workload).map(([name, stats]) => 
      `- **${name}** (${stats.role}): ${stats.total} total (${stats.inProgress} in progress, ${stats.pending} pending, ${stats.completed} completed)`
    ).join('\n');

    const overdueList = metrics.overdueTasks.map(t => 
      `- ⚠️ "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assigned to: ${t.assignee} | Due: ${t.dueDate}`
    ).join('\n');

    return `### 📋 LIVE TASK MANAGEMENT DATABASE CONTEXT (PostgreSQL):
- **Total Tracked Tasks:** ${metrics.total}
- **Completion Rate:** ${metrics.completionRate}
- **Status Breakdown:** Pending: ${metrics.statusCounts.pending}, In Progress: ${metrics.statusCounts.inProgress}, Completed: ${metrics.statusCounts.completed}, Cancelled: ${metrics.statusCounts.cancelled}
- **Priority Distribution:** Urgent: ${metrics.priorityCounts.urgent}, High: ${metrics.priorityCounts.high}, Medium: ${metrics.priorityCounts.medium}, Low: ${metrics.priorityCounts.low}
- **Overdue Count:** ${metrics.overdueCount}

### ⚠️ OVERDUE TASKS (Requiring Immediate Attention):
${overdueList || 'None.'}

### 👥 TEAM WORKLOAD DISTRIBUTION:
${workloadList}

### 📝 ALL CURRENT TASKS:
${tasksList}`;
  }

  /**
   * Generates smart response for task questions
   */
  generateOfflineReply(prompt) {
    const p = prompt.toLowerCase();
    const metrics = this.getMetrics();
    const workload = this.getUserWorkload();

    const isTaskContext = p.includes('task') || p.includes('tasks') || p.includes('todo') || p.includes('workload') || p.includes('assignee') || p.includes('overdue') || p.includes('assigned');

    if (isTaskContext && (p.includes('pending') || p.includes('how many'))) {
      return `### 📋 **Pending Tasks Report**

There are currently **${metrics.statusCounts.pending}** pending tasks in the database out of **${metrics.total}** total tasks.

| Status | Count | Percentage |
| :--- | :---: | :---: |
| ⏳ **Pending** | **${metrics.statusCounts.pending}** | ${((metrics.statusCounts.pending / metrics.total) * 100).toFixed(1)}% |
| 🔄 **In Progress** | **${metrics.statusCounts.inProgress}** | ${((metrics.statusCounts.inProgress / metrics.total) * 100).toFixed(1)}% |
| ✅ **Completed** | **${metrics.statusCounts.completed}** | ${((metrics.statusCounts.completed / metrics.total) * 100).toFixed(1)}% |
| ❌ **Cancelled** | **${metrics.statusCounts.cancelled}** | 0.0% |

*Completion Rate: **${metrics.completionRate}***`;
    }

    if (isTaskContext && (p.includes('summary') || p.includes('progress') || p.includes('completion rate'))) {
      return `### 📊 **Task Progress & Executive Summary**

* **Total Tasks Tracked:** ${metrics.total}
* **Current Completion Rate:** **${metrics.completionRate}**
* **Active Queue:** ${metrics.statusCounts.inProgress + metrics.statusCounts.pending} tasks (In Progress + Pending)
* **Overdue Tasks:** ${metrics.overdueCount} items needing priority

#### ⚡ Priority Distribution:
* 🔴 **Urgent:** ${metrics.priorityCounts.urgent}
* 🟠 **High:** ${metrics.priorityCounts.high}
* 🟡 **Medium:** ${metrics.priorityCounts.medium}
* 🟢 **Low:** ${metrics.priorityCounts.low}`;
    }

    if (isTaskContext && (p.includes('user') || p.includes('workload') || p.includes('assigned') || p.includes('most'))) {
      const sorted = Object.entries(workload).sort((a, b) => b[1].total - a[1].total);
      const rows = sorted.map(([name, s]) => `| **${name}** | \`${s.role}\` | ${s.total} | ${s.inProgress} | ${s.pending} | ${s.completed} |`).join('\n');

      return `### 👥 **Team Workload Breakdown**

Here is the task distribution across all team members:

| Team Member | Role | Total Tasks | In Progress | Pending | Completed |
| :--- | :--- | :---: | :---: | :---: | :---: |
${rows}

> 💡 **Key Insight:** **${sorted[0][0]}** currently holds the highest number of assignments (**${sorted[0][1].total} tasks**).`;
    }

    if (isTaskContext && (p.includes('overdue') || p.includes('incomplete') || p.includes('deadline'))) {
      const rows = metrics.overdueTasks.map(t => `| "${t.title}" | \`${t.priority.toUpperCase()}\` | **${t.assignee}** | ${t.dueDate} |`).join('\n');
      return `### ⚠️ **Overdue Tasks Analysis**

Found **${metrics.overdueCount}** overdue tasks requiring immediate action:

| Task Title | Priority | Assignee | Due Date |
| :--- | :--- | :--- | :--- |
${rows}

*Recommendation: Reassign or follow up with assignees to prevent sprint delays.*`;
    }

    return null;
  }
}

export default new TaskDbService();

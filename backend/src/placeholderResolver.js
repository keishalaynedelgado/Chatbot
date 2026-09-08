/**
 * Placeholder normalization and DB-value resolution.
 *
 * Converts a raw "{Full Name}" / "{full_name}" / "{FULL NAME}" style
 * placeholder into a canonical key, then resolves that key against a
 * { user, tenant, tasks, task } context pulled from the Task Management
 * System database — `tasks` is every task assigned to the person (for
 * aggregate placeholders like {assigned tasks}), `task` is the one
 * specific task the request resolved through, if any (for singular
 * placeholders like {title}/{description}/{status}/{deadline} that refer
 * to a particular task rather than the person's whole workload). Anything
 * with no reasonable mapping resolves to 'N/A' rather than being invented.
 */

const NOT_AVAILABLE = 'N/A';

/**
 * Formats a task status enum value ("in_progress") into a display label
 * ("In Progress").
 */
function formatTaskStatus(status) {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Strips braces/underscores/whitespace/case so equivalent placeholder
 * spellings collapse to the same canonical key, e.g.
 * "{Full Name}", "{full_name}", "{FULL NAME}", "{ employee name }"
 * all become "full name".
 */
function normalize(rawPlaceholder) {
  return rawPlaceholder
    .replace(/[{}]/g, '')
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Each entry: canonical synonyms (already normalized, space-separated) -> resolver(context)
// context = { user, tenant, tasks }
const FIELD_RESOLVERS = [
  {
    synonyms: ['full name', 'fullname', 'employee name', 'name', 'staff name', 'person name'],
    resolve: ({ user }) => (user ? `${user.firstName} ${user.lastName}`.trim() : null)
  },
  {
    synonyms: ['first name', 'firstname'],
    resolve: ({ user }) => user?.firstName || null
  },
  {
    synonyms: ['last name', 'lastname'],
    resolve: ({ user }) => user?.lastName || null
  },
  {
    synonyms: ['username', 'user name', 'login'],
    resolve: ({ user }) => user?.username || null
  },
  {
    synonyms: ['email', 'email address', 'e mail'],
    resolve: ({ user }) => user?.email || null
  },
  {
    synonyms: ['position', 'role', 'job title'],
    resolve: ({ user }) => (user?.role ? capitalize(user.role.replace(/_/g, ' ')) : null)
  },
  {
    // A bare "title" refers to the resolved TASK's title, not the
    // person's job title — only available when the request resolved to
    // (or the person unambiguously has) one specific task.
    synonyms: ['title', 'task title', 'task name'],
    resolve: ({ task }) => task?.title || null
  },
  {
    synonyms: ['description', 'details', 'task description'],
    resolve: ({ task }) => task?.description || null
  },
  {
    synonyms: ['assignee', 'assigned to'],
    resolve: ({ user }) => (user ? `${user.firstName} ${user.lastName}`.trim() : null)
  },
  {
    // This schema has no literal "department"/"project" entity — the
    // closest real, non-invented data is the user's tenant (company/org).
    synonyms: [
      'department', 'dept', 'company', 'company name', 'organization',
      'organisation', 'project', 'project name', 'workspace', 'tenant', 'tenant name'
    ],
    resolve: ({ tenant }) => tenant?.companyName || tenant?.name || null
  },
  {
    // If a specific task is in context (resolved via task lookup, or the
    // person has exactly one task), "status" means that task's status.
    // Otherwise it falls back to the person's account status.
    synonyms: ['status', 'active', 'account status', 'employee status'],
    resolve: ({ task, user }) => {
      if (task?.status) return formatTaskStatus(task.status);
      return user ? (user.isActive ? 'Active' : 'Inactive') : null;
    }
  },
  {
    synonyms: ['assigned tasks', 'tasks', 'task list', 'my tasks'],
    resolve: ({ tasks }) => {
      if (!tasks || tasks.length === 0) return 'No assigned tasks';
      return tasks.map((t) => `• ${t.title}`).join('\n');
    }
  },
  {
    synonyms: ['task status', 'task summary', 'progress', 'task progress'],
    resolve: ({ tasks }) => {
      if (!tasks || tasks.length === 0) return 'No tasks assigned';
      const counts = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      const parts = [];
      if (counts.pending) parts.push(`${counts.pending} pending`);
      if (counts.in_progress) parts.push(`${counts.in_progress} in progress`);
      if (counts.completed) parts.push(`${counts.completed} completed`);
      if (counts.cancelled) parts.push(`${counts.cancelled} cancelled`);
      return parts.join(', ') || 'No tasks assigned';
    }
  },
  {
    // Bare numeric counts per status, e.g. {completed tasks} -> "12"
    // (distinct from {task status} above, which gives the full breakdown).
    synonyms: [
      'completed tasks', 'number of completed tasks', 'completed task count',
      'tasks completed', 'total completed', 'completed count', 'completed', 'complete'
    ],
    resolve: ({ tasks }) => String((tasks || []).filter((t) => t.status === 'completed').length)
  },
  {
    synonyms: [
      'pending tasks', 'number of pending tasks', 'pending task count',
      'tasks pending', 'total pending', 'pending count', 'pending'
    ],
    resolve: ({ tasks }) => String((tasks || []).filter((t) => t.status === 'pending').length)
  },
  {
    synonyms: [
      'in progress tasks', 'number of in progress tasks', 'in progress task count',
      'tasks in progress', 'total in progress', 'in progress count', 'in progress'
    ],
    resolve: ({ tasks }) => String((tasks || []).filter((t) => t.status === 'in_progress').length)
  },
  {
    synonyms: [
      'cancelled tasks', 'number of cancelled tasks', 'cancelled task count',
      'tasks cancelled', 'total cancelled', 'cancelled count', 'cancelled'
    ],
    resolve: ({ tasks }) => String((tasks || []).filter((t) => t.status === 'cancelled').length)
  },
  {
    synonyms: [
      'total tasks', 'number of tasks', 'task count', 'total task count', 'tasks count'
    ],
    resolve: ({ tasks }) => String((tasks || []).length)
  },
  {
    synonyms: [
      'overdue tasks', 'number of overdue tasks', 'overdue task count',
      'tasks overdue', 'total overdue', 'overdue count', 'overdue'
    ],
    resolve: ({ tasks }) => {
      const now = new Date();
      const overdue = (tasks || []).filter((t) =>
        t.dueDate && t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.dueDate) < now
      );
      return String(overdue.length);
    }
  },
  {
    synonyms: ['deadline', 'due date', 'next deadline', 'upcoming deadline'],
    resolve: ({ task, tasks }) => {
      // A specific resolved task's due date takes priority over the
      // aggregate "nearest upcoming deadline across all tasks" fallback.
      if (task) {
        return task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : 'No deadline';
      }

      if (!tasks || tasks.length === 0) return 'No upcoming deadlines';
      const now = new Date();
      const upcoming = tasks
        .filter((t) => t.dueDate && t.status !== 'completed' && t.status !== 'cancelled' && new Date(t.dueDate) >= now)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      if (upcoming.length === 0) return 'No upcoming deadlines';
      return new Date(upcoming[0].dueDate).toISOString().split('T')[0];
    }
  },
  {
    synonyms: ['priority'],
    resolve: ({ tasks }) => {
      if (!tasks || tasks.length === 0) return null;
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      const active = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');
      if (active.length === 0) return null;
      const top = [...active].sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))[0];
      return capitalize(top.priority);
    }
  },
  {
    synonyms: ['tags'],
    resolve: ({ tasks }) => {
      if (!tasks || tasks.length === 0) return null;
      const allTags = new Set();
      tasks.forEach((t) => (t.tags || []).forEach((tag) => allTags.add(tag)));
      return allTags.size > 0 ? [...allTags].join(', ') : null;
    }
  }
];

function capitalize(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Resolves a single raw placeholder (e.g. "{Full Name}") to its display
 * value given a { user, tenant, tasks } context. Never invents data —
 * falls back to 'N/A' when nothing matches or the matched field is empty.
 */
function resolvePlaceholder(rawPlaceholder, context) {
  const key = normalize(rawPlaceholder);

  for (const entry of FIELD_RESOLVERS) {
    if (entry.synonyms.includes(key)) {
      const value = entry.resolve(context);
      return value === null || value === undefined || value === '' ? NOT_AVAILABLE : String(value);
    }
  }

  return NOT_AVAILABLE;
}

export { normalize, resolvePlaceholder, NOT_AVAILABLE };

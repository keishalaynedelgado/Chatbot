/**
 * Strict department/category filtering for task-related chat responses.
 *
 * Categories here are task TAGS (PostgreSQL `tasks.tags`), e.g.
 * "Operations", "DevOps". When a user's message names one of these
 * categories, the task context section gets replaced with a version
 * containing ONLY matching records — never the full unfiltered list —
 * so the AI physically cannot mix in another department's data, rather
 * than just being asked nicely not to.
 */

import { Task, User, Tenant } from './models/index.js';

// Real values observed in the current dataset, PLUS a few plausible
// department names (HR) that no task happens to be tagged with yet.
// Recognizing them here — even with zero current matches — is what
// makes "give me the HR task list" correctly answer "no HR tasks were
// found" (a strict, honest empty result) instead of silently falling
// through to the unfiltered list because the name wasn't recognized at
// all. If new tags are added to the data, add them here too.
const KNOWN_TASK_TAGS = [
  'AI Integration', 'Analytics', 'Audit', 'Backend', 'Bugs', 'Compliance',
  'Database', 'Design', 'DevOps', 'Engineering', 'Finance', 'Frontend',
  'HR', 'Infrastructure', 'Management', 'Marketing', 'Operations',
  'Quality Assurance', 'Security', 'Support', 'Testing', 'UI/UX',
];

// Common abbreviations/casual phrasings that should resolve to the real
// category name above, since users won't always type the exact string
// (e.g. "ops" instead of "Operations").
const TASK_TAG_ALIASES = {
  'ops': 'Operations',
  'devops': 'DevOps',
  'dev ops': 'DevOps',
  'qa': 'Quality Assurance',
  'infra': 'Infrastructure',
  'eng': 'Engineering',
  'sec': 'Security',
  'ux': 'UI/UX',
  'ui': 'UI/UX',
  // Bare "AI" and "IT" are NOT included — both collide with extremely
  // common English usage ("the AI said...", "is it working?") in a way
  // that would misfire on completely unrelated messages. Only match
  // them as part of an unambiguous multi-word phrase instead.
  'ai integration': 'AI Integration',
  'it department': 'IT',
  'it team': 'IT',
  'it tasks': 'IT',
  'it task list': 'IT',
};

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds the first known category (or alias of one) mentioned in `text`,
 * matching whole words/phrases (case-insensitive). Longer names are
 * checked first so "Quality Assurance" isn't shadowed by a shorter
 * partial match, and so multi-word aliases beat single-word ones.
 */
function findMention(text, knownCategories, aliases = {}) {
  const candidates = [
    ...knownCategories.map((name) => ({ match: name, resolved: name })),
    ...Object.entries(aliases).map(([alias, resolved]) => ({ match: alias, resolved })),
  ].sort((a, b) => b.match.length - a.match.length);

  for (const { match, resolved } of candidates) {
    const re = new RegExp(`\\b${escapeRegex(match)}\\b`, 'i');
    if (re.test(text)) return resolved;
  }
  return null;
}

function extractTaskTagMention(text) {
  return findMention(text, KNOWN_TASK_TAGS, TASK_TAG_ALIASES);
}

/**
 * Fetches only tasks tagged with `tag` (case-insensitive), directly from
 * the database — not filtered client-side from a larger already-fetched
 * list, so this is a real, independent query.
 */
async function getTasksForTag(tag) {
  const allTasks = await Task.findAll({
    include: [
      { model: User, as: 'assignee', attributes: ['firstName', 'lastName'] },
      { model: Tenant, as: 'tenant', attributes: ['name', 'companyName'] },
    ],
    order: [['createdAt', 'DESC']],
  });
  const lowerTag = tag.toLowerCase();
  return allTasks.filter((t) => (t.tags || []).some((x) => x.toLowerCase() === lowerTag));
}

/**
 * Builds a system-prompt context block containing ONLY tasks tagged
 * `tag`, with an explicit instruction not to pull from any other
 * category — meant to REPLACE the general unfiltered task context, not
 * supplement it.
 */
function formatTaskTagContext(tag, tasks) {
  if (tasks.length === 0) {
    return `### "${tag}" TASKS ONLY (STRICT FILTER APPLIED)
No tasks are currently tagged "${tag}" in the database. Tell the user plainly that there are no "${tag}" tasks rather than showing tasks from any other category.`;
  }

  const list = tasks.map((t) => {
    const assignee = t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}`.trim() : 'Unassigned';
    const due = t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'No deadline';
    return `- [${t.status.toUpperCase()}] "${t.title}" | Priority: ${t.priority.toUpperCase()} | Assignee: ${assignee} | Due: ${due}`;
  }).join('\n');

  return `### "${tag}" TASKS ONLY (STRICT FILTER APPLIED — ${tasks.length} task${tasks.length === 1 ? '' : 's'}):
${list}

CRITICAL: The user specifically asked about "${tag}". Answer using ONLY the tasks listed above. Do NOT mention, reference, infer, or include tasks from any other tag/category/department, even if they exist in the database. If the user asks about something these ${tasks.length} task(s) don't cover, say that information isn't available for "${tag}" rather than pulling from other categories.`;
}

export {
  KNOWN_TASK_TAGS,
  extractTaskTagMention,
  getTasksForTag,
  formatTaskTagContext,
};

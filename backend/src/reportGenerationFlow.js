/**
 * AI Template Autofill — conversational orchestrator.
 *
 * Deterministic (non-LLM) flow: detects "fill a .pptx template with
 * someone's information" requests across the conversation, asks for
 * whatever is missing (template name / person), resolves the person
 * against the existing Task Management System database, fills the
 * template, and returns a reply with a download link.
 *
 * Returns null when the conversation isn't a template-fill request at
 * all, so the caller falls through to the normal AI/offline chat flow.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractPlaceholders, fillTemplate } from './pptxTemplater.js';
import { resolvePlaceholder } from './placeholderResolver.js';
import { findPeopleByName, findPersonById, getTasksForUser, findTasksByTitle } from './personLookup.js';
import { addChartSlide } from './pptxSlideBuilder.js';

// Matches Synthie AI's own brand palette where possible (in_progress uses
// the app's actual secondary indigo #4648d4, cancelled uses its actual
// error red #ba1a1a), so generated charts feel consistent with the rest
// of the product rather than using arbitrary flat-UI defaults.
const TASK_STATUS_CHART_COLORS = {
  pending: [240, 152, 63],
  in_progress: [70, 72, 212],
  completed: [52, 199, 123],
  cancelled: [186, 26, 26],
};
const TASK_STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, 'ppt-templates');
const GENERATED_DIR = path.join(__dirname, '..', 'generated-files');

// These two are prefixes, not exact messages, because the actual .pptx
// filenames found in TEMPLATES_DIR are appended after them (see
// formatTemplateChoices below) — the available templates must always be
// read from disk, never invented/renamed/shortened.
const ASK_TEMPLATE_PREFIX = 'Which template would you like me to use?';
const ASK_PERSON = 'Whose information should I use for the report?';
const ASK_TEMPLATE_AND_PERSON_PREFIX = 'Which template would you like me to use, and whose information should I use for the report?';
const NO_TEMPLATES_MESSAGE = 'I couldn\'t find any PPTX templates available. Please add a template file to the templates directory before requesting a report.';
const NOT_FOUND_PREFIX = 'I couldn\'t find anyone named';
const MULTIPLE_FOUND_PREFIX = 'I found multiple people named';
const MULTIPLE_TASK_ASSIGNEES_PREFIX = 'I found that task assigned to multiple people';

/**
 * Formats the actual .pptx filenames found in TEMPLATES_DIR as a
 * selectable list, appended after ASK_TEMPLATE_PREFIX /
 * ASK_TEMPLATE_AND_PERSON_PREFIX. Never fabricates a name — these are
 * exactly the strings returned by listTemplateFiles().
 */
function formatTemplateChoices(availableFiles) {
  return availableFiles.map((f) => `- ${f}`).join('\n');
}

const DOCUMENT_INTENT_PATTERN = /\bfill\b|\btemplate\b|\.pptx\b|\bgenerate\b[\s\S]{0,20}\b(report|document)\b|\binformation of\b|\binfo of\b|\bgive me\b[\s\S]{0,20}\binformation\b|\bcreate a (report|document)\b|\breport for\b/i;

async function listTemplateFiles() {
  try {
    const files = await fs.readdir(TEMPLATES_DIR);
    return files.filter((f) => f.toLowerCase().endsWith('.pptx'));
  } catch {
    return [];
  }
}

function findTemplateFile(templateName, availableFiles) {
  const normalized = templateName.trim().replace(/\.pptx$/i, '').toLowerCase();
  return availableFiles.find((f) => f.replace(/\.pptx$/i, '').toLowerCase() === normalized) || null;
}

function extractTemplateMention(text, availableFiles) {
  const pptxMatch = text.match(/([A-Za-z0-9_\-]+\.pptx)/i);
  if (pptxMatch) return pptxMatch[1].trim();

  // "using/with the Reports template" — the introducer word anchors
  // where the name starts, so the name itself can safely span multiple
  // words (e.g. a hypothetical "Quarterly Sales template").
  const introducedMatch = text.match(/\b(?:using|use|with)\s+(?:the\s+)?([A-Za-z0-9_\- ]+?)\s+template\b/i);
  if (introducedMatch) {
    const candidate = introducedMatch[1].trim();
    if (findTemplateFile(candidate, availableFiles)) return candidate;
  }

  // "<Name> template" anywhere in the text with no introducer word (e.g.
  // "Reports template for Keisha", or a bare reply "Reports template") —
  // deliberately restricted to a single word immediately before
  // "template" (no spaces in the capture group) so it can't sweep in
  // unrelated preceding words the way a multi-word capture could
  // without an introducer to anchor it.
  const bareTemplateWordMatch = text.match(/\b(?:the\s+)?([A-Za-z0-9_\-]+)\s+template\b/i);
  if (bareTemplateWordMatch) {
    const candidate = bareTemplateWordMatch[1].trim();
    if (findTemplateFile(candidate, availableFiles)) return candidate;
  }

  // Bare reply with no "template" word at all, e.g. just "Reports".
  const bare = text.replace(/^use\s+/i, '').replace(/[.!]+$/, '').trim();
  const matched = findTemplateFile(bare, availableFiles);
  return matched ? bare : null;
}

/**
 * Detects an explicitly-requested chart type ("as a pie chart", "line
 * graph please"). Bar stays the default whenever nothing is mentioned.
 */
function extractChartTypeMention(text) {
  if (/\bpie\s*(chart|graph)\b/i.test(text)) return 'pie';
  if (/\bline\s*(chart|graph)\b/i.test(text)) return 'line';
  if (/\bbar\s*(chart|graph)\b/i.test(text)) return 'bar';
  return null;
}

// Sentence-initial imperative verbs ("Generate John's report...") are
// capitalized just like names, so the possessive-name regex below can
// accidentally sweep one up as part of the captured chain — stripped
// off after matching rather than excluded from the regex itself, since
// that keeps the regex simple and this list easy to extend.
const LEADING_COMMAND_VERBS = new Set([
  'generate', 'create', 'make', 'build', 'produce', 'fill', 'show',
  'get', 'give', 'find', 'pull', 'draft', 'prepare', 'compile', 'write', 'send',
]);

function extractPersonMention(text) {
  const possessive = text.match(/([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,2})'s\b/);
  if (possessive) {
    const words = possessive[1].split(/\s+/);
    while (words.length > 1 && LEADING_COMMAND_VERBS.has(words[0].toLowerCase())) {
      words.shift();
    }
    return words.join(' ');
  }

  // Allows optional filler words between "for/of" and the name itself
  // ("of this user Keisha", "for the employee John Smith"), not just
  // the bare "for Keisha" / "of Keisha" form.
  const forOf = text.match(/\b(?:for|of)\s+(?:(?:this|the)\s+)?(?:(?:user|person|employee)\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/);
  if (forOf) return forOf[1];

  return null;
}

const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;

/**
 * Detects a raw database ID (UUID) mentioned directly, e.g. "Fill the
 * template for 6f57b8ff-9cce-4706-9144-18f89fee2a65" — the most explicit,
 * unambiguous way to identify a target record.
 */
function extractPersonIdMention(text) {
  const match = text.match(UUID_PATTERN);
  return match ? match[0] : null;
}

/**
 * Detects task-ownership phrasing ("assigned to <task>", "working on
 * <task>", "handling <task>", "responsible for <task>", "in charge of
 * <task>", "who is doing <task>"), so a person can be resolved via their
 * task instead of by name.
 */
const TASK_OWNERSHIP_PATTERN = /(?:assigned to|working on|handling|responsible for|in charge of|(?:who|whoever) is (?:doing|working on|handling)|for the task|task(?:ed)? with)\s+(?:this |that |the )?["'“]?([^"'”.!?]+)["'”]?/i;

function extractTaskAssignmentMention(text) {
  const match = text.match(TASK_OWNERSHIP_PATTERN);
  return match ? match[1].trim() : null;
}

/**
 * Cleans up a casual reply before using it as a person-name search query:
 * strips trailing punctuation, filler lead-ins ("I think it was...",
 * "maybe it's..."), and collapses internal whitespace (e.g. tabs from a
 * pasted table cell) into single spaces.
 */
function cleanPersonReply(text) {
  let t = text.trim().replace(/\s+/g, ' ');
  t = t.replace(/[?.!]+$/, '').trim();
  t = t.replace(/^(i think it('?s| was)|maybe it('?s| was)|it('?s| was)|i believe it('?s| was)|probably|perhaps|i guess)\s+/i, '').trim();
  return t;
}

// A real answer to "whose information should I use?" is normally short
// and name-shaped — a genuinely different question (e.g. "Actually, how
// many pending tasks are there?") reads nothing like that. Used to
// decide whether a reply mid-clarification should be treated as an
// answer at all, or should abandon the pending workflow instead of
// being misread as an unusual person name.
const QUESTION_STARTER_PATTERN = /^(?:actually,?\s*)?(how|what|who|when|where|why|which|show|list|give me|tell me|does|is|are|can|could|would|will)\b/i;

function looksLikeNewQuestion(text) {
  const t = text.trim();
  if (!t) return false;
  if (t.includes('?')) return true;
  return QUESTION_STARTER_PATTERN.test(t);
}

/**
 * Scans the full user-message history to accumulate template/person/task
 * mentions and whether this looks like a template-fill request at all.
 */
function scanConversation(messages, availableFiles) {
  let templateName = null;
  let personQuery = null;
  let taskQuery = null;
  let personId = null;
  let chartType = null;
  let documentIntent = false;

  const userMessages = messages.filter((m) => m.role === 'user' && typeof m.content === 'string');

  for (const m of userMessages) {
    const text = m.content.trim();
    if (!text) continue;

    if (DOCUMENT_INTENT_PATTERN.test(text)) documentIntent = true;

    const template = extractTemplateMention(text, availableFiles);
    if (template) templateName = template;

    const requestedChartType = extractChartTypeMention(text);
    if (requestedChartType) chartType = requestedChartType;

    // A raw ID is the most explicit, unambiguous way to name a target —
    // if present, it takes priority over name/task phrasing in this message.
    const id = extractPersonIdMention(text);
    if (id) {
      personId = id;
      continue;
    }

    // Task-ownership phrasing ("responsible for X", "assigned to X") takes
    // priority — extract it first so the generic "for X"/"of X" person
    // pattern below doesn't misfire on words from the task title itself
    // (e.g. "responsible for SSL Certificate..." matching "for SSL Certificate").
    const task = extractTaskAssignmentMention(text);
    if (task) taskQuery = task;

    if (!task) {
      const person = extractPersonMention(text);
      if (person) personQuery = person;
    }
  }

  return { documentIntent, templateName, personQuery, taskQuery, personId, chartType };
}

/**
 * True when `text` is one of the Template Autofill flow's own pending-
 * clarification messages (asking for a template/person, or asking the
 * user to disambiguate/retry) — i.e. the bot is actively mid-exchange
 * and waiting on a specific answer, as opposed to having just given a
 * normal answer or a completed download link.
 */
function isTemplateFlowQuestion(text) {
  return (
    text.startsWith(ASK_TEMPLATE_AND_PERSON_PREFIX) ||
    text.startsWith(ASK_TEMPLATE_PREFIX) ||
    text === ASK_PERSON ||
    text.startsWith(MULTIPLE_FOUND_PREFIX) ||
    text.startsWith(NOT_FOUND_PREFIX) ||
    text.startsWith(MULTIPLE_TASK_ASSIGNEES_PREFIX)
  );
}

/**
 * Walks backward from the end of the conversation, collecting messages
 * that belong to the current, still-open Template Autofill exchange.
 * Stops as soon as it hits an assistant message that ISN'T one of this
 * flow's own pending-clarification questions — e.g. a completed
 * "Your report is ready" reply, or an unrelated normal answer — since
 * that marks the boundary where any earlier template/person mentions
 * are stale and must not leak into a later, unrelated request. This is
 * what makes a completed (or abandoned) workflow "reset": nothing
 * before that boundary is ever scanned again.
 */
function collectActiveExchangeMessages(messages) {
  const active = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'user') {
      active.unshift(m);
    } else if (m.role === 'assistant') {
      if (isTemplateFlowQuestion((m.content || '').trim())) {
        active.unshift(m);
      } else {
        break;
      }
    }
  }
  return active;
}

function lastAssistantMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') return (messages[i].content || '').trim();
  }
  return '';
}

function lastUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return (messages[i].content || '').trim();
  }
  return '';
}

function formatCandidateList(candidates) {
  return candidates
    .map((c, i) => `${i + 1}. **${c.firstName} ${c.lastName}** (${c.username}) — ${c.tenant?.companyName || c.tenant?.name || 'No organization'}`)
    .join('\n');
}

/**
 * Resolves a person via a task title. Returns { person } on success, or
 * { response } with a message to return as-is (ask/error/disambiguation).
 */
async function resolvePersonByTask(taskQuery) {
  let matchingTasks;
  try {
    matchingTasks = await findTasksByTitle(taskQuery);
  } catch (err) {
    console.error('[ReportGenerationFlow] Database lookup failed:', err.message);
    return { response: `I couldn't reach the Task Management System database right now, so I can't generate that report. Please try again shortly.` };
  }

  if (matchingTasks.length === 0) {
    return { response: null };
  }

  const withAssignee = matchingTasks.filter((t) => t.assignee);
  if (withAssignee.length === 0) {
    return { response: `I found "${matchingTasks[0].title}", but it isn't assigned to anyone yet.` };
  }

  const uniqueAssignees = [...new Map(withAssignee.map((t) => [t.assignee.id, t.assignee])).values()];
  if (uniqueAssignees.length > 1) {
    return { response: `${MULTIPLE_TASK_ASSIGNEES_PREFIX} for "${taskQuery}". Which one did you mean?\n\n${formatCandidateList(uniqueAssignees)}` };
  }

  const person = uniqueAssignees[0];
  const task = withAssignee.find((t) => t.assignee.id === person.id);
  return { person, task };
}

const LINE_CHART_COLOR = [70, 72, 212];

/**
 * Buckets active (non-completed/cancelled) tasks by the week their due
 * date falls in, for the next `weeks` weeks starting today. Real,
 * deterministic data derived from actual due dates — never invented.
 */
function computeWeeklyDueCounts(tasks, weeks = 6) {
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const categories = [];
  const values = [];

  for (let w = 0; w < weeks; w++) {
    const rangeStart = new Date(weekStart);
    rangeStart.setDate(rangeStart.getDate() + w * 7);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + 7);

    const count = (tasks || []).filter((t) => {
      if (!t.dueDate || t.status === 'completed' || t.status === 'cancelled') return false;
      const due = new Date(t.dueDate);
      return due >= rangeStart && due < rangeEnd;
    }).length;

    categories.push(w === 0 ? 'This Wk' : `Wk +${w}`);
    values.push(count);
  }

  return { categories, values };
}

/**
 * Adds a task-data chart slide to the pptx — bar or pie show the status
 * breakdown (pending/in progress/completed/cancelled); line shows active
 * tasks due per week for the next 6 weeks. If the person has zero tasks
 * at all, uses clearly labeled illustrative example numbers instead (per
 * spec: never invent data as if real, but still show what the output
 * would look like).
 */
async function addTaskStatusChartSlide(zip, person, tasks, chartType = 'bar') {
  const hasRealData = tasks && tasks.length > 0;

  let categories;
  let values;
  let colors;
  let title;

  if (chartType === 'line') {
    if (hasRealData) {
      ({ categories, values } = computeWeeklyDueCounts(tasks));
    } else {
      categories = ['This Wk', 'Wk +1', 'Wk +2', 'Wk +3', 'Wk +4', 'Wk +5'];
      values = [2, 1, 3, 0, 2, 1];
    }
    colors = values.map(() => LINE_CHART_COLOR);
    title = `${person.firstName} ${person.lastName} — Tasks Due Per Week`;
  } else {
    const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    const counts = hasRealData
      ? statuses.reduce((acc, s) => {
          acc[s] = tasks.filter((t) => t.status === s).length;
          return acc;
        }, {})
      : { pending: 3, in_progress: 2, completed: 5, cancelled: 1 };

    categories = statuses.map((s) => TASK_STATUS_LABELS[s]);
    values = statuses.map((s) => counts[s]);
    colors = statuses.map((s) => TASK_STATUS_CHART_COLORS[s]);
    title = `${person.firstName} ${person.lastName} — Task Status Breakdown`;
  }

  try {
    await addChartSlide(zip, {
      title,
      categories,
      values,
      colors,
      isExampleData: !hasRealData,
      chartType,
    });
  } catch (err) {
    // A chart slide is a bonus, not a requirement — if this template's
    // structure doesn't support adding a slide, don't fail the whole
    // document generation over it.
    console.warn('[ReportGenerationFlow] Could not add chart slide:', err.message);
  }
}

async function generateFilledFile(templateFile, person, tasks, tenant, task, chartType = 'bar') {
  const templatePath = path.join(TEMPLATES_DIR, templateFile);
  const buffer = await fs.readFile(templatePath);

  const context = { user: person, tasks, tenant, task };
  const resolveValue = (rawPlaceholder) => resolvePlaceholder(rawPlaceholder, context);

  const filledBuffer = await fillTemplate(buffer, resolveValue, (zip) => addTaskStatusChartSlide(zip, person, tasks, chartType));

  await fs.mkdir(GENERATED_DIR, { recursive: true });

  const baseName = templateFile.replace(/\.pptx$/i, '');
  const safePersonName = person.firstName.replace(/[^A-Za-z0-9]/g, '') || 'Person';
  let outputName = `${baseName}_${safePersonName}.pptx`;
  let outputPath = path.join(GENERATED_DIR, outputName);

  // Avoid clobbering a previous generation for the same template+person
  let counter = 2;
  while (await fs.access(outputPath).then(() => true).catch(() => false)) {
    outputName = `${baseName}_${safePersonName}_${counter}.pptx`;
    outputPath = path.join(GENERATED_DIR, outputName);
    counter++;
  }

  await fs.writeFile(outputPath, filledBuffer);

  // Validate the generated file is a well-formed, openable pptx
  await extractPlaceholders(filledBuffer);

  return outputName;
}

/**
 * Main entry point. Returns a reply string if this conversation is a
 * template-fill request (in any state: needs more info, error, or a
 * completed download), or null if it isn't one at all.
 */
async function handle(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null;

  const availableFiles = await listTemplateFiles();
  const prevAssistant = lastAssistantMessage(messages);
  const lastUser = lastUserMessage(messages);

  // Every new message is (re-)evaluated independently: this flow only
  // engages when EITHER (a) the bot is actively mid-exchange, waiting on
  // a specific answer it just asked for, or (b) the LATEST message alone
  // — not any older history — shows fresh template-request intent. A
  // stale document-intent mention from an already-completed or abandoned
  // workflow can never resurrect this flow on its own; otherwise an
  // unrelated later question (e.g. a database query) would incorrectly
  // get hijacked back into "whose information should I use?".
  const isPendingClarification = isTemplateFlowQuestion(prevAssistant);
  const hasFreshIntent =
    DOCUMENT_INTENT_PATTERN.test(lastUser) ||
    Boolean(extractTemplateMention(lastUser, availableFiles)) ||
    Boolean(extractPersonMention(lastUser)) ||
    Boolean(extractPersonIdMention(lastUser)) ||
    Boolean(extractTaskAssignmentMention(lastUser));

  // A reply mid-clarification that reads like an entirely different
  // question (not just an unusual name) abandons the pending workflow
  // rather than being misinterpreted as an answer to it — unless it
  // ALSO carries fresh template intent (e.g. "Actually, fill Reports
  // for John instead"), which restarts the flow rather than abandoning it.
  const abandonsPendingClarification =
    isPendingClarification && !hasFreshIntent && looksLikeNewQuestion(lastUser);

  if ((!isPendingClarification && !hasFreshIntent) || abandonsPendingClarification) return null;

  const stillPending = isPendingClarification && !abandonsPendingClarification;

  // Only scan the current, still-open exchange (or just the latest
  // message for a brand-new request) — never the whole conversation
  // history — so mentions from a completed/abandoned workflow can't
  // leak into a new one.
  const scanWindow = stillPending
    ? collectActiveExchangeMessages(messages)
    : [{ role: 'user', content: lastUser }];
  const { templateName, personQuery, taskQuery, personId, chartType } = scanConversation(scanWindow, availableFiles);

  // If we just asked "whose information", asked to disambiguate, or said
  // we couldn't find that name, treat this reply as an amended person
  // answer even if it doesn't match our name-mention regexes.
  const isAwaitingPersonReply = stillPending;

  let effectivePersonQuery = personQuery;
  if (isAwaitingPersonReply && lastUser && !extractTemplateMention(lastUser, availableFiles)) {
    effectivePersonQuery = cleanPersonReply(lastUser);
  }

  // Check completeness before asking anything, so multiple genuinely
  // missing fields are batched into ONE follow-up question rather than
  // asking for the template, waiting a full turn, then asking for the
  // person too. A person signal (ID, name, or task) already present
  // means person info isn't missing, even before DB resolution runs.
  const personInfoMissing = !personId && !effectivePersonQuery && !taskQuery;

  if (!templateName) {
    if (availableFiles.length === 0) {
      return NO_TEMPLATES_MESSAGE;
    }

    // Exactly one template exists — use it automatically instead of
    // asking the user to choose from a list of one.
    if (availableFiles.length === 1) {
      templateName = availableFiles[0];
    } else if (personInfoMissing) {
      return `${ASK_TEMPLATE_AND_PERSON_PREFIX}\n\n${formatTemplateChoices(availableFiles)}`;
    } else {
      return `${ASK_TEMPLATE_PREFIX}\n\n${formatTemplateChoices(availableFiles)}`;
    }
  }

  const templateFile = findTemplateFile(templateName, availableFiles);
  if (!templateFile) {
    if (availableFiles.length === 0) {
      return `I couldn't find a template named "${templateName}", and no templates are currently available.`;
    }
    return `I couldn't find a template named "${templateName}". Available templates:\n\n${availableFiles.map((f) => `- ${f}`).join('\n')}`;
  }

  // Resolve the person: an explicit database ID is most unambiguous and
  // takes priority; then an explicit name; then "the one assigned to <task>".
  // `resolvedTask`, if set, is the one specific task the request resolved
  // through — used for singular placeholders like {title}/{description}.
  let person = null;
  let resolvedTask = null;

  if (personId) {
    try {
      person = await findPersonById(personId);
    } catch (err) {
      console.error('[ReportGenerationFlow] Database lookup failed:', err.message);
      return `I couldn't reach the Task Management System database right now, so I can't generate that report. Please try again shortly.`;
    }

    if (!person) {
      return `I couldn't find a database record with ID "${personId}". Please double-check the ID.`;
    }
  }

  if (!person && !effectivePersonQuery && taskQuery) {
    const result = await resolvePersonByTask(taskQuery);
    if (result.person) {
      person = result.person;
      resolvedTask = result.task;
    } else if (result.response) {
      return result.response;
    } else {
      return `I couldn't find a task matching "${taskQuery}" in the database. Please check the task name and try again.`;
    }
  }

  if (!person) {
    if (!effectivePersonQuery) {
      return ASK_PERSON;
    }

    let candidates;
    try {
      candidates = await findPeopleByName(effectivePersonQuery);
    } catch (err) {
      console.error('[ReportGenerationFlow] Database lookup failed:', err.message);
      return `I couldn't reach the Task Management System database right now, so I can't generate that report. Please try again shortly.`;
    }

    if (candidates.length === 0) {
      // The "name" might actually be a task title (e.g. "for Server Capacity
      // Planning" gets misread as a person name) — try that before giving up.
      const taskFallback = await resolvePersonByTask(effectivePersonQuery);
      if (taskFallback.person) {
        person = taskFallback.person;
        resolvedTask = taskFallback.task;
      } else if (taskFallback.response) {
        return taskFallback.response;
      } else {
        return `${NOT_FOUND_PREFIX} "${effectivePersonQuery}" in the database. Please check the name and try again.`;
      }
    } else if (candidates.length > 1) {
      return `${MULTIPLE_FOUND_PREFIX} "${effectivePersonQuery}". Which one would you like me to use?\n\n${formatCandidateList(candidates)}`;
    } else {
      person = candidates[0];
    }
  }

  try {
    const tasks = await getTasksForUser(person.id);
    // If resolution didn't already pin down one specific task, but the
    // person only has exactly one task total, that's still unambiguous.
    const singleTask = resolvedTask || (tasks.length === 1 ? tasks[0] : null);
    const outputName = await generateFilledFile(templateFile, person, tasks, person.tenant, singleTask, chartType || 'bar');

    return `Your completed report is ready.\n\n**[Download ${outputName}](/generated-files/${encodeURIComponent(outputName)})**`;
  } catch (err) {
    console.error('[ReportGenerationFlow] Template generation failed:', err.message);
    return `I found ${person.firstName} ${person.lastName}'s information, but something went wrong while generating "${templateFile}". Please try again.`;
  }
}

export { handle };

/**
 * Looks up people and their task data in the existing Task Management
 * System PostgreSQL database (same DB/tables used by taskdb-service.js).
 */

import { Op } from 'sequelize';
import { User, Task, Tenant } from './models/index.js';

/**
 * Finds users matching a name query. Matches across the full name
 * ("firstName lastName"), username, and email combined — so a
 * multi-word query like "Brailey Delgado" correctly matches a user
 * whose first name and last name are in separate DB columns, not just
 * a single-column substring match.
 */
async function findPeopleByName(query) {
  const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!normalizedQuery) return [];

  const words = normalizedQuery.split(' ').filter(Boolean);

  const allUsers = await User.findAll({
    include: [{ model: Tenant, as: 'tenant' }]
  });

  return allUsers.filter((u) => {
    const searchable = `${u.firstName} ${u.lastName} ${u.username} ${u.email}`.toLowerCase();
    return words.every((w) => searchable.includes(w));
  });
}

/**
 * Fetches a single user directly by primary key (UUID). Returns null if
 * no such record exists — never guesses.
 */
async function findPersonById(id) {
  return User.findByPk(id, { include: [{ model: Tenant, as: 'tenant' }] });
}

/**
 * Fetches all tasks assigned to a given user id.
 */
async function getTasksForUser(userId) {
  return Task.findAll({
    where: { assignedTo: userId },
    order: [['createdAt', 'DESC']]
  });
}

/**
 * Finds tasks whose title contains the given query (case-insensitive),
 * including their assignee, so a person can be resolved by "the one
 * assigned to <task title>" instead of by name.
 */
async function findTasksByTitle(query) {
  const term = query.trim();
  if (!term) return [];

  return Task.findAll({
    where: { title: { [Op.iLike]: `%${term}%` } },
    include: [{ model: User, as: 'assignee', include: [{ model: Tenant, as: 'tenant' }] }]
  });
}

export { findPeopleByName, findPersonById, getTasksForUser, findTasksByTitle };

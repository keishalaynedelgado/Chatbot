# 🛠️ Complete Setup & Installation Guide

This guide provides step-by-step instructions to install, configure, seed, run, and test both the **Synthie AI Chatbot** and the **Task Management System (with Reports & AI Insights)**.

---

## 📑 Table of Contents
1. [System Architecture & Components](#1-system-architecture--components)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration (`.env`)](#3-environment-configuration-env)
4. [Installation Steps](#4-installation-steps)
5. [Database Setup & Seeding](#5-database-setup--seeding)
6. [Running the Applications](#6-running-the-applications)
7. [Default User Accounts & Credentials](#7-default-user-accounts--credentials)
8. [Automated Testing & Verification](#8-automated-testing--verification)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)

---

## 1. System Architecture & Components

The repository consists of two integrated systems connected to the **same shared PostgreSQL database** (`taskdb`):

| Component | Port / URL | Tech Stack | Purpose |
| :--- | :--- | :--- | :--- |
| **Synthie AI Chatbot Backend** | `http://localhost:3000` | Node.js (ESM), Express, Vercel AI SDK, Sequelize | Conversational AI assistant with live PostgreSQL grounding, safety guardrails, conversation summarization, strict department filtering, and AI Template Autofill (`.pptx` generation with charts). Serves the frontend too. |
| **Task Management Backend** | `http://localhost:5000` | Node.js (CommonJS), Express, Sequelize, Vercel AI SDK | Multi-tenant REST API with role-based access control (RBAC), Reports Analytics, and AI executive summaries. |
| **Task Management Frontend** | `http://localhost:5173` | React 18 (Vite), Tailwind CSS, Lucide Icons | Responsive web dashboard featuring task boards, user management, and the **Reports + AI Insights** page. |
| **PostgreSQL Database** | `localhost:5432` | PostgreSQL (`taskdb`) | Relational database holding multi-tenant records (`tenants`, `users`, `tasks`), shared by both systems above and browsable via **Adminer** at `http://localhost:8081`. |

For the full list of Chatbot-specific features (guardrails, Template Autofill, chart generation, summarization, etc.), see [`README.md`](./README.md).

---

## 2. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **PostgreSQL**: Running on the standard port `5432`
- **Git**: For version control

---

## 3. Environment Configuration (`.env`)

### 3.1 Chatbot Backend Environment File (`Chatbot/backend/.env`)
Create or verify `.env` inside `Chatbot/backend/`:

```ini
PORT=3000

# ==============================================================================
# AI Provider & Model Configuration
# ==============================================================================
DEFAULT_AI_PROVIDER=nvidia
DEFAULT_AI_MODEL=meta/llama-3.2-11b-vision-instruct

# ==============================================================================
# AI Provider API Keys
# ==============================================================================
NVIDIA_API_KEY=nvapi-your-nvidia-api-key-here
SCX_API_KEY=sk-scx-your-scx-ai-api-key-here
OPENAI_API_KEY=
GEMINI_API_KEY=

# ==============================================================================
# PostgreSQL Task Management Database
# ==============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskdb
DB_USER=postgres
DB_PASSWORD=admin123
DB_DIALECT=postgres
```

### 3.2 Task Management Backend Environment File (`task-management-system/backend/.env`)
Create or verify `.env` in `task-management-system/backend/.env`:

```ini
PORT=5000
NODE_ENV=development

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here_for_development
JWT_EXPIRES_IN=7d

# AI Configuration
DEFAULT_AI_PROVIDER=nvidia
DEFAULT_AI_MODEL=meta/llama-3.2-11b-vision-instruct
NVIDIA_API_KEY=nvapi-your-nvidia-api-key-here
```

---

## 4. Installation Steps

### Step 1: Install Chatbot Backend Dependencies
```bash
cd Chatbot/backend
npm install
```

### Step 2: Install Task Management Backend Dependencies
```bash
cd task-management-system/backend
npm install
```

### Step 3: Install Task Management Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 4: Install & Build the Chatbot Frontend
The Chatbot's frontend (`Chatbot/frontend/`) is a React + Vite app and needs an install and a production build — the Chatbot backend serves the built output from `Chatbot/frontend/dist/`, not the source directly:
```bash
cd Chatbot/frontend
npm install
npm run build
```
Re-run `npm run build` any time you change frontend source files; the backend won't pick up source changes without it. For active frontend development instead, use `npm run dev` in `Chatbot/frontend` (Vite dev server on `http://localhost:5173`, proxying `/api` requests to the backend on port `3000`).

---

## 5. Database Setup & Seeding

Run the seeder from the Task Management backend directory:
```bash
cd task-management-system/backend
node scripts/seedDb.js
```

This creates the tenant, users, and a set of realistic tasks with varied statuses, priorities, and due dates. The exact counts printed depend on what's already in the database and how many times the seeder has been run — check current record counts directly if you need exact numbers, e.g. via **Adminer** (`http://localhost:8081`) or:
```bash
psql -U postgres -d taskdb -c "SELECT count(*) FROM tasks;"
```

---

## 6. Running the Applications

### 🔹 Option A: Run All Services in Separate Terminals

#### Terminal 1: Start the Synthie AI Chatbot
Make sure you've run `npm run build` in `Chatbot/frontend` at least once (Step 4 above) before starting the backend, so it has a `dist/` folder to serve:
```bash
cd Chatbot/backend
npm start
# Server running at http://localhost:3000 (serves the built Chatbot frontend too)
```

#### Terminal 2: Start the Task Management Backend API
```bash
cd task-management-system/backend
npm start
# Server running at http://localhost:5000
```

#### Terminal 3: Start the Task Management Frontend UI
```bash
cd task-management-system/frontend
npm run dev
# Vite dev server running at http://localhost:5173
```

---

## 7. Default User Accounts & Credentials

You can log in to the Task Management application at **[http://localhost:5173](http://localhost:5173)** using any of the following accounts (verified against the live database):

| Username | Password | Role | Name |
| :--- | :--- | :--- | :--- |
| **`superadmin`** | `admin123` | `super_admin` | Super Admin — Global System Access (All Organizations) |
| **`keisha_admin`** | `admin123` | `admin` | Keisha Delgado — Organization Admin |
| **`vincent_dev`** | `admin123` | `staff` | Vincent Cabatas |
| **`brownie_qa`** | `admin123` | `staff` | Brownie Delgado |
| **`brailey_ops`** | `admin123` | `staff` | Brailey Delgado |
| **`pochie_design`** | `admin123` | `staff` | Pochie Delgado |

---

## 8. Automated Testing & Verification

### 1. Verify Synthie AI Chatbot & Streaming
```bash
cd Chatbot/backend
node tests/test_suite.js
```
*Validates `/api/health`, `/api/models`, static asset delivery, live token streaming, and PostgreSQL TaskDB query grounding. Requires the Chatbot backend to already be running on `http://localhost:3000` (the test's base URL is hardcoded, not read from `.env`).*

### 2. Verify Reports & AI Integration
In `task-management-system/backend`:
```bash
node tests/ai_integration.test.js
```
*Validates model catalog, role-based database scoping, system prompt grounding, and structured 4-section AI report generation.*

### 3. Verify Frontend Production Build
In `task-management-system/frontend`:
```bash
npm run build
```

---

## 9. Troubleshooting & FAQs

### Q1: The chatbot or backend fails to connect to PostgreSQL.
- **Check Port:** Confirm PostgreSQL is actually listening on `5432` (`netstat -ano | grep 5432` on Windows/WSL). If your `.env` has a different `DB_PORT`, the connection will fail with `SequelizeConnectionRefusedError` even though the service is otherwise healthy.
- **Check Credentials:** Confirm database user `postgres` and password `admin123` match your local PostgreSQL configuration.
- **Note:** if the connection worked before and suddenly stops, check whether `.env`'s `DB_PORT` was accidentally changed — a wrong port is a common, easy-to-miss cause even when the database service itself is running fine.

### Q2: What happens if the NVIDIA NIM API Key expires or is offline?
- The system includes a **built-in offline fallback engine**.
- If the external LLM call fails, the system automatically catches the error, calculates exact metrics directly from PostgreSQL, and streams a response without failing outright.

### Q3: How do I test Year-over-Year (YoY) and Month-over-Month (MoM) Reports?
1. Open **[http://localhost:5173/reports](http://localhost:5173/reports)**.
2. Select a period preset (e.g. **This Month**).
3. Review the **Historical Comparisons Panel** for Month-over-Month, Year-over-Year, and Annual Trajectory figures — these are calculated live from whatever data currently exists in the database, so exact percentages depend on your current dataset.
4. Click **"Generate AI Report"** to receive the structured 4-section executive analysis.

### Q4: How do I test the Chatbot's Template Autofill / chart generation / department filtering?
See [`README.md`](./README.md) for feature details. Quick examples to try directly in the chat:
- `Fill Reports.pptx with Keisha's information.`
- `Fill Reports.pptx with Keisha's info as a pie chart.`
- `How many Operations tasks are there?`

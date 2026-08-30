# 🛠️ Complete Setup & Installation Guide

This guide provides step-by-step instructions to install, configure, seed, run, and test both the **Synthie AI Chatbot** and the **Task Management System (with Reports & AI Insights)**.

---

## 📑 Table of Contents
1. [System Architecture & Components](#1-system-architecture--components)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration (`.env`)](#3-environment-configuration-env)
4. [Installation Steps](#4-installation-steps)
5. [Database Setup & Historical Data Seeding](#5-database-setup--historical-data-seeding)
6. [Running the Applications](#6-running-the-applications)
7. [Default User Accounts & Credentials](#7-default-user-accounts--credentials)
8. [Automated Testing & Verification](#8-automated-testing--verification)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)

---

## 1. System Architecture & Components

The repository consists of two integrated systems connected to a shared PostgreSQL database:

| Component | Port / URL | Tech Stack | Purpose |
| :--- | :--- | :--- | :--- |
| **Synthie AI Chatbot** | `http://localhost:3000` | Node.js (ESM), Express, Vercel AI SDK, Vanilla JS | Conversational enterprise AI assistant with live PostgreSQL & Supabase grounding and token streaming. |
| **Task Management Backend** | `http://localhost:5000` | Node.js (CommonJS), Express, Sequelize, Vercel AI SDK | Multi-tenant REST API with role-based access control (RBAC), Reports Analytics, and AI executive summaries. |
| **Task Management Frontend** | `http://localhost:5173` | React 18, Vite, Tailwind CSS, Lucide Icons | Responsive web dashboard featuring task boards, user management, and the **Reports + AI Insights** page. |
| **PostgreSQL Database** | `localhost:5435` | PostgreSQL 15/16 (`taskdb`) | Relational database holding multi-tenant records (`tenants`, `users`, `tasks`). |

---

## 2. Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or higher (`node -v`)
- **npm**: `v10.x` or higher (`npm -v`)
- **PostgreSQL**: Running on port `5435` (or configured via standard PostgreSQL on port `5432`)
- **Git**: For version control

---

## 3. Environment Configuration (`.env`)

### 3.1 Root Chatbot Environment File (`.env`)
Create or verify `.env` in the root project directory (`c:/Users/Shirley/OneDrive/Documents/meldcx/.env`):

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
OPENAI_API_KEY=
GEMINI_API_KEY=

# ==============================================================================
# Supabase Live Database Integration
# ==============================================================================
SUPABASE_URL=https://dxvwyapqtokxenyiliwy.supabase.co
SUPABASE_KEY=sb_publishable_1yPDpLFJgcPu8vd6dy4l-w_xUUKwCrY

# ==============================================================================
# PostgreSQL Task Management Database Integration
# ==============================================================================
DB_HOST=localhost
DB_PORT=5435
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

# Database Configuration
DB_HOST=localhost
DB_PORT=5435
DB_NAME=taskdb
DB_USER=postgres
DB_PASSWORD=admin123
DB_DIALECT=postgres

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

### Step 1: Install Root Chatbot Dependencies
Open terminal in the project root:
```bash
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

---

## 5. Database Setup & Historical Data Seeding

The database seeder creates tenants, active users, and **82+ realistic tasks** spanning **2025 and 2026** (including exact baselines for Month-over-Month and Year-over-Year calculations).

Run the seeder from the backend directory:
```bash
cd task-management-system/backend
node scripts/seedDb.js
```

**Expected Seeder Output:**
```
======================================================
🎉 MULTI-PERIOD HISTORICAL SEEDING COMPLETED!
======================================================
🏢 Tenant: Apex Global Enterprises
👥 Active Users: 13
📋 Total Tasks: 82
   - 📅 2025 Full Year:      32 tasks
   - 📅 2026 Full Year:      50 tasks
   - 📈 Aug 2025 (YoY Base): 6 tasks
   - 📈 Jul 2026 (Last Mo):  10 tasks
   - 🚀 Aug 2026 (Curr Mo):  25 tasks
======================================================
```

---

## 6. Running the Applications

### 🔹 Option A: Run All Services in Separate Terminals

#### Terminal 1: Start the Synthie AI Chatbot
```bash
# In the project root directory
npm start
# Server running at http://localhost:3000
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

You can log in to the Task Management application at **[http://localhost:5173](http://localhost:5173)** using any of the following accounts:

| Username | Password | Role | Scope |
| :--- | :--- | :--- | :--- |
| **`superadmin`** | `admin123` | `super_admin` | Global System Access (All Organizations) |
| **`keisha_admin`** | `admin123` | `admin` | Organization Admin (Apex Global Enterprises) |
| **`vincent_dev`** | `admin123` | `staff` | Lead Developer Workload & Tasks |
| **`brownie_qa`** | `admin123` | `staff` | QA Engineer Workload & Tasks |
| **`brailey_ops`** | `admin123` | `staff` | DevOps & Compliance Tasks |
| **`pochie_design`** | `admin123` | `staff` | UI/UX Design Tasks |

---

## 8. Automated Testing & Verification

### 1. Verify Synthie AI Chatbot & Streaming
In the root directory:
```bash
node tests/test_suite.js
```
*Validates `/api/health`, `/api/models`, static asset delivery, live token streaming via NVIDIA NIM, and PostgreSQL TaskDB query grounding.*

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
- **Check Port:** Verify whether your PostgreSQL instance is running on port `5435` or standard `5432`. Update `DB_PORT` in `.env` accordingly.
- **Check Credentials:** Confirm database user `postgres` and password `admin123` match your local PostgreSQL configuration.

### Q2: What happens if the NVIDIA NIM API Key expires or is offline?
- The system includes a **Deterministic Grounded Intelligence Engine fallback**. 
- If an external LLM call returns `404`, `410`, or `429`, the system automatically catches the error, calculates the exact database metrics from PostgreSQL, and streams a structured executive report without failing.

### Q3: How do I test Year-over-Year (YoY) and Month-over-Month (MoM) Reports?
1. Open **[http://localhost:5173/reports](http://localhost:5173/reports)**.
2. Select **This Month** preset.
3. Review the **Historical Comparisons Panel** showing:
   - **Month-over-Month (MoM):** August 2026 vs July 2026 (`+150.0%` volume growth).
   - **Year-over-Year (YoY):** August 2026 vs August 2025 (`+316.7%` net expansion).
   - **Annual Trajectory:** Full Year 2026 vs Full Year 2025 (`+56.3%`).
4. Click **"Generate AI Report"** to receive the structured 4-section executive analysis.

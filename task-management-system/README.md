# Multi-Tenant Task Management System

## 🚀 Overview

A full-stack task management system with **multi-tenant architecture**, **role-based access control (RBAC)**, and an **AI-powered chat assistant**. Built for the OJT Internship Exam at List CDO.

**Live Demo:** http://localhost:5173 (after setup)

---

## 📋 Features

### ✅ Authentication & Authorization
- Login with JWT-based authentication
- Role-Based Access Control (RBAC) with 3 roles:
  - **Super Admin** - Full system access, manage tenants
  - **Admin** - Manage their tenant's users and tasks
  - **Staff** - View and update assigned tasks only

### ✅ Multi-Tenant Architecture
- Complete data isolation between tenants
- Each tenant has its own users and tasks
- Super Admin can access all tenants

### ✅ Core Features
- **Tenant Management** - Create, update, delete tenants (Super Admin only)
- **User Management** - Create, update, delete users, assign roles
- **Task Management** - Create, assign, update, delete tasks
- **Task Board** - Kanban-style view (Pending, In Progress, Completed, Cancelled)
- **AI Chat Assistant** - Get help with tasks and system usage
- **Search & Filter** - Global search with filtering, sorting, pagination

### ✅ UI/UX
- Modern, responsive design with ShadCN UI
- Dark mode support
- Loading states and error handling
- Form validation with real-time feedback

---

## 🛠️ Tech Stack

### Frontend
- **React** (Vite) - UI Framework
- **ShadCN UI** - Component Library
- **Axios** - HTTP Client
- **TanStack Query** - Data Fetching & State Management
- **Zod** - Client-side Validation
- **React Router** - Navigation
- **React Hook Form** - Form Handling
- **Tailwind CSS** - Styling

### Backend
- **Express.js** - Web Framework
- **Sequelize ORM** - Database ORM
- **Joi** - Server-side Validation
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Bcryptjs** - Password Hashing

### Authentication
- **Keycloak** (Optional - can use JWT directly)
- **JWT** for session management
- **RBAC** for authorization

### AI Integration
- **OpenRouter/OpenAI API** - AI Chat responses
- API keys stored securely on backend only

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | v20+ | JavaScript runtime |
| npm | v10+ | Package manager |
| PostgreSQL | v15+ | Database |
| Docker | Latest | Keycloak (optional) |
| Git | Latest | Version control |

---

## 📦 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/task-management-system.git
cd task-management-system
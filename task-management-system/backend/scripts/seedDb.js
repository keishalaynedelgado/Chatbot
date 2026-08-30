/**
 * Realistic Multi-Period Historical Dummy Data Seeder
 * 
 * Generates rich, realistic records across multiple years and months:
 * - 2025 (Previous Year): Q1, Q2, August 2025 (Same Month Last Year for YoY), Q4
 * - 2026 (Current Year): Q1, Q2, July 2026 (Last Month), August 2026 (Current Month), Upcoming
 * 
 * Intentionally designed with meaningful operational trends:
 * - Clear Month-over-Month (MoM) growth in task velocity & volume
 * - Substantial Year-over-Year (YoY) growth (Aug 2026 vs Aug 2025)
 * - Distinct functional category performance (Engineering, UI/UX, Compliance, QA, Marketing, Operations)
 * - Realistic assignee workloads, overdue items, and completion timestamps
 */

const { sequelize, Tenant, User, Task } = require('../src/models');

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting comprehensive multi-period historical database seed...');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    // 1. Create or Find Demo Tenant
    const [demoTenant] = await Tenant.findOrCreate({
      where: { name: 'Demo Tenant' },
      defaults: {
        companyName: 'Apex Global Enterprises',
        email: 'contact@apexglobal.com',
        phone: '+1 (555) 234-5678',
        address: '850 Technology Park, Suite 400, San Francisco, CA',
        subscriptionPlan: 'enterprise',
        isActive: true,
        settings: { theme: 'system', notificationsEnabled: true }
      }
    });

    console.log(`✅ Tenant ready: ${demoTenant.companyName} (${demoTenant.id})`);

    // 2. Create Users with realistic roles
    const usersData = [
      {
        username: 'superadmin',
        email: 'superadmin@system.com',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
        isActive: true,
        tenantId: demoTenant.id
      },
      {
        username: 'keisha_admin',
        email: 'keisha@apexglobal.com',
        firstName: 'Keisha',
        lastName: 'Delgado',
        role: 'admin',
        isActive: true,
        tenantId: demoTenant.id
      },
      {
        username: 'vincent_dev',
        email: 'vincent.cabatas@apexglobal.com',
        firstName: 'Vincent',
        lastName: 'Cabatas',
        role: 'staff',
        isActive: true,
        tenantId: demoTenant.id
      },
      {
        username: 'brownie_qa',
        email: 'brownie.delgado@apexglobal.com',
        firstName: 'Brownie',
        lastName: 'Delgado',
        role: 'staff',
        isActive: true,
        tenantId: demoTenant.id
      },
      {
        username: 'brailey_ops',
        email: 'brailey.delgado@apexglobal.com',
        firstName: 'Brailey',
        lastName: 'Delgado',
        role: 'staff',
        isActive: true,
        tenantId: demoTenant.id
      },
      {
        username: 'pochie_design',
        email: 'pochie.delgado@apexglobal.com',
        firstName: 'Pochie',
        lastName: 'Delgado',
        role: 'staff',
        isActive: true,
        tenantId: demoTenant.id
      }
    ];

    const userMap = {};
    for (const u of usersData) {
      let [userObj] = await User.findOrCreate({
        where: { username: u.username },
        defaults: u
      });
      userMap[u.username] = userObj;
    }

    const allUsers = await User.findAll({ where: { tenantId: demoTenant.id } });
    const primaryAdmin = userMap['keisha_admin'] || userMap['superadmin'];
    const uDev = userMap['vincent_dev']?.id || primaryAdmin.id;
    const uQA = userMap['brownie_qa']?.id || primaryAdmin.id;
    const uOps = userMap['brailey_ops']?.id || primaryAdmin.id;
    const uDesign = userMap['pochie_design']?.id || primaryAdmin.id;
    const uAdmin = primaryAdmin.id;

    // 3. Clear existing tasks for clean reproducible multi-period dataset
    await Task.destroy({ where: { tenantId: demoTenant.id } });
    console.log('🧹 Cleared existing task records for demo tenant');

    // Helper date generator
    const makeDate = (year, monthIndex, day, hour = 10) => {
      return new Date(Date.UTC(year, monthIndex, day, hour, 0, 0));
    };

    // 4. Generate Comprehensive 2025 & 2026 Historical Tasks
    const tasksToInsert = [
      // =========================================================================
      // --- 2025: Q1 (Jan - Mar 2025) Foundation & Setup (8 tasks) ---
      // =========================================================================
      {
        title: 'Initial Database Schema Architecture & Normalization',
        description: 'Design relational PostgreSQL tables for tenants, users, and tasks.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Engineering', 'Database', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 0, 10),
        dueDate: makeDate(2025, 0, 25),
        completedAt: makeDate(2025, 0, 22)
      },
      {
        title: 'Core REST API Boilerplate Setup with Express.js',
        description: 'Configure routing middleware, error handling, and JSON validation.',
        status: 'completed',
        priority: 'high',
        tags: ['Engineering', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 0, 15),
        dueDate: makeDate(2025, 0, 30),
        completedAt: makeDate(2025, 0, 28)
      },
      {
        title: 'Q1 2025 Infrastructure Budget Plan',
        description: 'Allocate cloud hosting spend across staging and production clusters.',
        status: 'completed',
        priority: 'medium',
        tags: ['Finance', 'Operations'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 1, 5),
        dueDate: makeDate(2025, 1, 20),
        completedAt: makeDate(2025, 1, 18)
      },
      {
        title: 'Basic User Authentication & Password Hashing',
        description: 'Implement bcrypt password hashing and session tokens.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 1, 12),
        dueDate: makeDate(2025, 1, 28),
        completedAt: makeDate(2025, 1, 25)
      },
      {
        title: 'Frontend Component Wireframing in Figma',
        description: 'Design initial user journey for login, dashboards, and list views.',
        status: 'completed',
        priority: 'medium',
        tags: ['UI/UX', 'Design'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 2, 2),
        dueDate: makeDate(2025, 2, 18),
        completedAt: makeDate(2025, 2, 15)
      },
      {
        title: 'Initial Unit Testing Harness Setup with Jest',
        description: 'Configure automated test runner for controller and service functions.',
        status: 'completed',
        priority: 'high',
        tags: ['Quality Assurance', 'Testing'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 2, 8),
        dueDate: makeDate(2025, 2, 22),
        completedAt: makeDate(2025, 2, 20)
      },
      {
        title: 'Legacy MySQL Migration Script Prototype',
        description: 'Evaluate automated data pump script from MySQL to PostgreSQL.',
        status: 'cancelled',
        priority: 'low',
        tags: ['Engineering', 'Legacy'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 2, 10),
        dueDate: makeDate(2025, 2, 25),
        completedAt: null
      },
      {
        title: 'Q1 Milestone Release Retrospective',
        description: 'Review foundational delivery pace and identify tooling bottlenecks.',
        status: 'completed',
        priority: 'low',
        tags: ['Operations', 'Management'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 2, 25),
        dueDate: makeDate(2025, 2, 31),
        completedAt: makeDate(2025, 2, 29)
      },

      // =========================================================================
      // --- 2025: Q2 (Apr - Jun 2025) Platform Expansion (10 tasks) ---
      // =========================================================================
      {
        title: 'Role-Based Access Control (RBAC) Implementation',
        description: 'Enforce super_admin, admin, and staff authorization middleware.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Compliance', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 3, 5),
        dueDate: makeDate(2025, 3, 20),
        completedAt: makeDate(2025, 3, 18)
      },
      {
        title: 'Tailwind CSS Design System Integration',
        description: 'Build foundational theme tokens, typography, and card components.',
        status: 'completed',
        priority: 'medium',
        tags: ['UI/UX', 'Frontend'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 3, 10),
        dueDate: makeDate(2025, 3, 25),
        completedAt: makeDate(2025, 3, 22)
      },
      {
        title: 'Staging Environment Docker Compose Setup',
        description: 'Containerize PostgreSQL, backend server, and client app for staging.',
        status: 'completed',
        priority: 'high',
        tags: ['DevOps', 'Infrastructure'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 4, 3),
        dueDate: makeDate(2025, 4, 18),
        completedAt: makeDate(2025, 4, 15)
      },
      {
        title: 'Automated API Validation with Joi Schemas',
        description: 'Validate request bodies, query params, and UUID routes.',
        status: 'completed',
        priority: 'high',
        tags: ['Engineering', 'Quality Assurance'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 4, 8),
        dueDate: makeDate(2025, 4, 22),
        completedAt: makeDate(2025, 4, 20)
      },
      {
        title: 'Kanban Task Board Interactive Prototype',
        description: 'Create 4-column board with drag-and-drop task status transitions.',
        status: 'completed',
        priority: 'medium',
        tags: ['Frontend', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 4, 15),
        dueDate: makeDate(2025, 4, 30),
        completedAt: makeDate(2025, 4, 27)
      },
      {
        title: 'Enterprise Customer SLA Contract Templates',
        description: 'Standardize service availability terms and incident response windows.',
        status: 'completed',
        priority: 'medium',
        tags: ['Compliance', 'Finance', 'Operations'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 5, 2),
        dueDate: makeDate(2025, 5, 16),
        completedAt: makeDate(2025, 5, 14)
      },
      {
        title: 'Redis Caching Layer for Frequent Queries',
        description: 'Add in-memory cache for tenant configuration and role metadata.',
        status: 'completed',
        priority: 'high',
        tags: ['Engineering', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 5, 10),
        dueDate: makeDate(2025, 5, 25),
        completedAt: makeDate(2025, 5, 22)
      },
      {
        title: 'Accessibility & Screen Reader Compliance Audit (WCAG AA)',
        description: 'Audit keyboard tab indexing, ARIA landmarks, and focus rings.',
        status: 'completed',
        priority: 'medium',
        tags: ['Quality Assurance', 'UI/UX'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 5, 12),
        dueDate: makeDate(2025, 5, 26),
        completedAt: makeDate(2025, 5, 24)
      },
      {
        title: 'Self-Hosted Gitlab Migration Initiative',
        description: 'Discontinued after choosing GitHub Enterprise cloud workspace.',
        status: 'cancelled',
        priority: 'low',
        tags: ['DevOps', 'Operations'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 5, 15),
        dueDate: makeDate(2025, 5, 28),
        completedAt: null
      },
      {
        title: 'Mid-Year 2025 Security Vulnerability Assessment',
        description: 'Conduct static code analysis and third-party dependency review.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Compliance'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 5, 20),
        dueDate: makeDate(2025, 5, 30),
        completedAt: makeDate(2025, 5, 28)
      },

      // =========================================================================
      // --- 2025: August 2025 (SAME MONTH LAST YEAR - EXACT YoY ANCHOR) (6 tasks) ---
      // =========================================================================
      {
        title: 'August 2025 Multi-Tenant Data Isolation Audit',
        description: 'Verify all database queries enforce tenantId filters at ORM boundary.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Compliance', 'Audit'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 7, 3),
        dueDate: makeDate(2025, 7, 15),
        completedAt: makeDate(2025, 7, 12)
      },
      {
        title: 'PostgreSQL Indexing for High-Volume Tenant Queries',
        description: 'Index tenantId and createdAt columns to handle 10,000+ monthly records.',
        status: 'completed',
        priority: 'high',
        tags: ['Engineering', 'Database'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 7, 8),
        dueDate: makeDate(2025, 7, 20),
        completedAt: makeDate(2025, 7, 18)
      },
      {
        title: 'August 2025 Product Marketing Collateral & One-Pagers',
        description: 'Design PDF marketing sheets for summer enterprise prospects.',
        status: 'completed',
        priority: 'medium',
        tags: ['Marketing', 'Design'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 7, 12),
        dueDate: makeDate(2025, 7, 24),
        completedAt: makeDate(2025, 7, 21)
      },
      {
        title: 'Automated Regression Test Suite v1.5',
        description: 'Expand automated Jest coverage for tenant user invitations.',
        status: 'completed',
        priority: 'high',
        tags: ['Quality Assurance', 'Testing'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 7, 15),
        dueDate: makeDate(2025, 7, 28),
        completedAt: makeDate(2025, 7, 26)
      },
      {
        title: 'Legacy FTP File Importer Deprecation',
        description: 'Decommission old FTP background job service in favor of S3 uploads.',
        status: 'completed',
        priority: 'low',
        tags: ['Operations', 'DevOps'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 7, 20),
        dueDate: makeDate(2025, 7, 30),
        completedAt: makeDate(2025, 7, 29)
      },
      {
        title: 'Custom SMS Gateway Integration Experiment',
        description: 'Halted due to high per-message carrier fees.',
        status: 'cancelled',
        priority: 'medium',
        tags: ['Engineering', 'Marketing'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 7, 22),
        dueDate: makeDate(2025, 7, 31),
        completedAt: null
      },

      // =========================================================================
      // --- 2025: Q4 (Sep - Dec 2025) Hardening & Stabilization (12 tasks) ---
      // =========================================================================
      {
        title: 'Cloudflare WAF & DDoS Protection Configuration',
        description: 'Set up edge security rules, IP rate limiting, and SSL/TLS certificates.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'DevOps'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 8, 4),
        dueDate: makeDate(2025, 8, 18),
        completedAt: makeDate(2025, 8, 15)
      },
      {
        title: 'User Profile Settings & Avatar Management',
        description: 'Allow team members to upload profile pictures and manage preferences.',
        status: 'completed',
        priority: 'medium',
        tags: ['Frontend', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 8, 10),
        dueDate: makeDate(2025, 8, 25),
        completedAt: makeDate(2025, 8, 22)
      },
      {
        title: 'Quarterly Automated Backup Verification Drill',
        description: 'Test point-in-time PostgreSQL recovery on disaster recovery sandbox.',
        status: 'completed',
        priority: 'high',
        tags: ['DevOps', 'Database'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 9, 5),
        dueDate: makeDate(2025, 9, 20),
        completedAt: makeDate(2025, 9, 17)
      },
      {
        title: 'Q3 Financial Reconciliation & Revenue Recognition',
        description: 'Reconcile Q3 software subscription invoices with bank statements.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Finance', 'Compliance'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 9, 12),
        dueDate: makeDate(2025, 9, 26),
        completedAt: makeDate(2025, 9, 24)
      },
      {
        title: 'Cross-Browser Compatibility Testing Suite (Safari, Firefox, Edge)',
        description: 'Fix flexbox rendering glitches on older Safari versions.',
        status: 'completed',
        priority: 'medium',
        tags: ['Quality Assurance', 'Frontend'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 10, 4),
        dueDate: makeDate(2025, 10, 18),
        completedAt: makeDate(2025, 10, 16)
      },
      {
        title: 'Email Notification Webhooks for Overdue Tasks',
        description: 'Dispatch daily digest emails summarizing approaching deadlines.',
        status: 'completed',
        priority: 'high',
        tags: ['Engineering', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 10, 10),
        dueDate: makeDate(2025, 10, 24),
        completedAt: makeDate(2025, 10, 22)
      },
      {
        title: 'End-of-Year Infrastructure Capacity Planning 2026',
        description: 'Forecast compute and storage requirements for 2026 enterprise expansion.',
        status: 'completed',
        priority: 'medium',
        tags: ['Operations', 'DevOps'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 11, 2),
        dueDate: makeDate(2025, 11, 16),
        completedAt: makeDate(2025, 11, 14)
      },
      {
        title: 'Annual Security Pen-Testing & Vulnerability Remediation',
        description: 'Engage external audit firm to perform black-box penetration testing.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Compliance', 'Audit'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2025, 11, 8),
        dueDate: makeDate(2025, 11, 22),
        completedAt: makeDate(2025, 11, 20)
      },

      // =========================================================================
      // --- 2026: Q1 (Jan - Mar 2026) Scalability & Modernization (12 tasks) ---
      // =========================================================================
      {
        title: 'Node.js 20 LTS & ESM Architecture Upgrade',
        description: 'Migrate server packages to modern ECMAScript module standards.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Engineering', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 0, 8),
        dueDate: makeDate(2026, 0, 22),
        completedAt: makeDate(2026, 0, 20)
      },
      {
        title: 'ShadCN UI Component Library Adoption',
        description: 'Standardize dialogs, dropdowns, tables, and buttons on Radix UI primitives.',
        status: 'completed',
        priority: 'high',
        tags: ['UI/UX', 'Frontend'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 0, 14),
        dueDate: makeDate(2026, 0, 28),
        completedAt: makeDate(2026, 0, 26)
      },
      {
        title: 'Q1 2026 Financial Audit & Expense Reconciliation',
        description: 'Reconcile Q1 vendor costs, cloud infrastructure, and software licenses.',
        status: 'completed',
        priority: 'high',
        tags: ['Finance', 'Audit'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 1, 5),
        dueDate: makeDate(2026, 1, 19),
        completedAt: makeDate(2026, 1, 17)
      },
      {
        title: 'OAuth2 / Keycloak SSO Multi-Realm Support',
        description: 'Support multi-realm authentication for isolated enterprise organizations.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Authentication', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 1, 10),
        dueDate: makeDate(2026, 1, 24),
        completedAt: makeDate(2026, 1, 22)
      },
      {
        title: 'Automated CI/CD Test Matrix on GitHub Actions',
        description: 'Run unit, integration, and build checks automatically across all pull requests.',
        status: 'completed',
        priority: 'high',
        tags: ['DevOps', 'Quality Assurance'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 1, 16),
        dueDate: makeDate(2026, 1, 28),
        completedAt: makeDate(2026, 1, 27)
      },
      {
        title: 'Global Search with Real-time Debouncing & Filters',
        description: 'Implement instant search across task titles, assignees, and priority tags.',
        status: 'completed',
        priority: 'medium',
        tags: ['Frontend', 'Engineering'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 2, 3),
        dueDate: makeDate(2026, 2, 17),
        completedAt: makeDate(2026, 2, 15)
      },
      {
        title: 'SOC2 Type II Annual Security Preparation',
        description: 'Compile system change audit trails and access control logs.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Compliance', 'Security'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 2, 10),
        dueDate: makeDate(2026, 2, 24),
        completedAt: makeDate(2026, 2, 22)
      },
      {
        title: 'Dark Theme High-Contrast Mode Optimization',
        description: 'Verify 7:1 contrast ratios on dark surfaces for accessibility compliance.',
        status: 'completed',
        priority: 'low',
        tags: ['UI/UX', 'Quality Assurance'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 2, 15),
        dueDate: makeDate(2026, 2, 29),
        completedAt: makeDate(2026, 2, 27)
      },

      // =========================================================================
      // --- 2026: Q2 (Apr - Jun 2026) Acceleration & AI Groundwork (14 tasks) ---
      // =========================================================================
      {
        title: 'PostgreSQL Query Optimization & Connection Pooling',
        description: 'Optimize Sequelize connection pool (max 10 connections) and p99 query speed.',
        status: 'completed',
        priority: 'high',
        tags: ['Engineering', 'Database', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 3, 4),
        dueDate: makeDate(2026, 3, 18),
        completedAt: makeDate(2026, 3, 16)
      },
      {
        title: 'Vercel AI SDK Integration Architecture Spike',
        description: 'Prototype multi-provider model routing across NVIDIA NIM, Gemini, and OpenAI.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Engineering', 'AI Integration', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 3, 12),
        dueDate: makeDate(2026, 3, 26),
        completedAt: makeDate(2026, 3, 24)
      },
      {
        title: 'AI Chat Streaming Interface & Markdown Parser',
        description: 'Build real-time SSE token stream UI with syntax-highlighted code blocks.',
        status: 'completed',
        priority: 'high',
        tags: ['Frontend', 'AI Integration', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 4, 6),
        dueDate: makeDate(2026, 4, 20),
        completedAt: makeDate(2026, 4, 18)
      },
      {
        title: 'AI Grounding Service on PostgreSQL Task Data',
        description: 'Ground AI chat responses in live tenant task statistics and workloads.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Engineering', 'AI Integration', 'Database'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 4, 14),
        dueDate: makeDate(2026, 4, 28),
        completedAt: makeDate(2026, 4, 26)
      },
      {
        title: 'Load Testing with 2,500 Concurrent AI Chat Sessions',
        description: 'Measure latency and memory footprint during continuous token generation.',
        status: 'completed',
        priority: 'high',
        tags: ['Quality Assurance', 'Testing', 'DevOps'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 5, 5),
        dueDate: makeDate(2026, 5, 19),
        completedAt: makeDate(2026, 5, 17)
      },
      {
        title: 'Customer Onboarding Self-Service Portal Redesign',
        description: 'Simplify organization registration and team invite link workflows.',
        status: 'completed',
        priority: 'medium',
        tags: ['UI/UX', 'Operations'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 5, 10),
        dueDate: makeDate(2026, 5, 24),
        completedAt: makeDate(2026, 5, 22)
      },
      {
        title: 'Mid-Year 2026 Financial Strategy & Revenue Review',
        description: 'Analyze annual recurring revenue (ARR) trajectory and subscriber churn.',
        status: 'completed',
        priority: 'high',
        tags: ['Finance', 'Operations'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 5, 15),
        dueDate: makeDate(2026, 5, 29),
        completedAt: makeDate(2026, 5, 28)
      },

      // =========================================================================
      // --- 2026: JULY 2026 (LAST MONTH) High Throughput & Milestone Completion (11 tasks) ---
      // =========================================================================
      {
        title: 'Q2 Milestone Performance Wrap-up & Retrospective',
        description: 'Evaluate quarterly sprint velocity and team delivery rates.',
        status: 'completed',
        priority: 'medium',
        tags: ['Operations', 'Management'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 2),
        dueDate: makeDate(2026, 6, 12),
        completedAt: makeDate(2026, 6, 10)
      },
      {
        title: 'Multi-Tenant RBAC Audit Trail & Security Logs',
        description: 'Log all role changes, permission elevation, and task updates.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Compliance', 'Audit'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 5),
        dueDate: makeDate(2026, 6, 18),
        completedAt: makeDate(2026, 6, 16)
      },
      {
        title: 'Summer 2026 Enterprise Promo Campaign Landing Page',
        description: 'Build responsive conversion-optimized promotional landing page.',
        status: 'completed',
        priority: 'medium',
        tags: ['Marketing', 'Frontend', 'Design'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 8),
        dueDate: makeDate(2026, 6, 20),
        completedAt: makeDate(2026, 6, 18)
      },
      {
        title: 'Automated End-to-End Cypress Test Suite Expansion',
        description: 'Automate full test scenarios covering user management and task boards.',
        status: 'completed',
        priority: 'high',
        tags: ['Quality Assurance', 'Testing'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 12),
        dueDate: makeDate(2026, 6, 24),
        completedAt: makeDate(2026, 6, 22)
      },
      {
        title: 'AWS Cloud Infrastructure Cost Optimization',
        description: 'Scale down idle staging pods and optimize RDS storage tiering.',
        status: 'completed',
        priority: 'medium',
        tags: ['DevOps', 'Finance'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 15),
        dueDate: makeDate(2026, 6, 26),
        completedAt: makeDate(2026, 6, 25)
      },
      {
        title: 'Payment Gateway Webhook Idempotency Validation',
        description: 'Prevent duplicate subscription charges during network retries.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Engineering', 'Finance', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 18),
        dueDate: makeDate(2026, 6, 28),
        completedAt: makeDate(2026, 6, 27)
      },
      {
        title: 'July 2026 SLA & Availability Verification',
        description: 'Verify 99.98% platform uptime across all enterprise client accounts.',
        status: 'completed',
        priority: 'high',
        tags: ['Operations', 'Compliance'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 20),
        dueDate: makeDate(2026, 6, 30),
        completedAt: makeDate(2026, 6, 29)
      },
      {
        title: 'Micro-Frontend Modular Federation Investigation',
        description: 'Postponed due to sufficient performance with current single Vite build.',
        status: 'cancelled',
        priority: 'low',
        tags: ['Engineering', 'Research'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 22),
        dueDate: makeDate(2026, 6, 31),
        completedAt: null
      },
      {
        title: 'July 2026 Customer Feedback & NPS Synthesis',
        description: 'Analyze net promoter score feedback and prioritize top user requests.',
        status: 'completed',
        priority: 'medium',
        tags: ['Marketing', 'Operations'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 24),
        dueDate: makeDate(2026, 6, 31),
        completedAt: makeDate(2026, 6, 30)
      },
      {
        title: 'User Avatar Upload & Image Cropper Component',
        description: 'Add client-side image resizing and presigned S3 upload URLs.',
        status: 'completed',
        priority: 'medium',
        tags: ['Frontend', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 6, 25),
        dueDate: makeDate(2026, 6, 31),
        completedAt: makeDate(2026, 6, 30)
      },

      // =========================================================================
      // --- 2026: AUGUST 2026 (CURRENT MONTH - ACTIVE WORKLOAD & GROWTH) (22 tasks) ---
      // =========================================================================
      {
        title: 'Q3 Financial Audit and Revenue Reconciliation',
        description: 'Complete quarterly balance sheet reconciliation and tax schedule documentation.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Finance', 'Audit', 'Compliance'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 2),
        dueDate: makeDate(2026, 7, 12),
        completedAt: makeDate(2026, 7, 10)
      },
      {
        title: 'Vercel AI SDK Integration & Model Catalog Configuration',
        description: 'Integrate streamText with NVIDIA NIM and Google Gemini providers.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Engineering', 'AI Integration', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 3),
        dueDate: makeDate(2026, 7, 14),
        completedAt: makeDate(2026, 7, 12)
      },
      {
        title: 'Multi-Tenant Data Isolation Grounding Verification',
        description: 'Verify all database queries enforce tenantId filters at ORM layer.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Security', 'Compliance', 'Audit'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 5),
        dueDate: makeDate(2026, 7, 16),
        completedAt: makeDate(2026, 7, 15)
      },
      {
        title: 'Interactive Reports & Analytics Dashboard UI with Date Filtering',
        description: 'Build comprehensive visual cards, status charts, and period comparison selectors.',
        status: 'completed',
        priority: 'urgent',
        tags: ['Frontend', 'Analytics', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 8),
        dueDate: makeDate(2026, 7, 20),
        completedAt: makeDate(2026, 7, 19)
      },
      {
        title: 'Automated CI/CD Deployment Pipeline via GitHub Actions',
        description: 'Configure automated build, test matrix, and Docker container staging deployment.',
        status: 'completed',
        priority: 'high',
        tags: ['DevOps', 'CI/CD', 'Engineering'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 10),
        dueDate: makeDate(2026, 7, 22),
        completedAt: makeDate(2026, 7, 21)
      },
      {
        title: 'Marketing Campaign Landing Page Development',
        description: 'Build high-converting responsive landing page for Summer 2026 enterprise promo.',
        status: 'completed',
        priority: 'medium',
        tags: ['Marketing', 'Frontend', 'Design'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 12),
        dueDate: makeDate(2026, 7, 24),
        completedAt: makeDate(2026, 7, 22)
      },
      {
        title: 'Load Testing & Concurrency Benchmarking (5000 RPS)',
        description: 'Simulate peak server loads and measure p99 database response times.',
        status: 'completed',
        priority: 'high',
        tags: ['Quality Assurance', 'DevOps', 'Testing'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 14),
        dueDate: makeDate(2026, 7, 25),
        completedAt: makeDate(2026, 7, 24)
      },
      {
        title: 'Weekly Sprint Milestone Wrap-up & Executive Demo',
        description: 'Present deliverable achievements to executive stakeholders.',
        status: 'completed',
        priority: 'low',
        tags: ['Operations', 'Management'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 18),
        dueDate: makeDate(2026, 7, 26),
        completedAt: makeDate(2026, 7, 25)
      },

      // --- Current In Progress Tasks (Active Workload) ---
      {
        title: 'Real-time WebSocket Notifications for Task Status Changes',
        description: 'Implement Socket.io broadcast events when a task is updated or assigned.',
        status: 'in_progress',
        priority: 'high',
        tags: ['Engineering', 'Backend', 'WebSockets'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 20),
        dueDate: makeDate(2026, 7, 29),
        completedAt: null
      },
      {
        title: 'Automated Smoke Testing Pipeline for Staging Environment',
        description: 'Run automated health check and API regression suite on each Git push.',
        status: 'in_progress',
        priority: 'medium',
        tags: ['Quality Assurance', 'Testing', 'DevOps'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 21),
        dueDate: makeDate(2026, 7, 30),
        completedAt: null
      },
      {
        title: 'Cross-Tenant Activity Logging & Audit Trail System',
        description: 'Record user actions, logins, and permission changes into a tamper-evident audit log.',
        status: 'in_progress',
        priority: 'high',
        tags: ['Compliance', 'Security', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 22),
        dueDate: makeDate(2026, 7, 31),
        completedAt: null
      },
      {
        title: 'Customer Onboarding Workflow Documentation & SOPs',
        description: 'Draft step-by-step guides for training new support representatives.',
        status: 'in_progress',
        priority: 'low',
        tags: ['Operations', 'Documentation'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 23),
        dueDate: makeDate(2026, 7, 31),
        completedAt: null
      },
      {
        title: 'Mobile App Responsive Navigation & Gestures Polish',
        description: 'Improve swipe navigation and drawer transitions on iOS and Android devices.',
        status: 'in_progress',
        priority: 'medium',
        tags: ['Frontend', 'Mobile', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 24),
        dueDate: makeDate(2026, 8, 1),
        completedAt: null
      },
      {
        title: 'Staff Workload Load Balancing Algorithm Prototype',
        description: 'Analyze capacity utilization across developers to recommend optimal task delegation.',
        status: 'in_progress',
        priority: 'medium',
        tags: ['Engineering', 'Analytics', 'AI Integration'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 25),
        dueDate: makeDate(2026, 8, 2),
        completedAt: null
      },

      // --- Overdue Deliverables (Delivery Bottlenecks) ---
      {
        title: 'SOC2 Type II Compliance Evidence Collection',
        description: 'Gather audit logs and access control records for external compliance review.',
        status: 'pending',
        priority: 'urgent',
        tags: ['Compliance', 'Security', 'Audit'],
        assignedTo: uOps,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 5),
        dueDate: makeDate(2026, 7, 20),
        completedAt: null
      },
      {
        title: 'Disaster Recovery Database Failover Drill & Simulation',
        description: 'Execute automated PostgreSQL replication switchover to secondary standby zone.',
        status: 'pending',
        priority: 'urgent',
        tags: ['DevOps', 'Database', 'Security'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 8),
        dueDate: makeDate(2026, 7, 22),
        completedAt: null
      },
      {
        title: 'Quarterly Vendor Service Level Agreement (SLA) Review',
        description: 'Audit cloud vendor uptime metrics against contracted 99.95% SLA thresholds.',
        status: 'pending',
        priority: 'high',
        tags: ['Operations', 'Finance', 'Compliance'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 10),
        dueDate: makeDate(2026, 7, 24),
        completedAt: null
      },
      {
        title: 'Broken Email Notification Template for Password Reset',
        description: 'Fix HTML rendering bugs affecting Outlook email clients.',
        status: 'pending',
        priority: 'high',
        tags: ['Frontend', 'Quality Assurance', 'Bugs'],
        assignedTo: uQA,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 12),
        dueDate: makeDate(2026, 7, 26),
        completedAt: null
      },

      // --- Upcoming Backlog in Current Month ---
      {
        title: 'AI Insights Generation Engine with Grounded Prompting',
        description: 'Implement backend service to aggregate metrics and generate executive summaries.',
        status: 'pending',
        priority: 'urgent',
        tags: ['Engineering', 'AI Integration', 'Backend'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 26),
        dueDate: makeDate(2026, 7, 30),
        completedAt: null
      },
      {
        title: 'PDF & CSV Export for Reports and Executive Summaries',
        description: 'Allow managers to download print-ready PDF and spreadsheet data summaries.',
        status: 'pending',
        priority: 'high',
        tags: ['Frontend', 'Analytics', 'Operations'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 26),
        dueDate: makeDate(2026, 8, 3),
        completedAt: null
      },
      {
        title: 'Flash Sale Promo Popup Banner Experiment',
        description: 'Discontinued following negative user feedback during A/B testing.',
        status: 'cancelled',
        priority: 'low',
        tags: ['Marketing', 'Frontend', 'UI/UX'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 15),
        dueDate: makeDate(2026, 7, 25),
        completedAt: null
      },

      // =========================================================================
      // --- UPCOMING FUTURE PIPELINE (Sep - Oct 2026) (8 tasks) ---
      // =========================================================================
      {
        title: 'Multi-Language Localization (Spanish, Japanese, German)',
        description: 'Extract i18n translation strings for core dashboard and navigation.',
        status: 'pending',
        priority: 'medium',
        tags: ['Frontend', 'UI/UX', 'Internationalization'],
        assignedTo: uDesign,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 27),
        dueDate: makeDate(2026, 8, 10),
        completedAt: null
      },
      {
        title: 'Automated Invoice Generation and Email Dispatch',
        description: 'Generate monthly PDF invoices for enterprise subscription plans.',
        status: 'pending',
        priority: 'medium',
        tags: ['Backend', 'Finance', 'Operations'],
        assignedTo: uAdmin,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 27),
        dueDate: makeDate(2026, 8, 15),
        completedAt: null
      },
      {
        title: 'Kubernetes Cluster Auto-Scaling Policy Tuning',
        description: 'Configure Horizontal Pod Autoscaler based on CPU and memory thresholds.',
        status: 'pending',
        priority: 'high',
        tags: ['DevOps', 'Infrastructure', 'Engineering'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 27),
        dueDate: makeDate(2026, 8, 18),
        completedAt: null
      },
      {
        title: 'Customer Feedback Sentiment Analysis Model Evaluation',
        description: 'Test HuggingFace NLP models to classify incoming customer support tickets.',
        status: 'pending',
        priority: 'low',
        tags: ['AI Integration', 'Research', 'Support'],
        assignedTo: uDev,
        createdBy: uAdmin,
        tenantId: demoTenant.id,
        createdAt: makeDate(2026, 7, 27),
        dueDate: makeDate(2026, 8, 25),
        completedAt: null
      }
    ];

    console.log(`📝 Inserting ${tasksToInsert.length} multi-period historical tasks into PostgreSQL...`);
    for (const t of tasksToInsert) {
      await Task.create(t);
    }

    // 5. Calculate and print multi-period summary
    const totalCount = await Task.count({ where: { tenantId: demoTenant.id } });
    const count2025 = await Task.count({
      where: {
        tenantId: demoTenant.id,
        createdAt: {
          [sequelize.Sequelize.Op.between]: [makeDate(2025, 0, 1), makeDate(2025, 11, 31, 23, 59, 59)]
        }
      }
    });
    const count2026 = await Task.count({
      where: {
        tenantId: demoTenant.id,
        createdAt: {
          [sequelize.Sequelize.Op.between]: [makeDate(2026, 0, 1), makeDate(2026, 11, 31, 23, 59, 59)]
        }
      }
    });
    const countAug2025 = await Task.count({
      where: {
        tenantId: demoTenant.id,
        createdAt: {
          [sequelize.Sequelize.Op.between]: [makeDate(2025, 7, 1), makeDate(2025, 7, 31, 23, 59, 59)]
        }
      }
    });
    const countJul2026 = await Task.count({
      where: {
        tenantId: demoTenant.id,
        createdAt: {
          [sequelize.Sequelize.Op.between]: [makeDate(2026, 6, 1), makeDate(2026, 6, 31, 23, 59, 59)]
        }
      }
    });
    const countAug2026 = await Task.count({
      where: {
        tenantId: demoTenant.id,
        createdAt: {
          [sequelize.Sequelize.Op.between]: [makeDate(2026, 7, 1), makeDate(2026, 7, 31, 23, 59, 59)]
        }
      }
    });

    console.log('\n======================================================');
    console.log('🎉 MULTI-PERIOD HISTORICAL SEEDING COMPLETED!');
    console.log('======================================================');
    console.log(`🏢 Tenant: ${demoTenant.companyName}`);
    console.log(`👥 Active Users: ${allUsers.length}`);
    console.log(`📋 Total Tasks: ${totalCount}`);
    console.log(`   - 📅 2025 Full Year:      ${count2025} tasks`);
    console.log(`   - 📅 2026 Full Year:      ${count2026} tasks`);
    console.log(`   - 📈 Aug 2025 (YoY Base): ${countAug2025} tasks`);
    console.log(`   - 📈 Jul 2026 (Last Mo):  ${countJul2026} tasks`);
    console.log(`   - 🚀 Aug 2026 (Curr Mo):  ${countAug2026} tasks`);
    console.log('======================================================\n');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Database seeding failed:');
    console.error(error);

    await sequelize.close();
    process.exit(1);
  }
};

seedDatabase();
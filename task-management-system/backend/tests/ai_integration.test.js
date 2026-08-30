/**
 * Integration Test for AI Chat & Multi-Tenant Data Grounding & Reports
 */

const assert = require('assert');
const taskAnalyticsService = require('../src/services/taskAnalyticsService');
const reportService = require('../src/services/reportService');
const { MODEL_CATALOG } = require('../src/config/aiConfig');
const { User, Tenant } = require('../src/models');

async function runTests() {
  console.log('🧪 Starting Task Management System AI Integration Tests...\n');

  // Test 1: Model Catalog
  console.log('1️⃣ Checking Model Catalog configuration...');
  assert(Array.isArray(MODEL_CATALOG), 'MODEL_CATALOG must be an array');
  assert(MODEL_CATALOG.length >= 3, 'Must have at least 3 models configured');
  console.log(`   ✅ Model catalog verified (${MODEL_CATALOG.length} models available).`);

  // Fetch real seeded users
  const adminUser = await User.findOne({ where: { role: 'admin' } });
  const staffUser = await User.findOne({ where: { role: 'staff' } });
  const superAdmin = await User.findOne({ where: { role: 'super_admin' } });

  assert(adminUser, 'Admin user must exist in seeded database');
  assert(staffUser, 'Staff user must exist in seeded database');
  assert(superAdmin, 'Super Admin user must exist in seeded database');

  // Test 2: Multi-tenant Role Scoping Logic
  console.log('\n2️⃣ Testing Multi-Tenant Analytics Grounding with PostgreSQL...');

  const adminAnalytics = await taskAnalyticsService.getScopedAnalytics(adminUser);
  assert(typeof adminAnalytics === 'object', 'Admin analytics must return an object');
  console.log('   ✅ Admin analytics scope:', adminAnalytics.scope, `(Tasks: ${adminAnalytics.totalTasks})`);

  const staffAnalytics = await taskAnalyticsService.getScopedAnalytics(staffUser);
  assert(typeof staffAnalytics === 'object', 'Staff analytics must return an object');
  console.log('   ✅ Staff analytics scope:', staffAnalytics.scope, `(Tasks: ${staffAnalytics.totalTasks})`);

  const superAdminAnalytics = await taskAnalyticsService.getScopedAnalytics(superAdmin);
  assert(typeof superAdminAnalytics === 'object', 'Super Admin analytics must return an object');
  console.log('   ✅ Super Admin analytics scope:', superAdminAnalytics.scope, `(Tasks: ${superAdminAnalytics.totalTasks})`);

  // Test 3: System Prompt Generation & Safety Grounding
  console.log('\n3️⃣ Testing System Prompt Grounding Generation...');
  const prompt = taskAnalyticsService.generateSystemPrompt(adminUser, adminAnalytics);
  assert(prompt.includes('Synthie AI'), 'Prompt must identify as Synthie AI');
  assert(prompt.includes('MULTI-TENANT & SECURITY RULES'), 'Prompt must contain security constraints');
  assert(prompt.includes('LIVE CALCULATED METRICS'), 'Prompt must contain DB metrics context');
  console.log('   ✅ System prompt generated with factual PostgreSQL grounding.');

  // Test 4: Offline Smart Report Generator
  console.log('\n4️⃣ Testing Grounded Report Synthesis (Offline / Fallback)...');
  const pendingReport = taskAnalyticsService.generateOfflineReply('How many pending tasks do we have?', adminAnalytics, adminUser);
  assert(pendingReport.includes('Pending Tasks Report'), 'Report must contain Pending header');
  console.log('   ✅ Pending tasks report generated.');

  const progressReport = taskAnalyticsService.generateOfflineReply('Give me a summary of task progress', adminAnalytics, adminUser);
  assert(progressReport.includes('Report') && progressReport.includes('Key Insights'), 'Report must contain structured sections');
  console.log('   ✅ Executive progress report generated.');

  const workloadReport = taskAnalyticsService.generateOfflineReply('Which users have the most assigned tasks?', adminAnalytics, adminUser);
  assert(workloadReport.toLowerCase().includes('workload') || workloadReport.toLowerCase().includes('assigned'), 'Report must contain workload context');
  console.log('   ✅ Team workload report generated.');

  // Test 5: Reports Service & AI Insights Generation
  console.log('\n5️⃣ Testing Report Service & AI Insights Engine...');
  const reportAnalytics = await reportService.getAnalytics(adminUser, { period: 'this_month' });
  assert(reportAnalytics.success === true, 'Analytics query must succeed');
  assert(typeof reportAnalytics.summary.totalTasks === 'number', 'totalTasks must be a number');
  assert(Array.isArray(reportAnalytics.statusBreakdown), 'statusBreakdown must be an array');
  assert(Array.isArray(reportAnalytics.priorityBreakdown), 'priorityBreakdown must be an array');
  console.log(`   ✅ Report Analytics computed (${reportAnalytics.summary.totalTasks} tasks, completion rate: ${reportAnalytics.summary.completionRate}).`);

  const generatedReport = await reportService.generateAIReport(adminUser, { period: 'this_month' });
  assert(generatedReport.success === true, 'AI Report generation must succeed');
  assert(generatedReport.isAIGenerated === true, 'isAIGenerated must be true');
  assert(typeof generatedReport.sections.overview === 'string', 'Overview section required');
  assert(typeof generatedReport.sections.keyFindings === 'string', 'Key Findings section required');
  assert(typeof generatedReport.sections.insights === 'string', 'AI Insights section required');
  assert(typeof generatedReport.sections.recommendations === 'string', 'Recommendations section required');
  console.log(`   ✅ Structured AI Report generated with all 4 required sections (Model: ${generatedReport.model}).`);

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

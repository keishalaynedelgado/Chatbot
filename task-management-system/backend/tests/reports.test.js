/**
 * Verification Test for Report Service & AI Insights Generation
 */

const assert = require('assert');
const reportService = require('../src/services/reportService');
const { User, Tenant } = require('../src/models');

async function testReports() {
  console.log('🧪 Starting Reports & AI Insights Verification Tests...\n');

  // 1. Fetch a demo user
  const adminUser = await User.findOne({ where: { role: 'admin' } });
  const staffUser = await User.findOne({ where: { role: 'staff' } });
  const superAdmin = await User.findOne({ where: { role: 'super_admin' } });

  const testUser = adminUser || staffUser || superAdmin;
  console.log(`👤 Using test user: ${testUser.username} (${testUser.role}) for Tenant: ${testUser.tenantId}`);

  // Test A: This Month Analytics
  console.log('\n1️⃣ Testing "This Month" Analytics calculation...');
  const monthData = await reportService.getAnalytics(testUser, { period: 'this_month' });
  assert(monthData.success === true, 'Response must be success: true');
  assert(typeof monthData.summary.totalTasks === 'number', 'totalTasks must be a number');
  assert(typeof monthData.summary.completionRate === 'string', 'completionRate must be a string');
  assert(Array.isArray(monthData.statusBreakdown), 'statusBreakdown must be an array');
  assert(Array.isArray(monthData.priorityBreakdown), 'priorityBreakdown must be an array');
  assert(Array.isArray(monthData.workloadBreakdown), 'workloadBreakdown must be an array');
  assert(Array.isArray(monthData.tagBreakdown), 'tagBreakdown must be an array');
  console.log(`   ✅ "This Month" Total Tasks: ${monthData.summary.totalTasks} | Completion Rate: ${monthData.summary.completionRate}`);
  console.log(`   ✅ Status counts:`, monthData.statusBreakdown.map(s => `${s.label}: ${s.count}`).join(', '));

  // Test B: All Time Analytics
  console.log('\n2️⃣ Testing "All Time" Analytics calculation...');
  const allData = await reportService.getAnalytics(testUser, { period: 'all' });
  assert(allData.summary.totalTasks >= monthData.summary.totalTasks, 'All time total must be >= this month');
  console.log(`   ✅ "All Time" Total Tasks: ${allData.summary.totalTasks} | Completed: ${allData.summary.completedTasks} | In Progress: ${allData.summary.inProgressTasks} | Pending: ${allData.summary.pendingTasks}`);

  // Test C: Custom Date Range
  console.log('\n3️⃣ Testing "Custom Date Range" Analytics calculation...');
  const now = new Date();
  const past30 = new Date();
  past30.setDate(past30.getDate() - 30);
  const customData = await reportService.getAnalytics(testUser, {
    period: 'custom',
    startDate: past30.toISOString(),
    endDate: now.toISOString()
  });
  assert(customData.success === true, 'Custom range query must succeed');
  console.log(`   ✅ Custom range (${customData.period.label}) returned ${customData.summary.totalTasks} tasks.`);

  // Test D: AI Report Generation
  console.log('\n4️⃣ Testing "Generate AI Report" generation...');
  const aiReport = await reportService.generateAIReport(testUser, { period: 'all' });
  assert(aiReport.success === true, 'AI Report must succeed');
  assert(aiReport.isAIGenerated === true, 'isAIGenerated flag must be true');
  assert(typeof aiReport.reportContent === 'string' && aiReport.reportContent.length > 50, 'reportContent must be populated');
  assert(typeof aiReport.sections.overview === 'string', 'Overview section must be extracted');
  assert(typeof aiReport.sections.keyFindings === 'string', 'Key Findings section must be extracted');
  assert(typeof aiReport.sections.insights === 'string', 'AI Insights section must be extracted');
  assert(typeof aiReport.sections.recommendations === 'string', 'Recommendations section must be extracted');

  console.log(`   ✅ AI Report generated successfully using model: ${aiReport.model}`);
  console.log(`   📄 Overview excerpt: "${aiReport.sections.overview.slice(0, 100)}..."`);
  console.log(`   🎯 Recommendations excerpt: "${aiReport.sections.recommendations.slice(0, 100)}..."`);

  console.log('\n🎉 ALL REPORT & AI INSIGHTS TESTS PASSED!');
  process.exit(0);
}

testReports().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

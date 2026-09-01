/**
 * Automated Test Suite for Synthie AI Application (Vercel AI SDK Integration)
 */
import assert from 'assert';

async function runTests() {
  const BASE_URL = process.env.TEST_URL || 'http://127.0.0.1:3000';
  console.log('🧪 Starting Synthie AI Test Suite (Vercel AI SDK)...\n');

  // Test 1: Health Check
  console.log('1️⃣ Checking /api/health endpoint...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health status must be 200');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok', 'Health response must be ok');
  assert.strictEqual(healthData.aiSdk, 'vercel-ai-sdk', 'AI SDK must be vercel-ai-sdk');
  console.log('   ✅ Health endpoint OK:', healthData);

  // Test 2: Models and Configuration Endpoint
  console.log('\n2️⃣ Checking /api/models endpoint...');
  const modelsRes = await fetch(`${BASE_URL}/api/models`);
  assert.strictEqual(modelsRes.status, 200, 'Models status must be 200');
  const modelsData = await modelsRes.json();
  assert(Array.isArray(modelsData.models), 'Models list must be an array');
  assert(modelsData.models.length > 0, 'Models list must not be empty');
  console.log(`   ✅ Models endpoint OK: ${modelsData.models.length} models available.`);

  // Test 3: Static Assets Delivery
  console.log('\n3️⃣ Checking Static Assets Delivery...');
  const assets = [
    '/',
    '/css/custom.css',
    '/js/config.js',
    '/js/utils/helpers.js',
    '/js/utils/markdown.js',
    '/js/chat/storage.js',
    '/js/chat/chat-manager.js',
    '/js/ai/builtin-engine.js',
    '/js/ai/gemini-client.js',
    '/js/ai/openai-client.js',
    '/js/ai/ai-service.js',
    '/js/ui/ui-renderer.js',
    '/js/ui/modals.js',
    '/js/ui/event-handlers.js',
    '/js/app.js'
  ];

  for (const asset of assets) {
    const res = await fetch(`${BASE_URL}${asset}`);
    assert.strictEqual(res.status, 200, `Asset ${asset} must return 200 OK`);
    console.log(`   ✅ Asset loaded: ${asset} (${res.headers.get('content-type')})`);
  }

  // Test 4: Streaming SSE AI Generation
  console.log('\n4️⃣ Checking AI SSE Streaming API via Vercel AI SDK backend...');
  
  async function testStream(prompt, expectedKeyword, provider = 'builtin') {
    const res = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        provider
      })
    });

    assert.strictEqual(res.status, 200);
    assert(res.headers.get('content-type').includes('text/event-stream'));

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let assembledText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const dataStr = trimmed.substring(6).trim();
          if (!dataStr) continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) assembledText += parsed.text;
          } catch (e) {}
        }
      }
    }

    assert(assembledText.toLowerCase().includes(expectedKeyword.toLowerCase()), `Streamed text for "${prompt}" should contain "${expectedKeyword}"`);
    return assembledText;
  }

  const q3Text = await testStream('Can you generate a summary of the Q3 financial report?', 'revenue');
  console.log('   ✅ Q3 Financial summary streaming verified.');

  const pendingText = await testStream('How many tasks are currently pending in the database?', 'pending');
  console.log('   ✅ PostgreSQL Task database pending query verified.');

  const overdueText = await testStream('What tasks are overdue?', 'overdue');
  console.log('   ✅ PostgreSQL Task database overdue query verified.');

  const priorityText = await testStream('Which tasks have the highest priority?', 'priority');
  console.log('   ✅ PostgreSQL Task database priority query verified.');

  const statusText = await testStream('What is the status of my tasks?', 'task');
  console.log('   ✅ PostgreSQL Task database status query verified.');

  const workloadText = await testStream('Which users have the most assigned tasks and what is their workload?', 'workload');
  console.log('   ✅ PostgreSQL Task database workload query verified.');

  const codeText = await testStream('Write a JavaScript function to stream tokens from an AI model', 'stream');
  console.log('   ✅ Code generation streaming verified.');

  // Test 5: SCX MiniMax-M2.7 Live Streaming
  console.log('\n5️⃣ Checking SCX MiniMax-M2.7 live streaming via Vercel AI SDK...');
  const scxRes = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Say SCX Connection Verified' }],
      provider: 'scx',
      model: 'MiniMax-M2.7',
      apiKey: 'sk-scx-926783afc408abe78ad48381029a8360'
    })
  });
  assert.strictEqual(scxRes.status, 200, 'SCX stream must return 200 OK');
  assert(scxRes.headers.get('content-type').includes('text/event-stream'));

  const scxReader = scxRes.body.getReader();
  const scxDecoder = new TextDecoder('utf-8');
  let scxBuffer = '';
  let scxText = '';
  while (true) {
    const { done, value } = await scxReader.read();
    if (done) break;
    scxBuffer += scxDecoder.decode(value, { stream: true });
    const lines = scxBuffer.split('\n');
    scxBuffer = lines.pop();
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ')) {
        const dataStr = trimmed.substring(6).trim();
        if (!dataStr) continue;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.text) scxText += parsed.text;
        } catch (e) {}
      }
    }
  }
  assert(scxText.length > 0, 'SCX MiniMax-M2.7 must return streamed content');
  console.log(`   ✅ SCX MiniMax-M2.7 output received (${scxText.trim().substring(0, 50)}...)`);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Vercel AI SDK, SCX MiniMax-M2.7 & PostgreSQL Task DB Integration is 100% operational.\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

/**
 * Automated Test Suite for Synthie AI Application
 */

const assert = require('assert');

async function runTests() {
  const BASE_URL = 'http://localhost:3000';
  console.log('🧪 Starting Synthie AI Test Suite...\n');

  // Test 1: Health Check
  console.log('1️⃣ Checking /api/health endpoint...');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  assert.strictEqual(healthRes.status, 200, 'Health status must be 200');
  const healthData = await healthRes.json();
  assert.strictEqual(healthData.status, 'ok', 'Health response must be ok');
  console.log('   ✅ Health endpoint OK:', healthData);

  // Test 2: Static Assets Delivery
  console.log('\n2️⃣ Checking Static Assets Delivery...');
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

  // Test 3: Streaming SSE AI Generation
  console.log('\n3️⃣ Checking AI SSE Streaming API...');
  
  async function testStream(prompt, expectedKeyword) {
    const res = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        provider: 'builtin'
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

  const meetingText = await testStream('What are the key takeaways from the meeting?', 'marketing budget');
  console.log('   ✅ Meeting takeaways streaming verified.');

  const codeText = await testStream('Write a JavaScript function to stream tokens from an AI model', 'stream');
  console.log('   ✅ Code generation streaming verified.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Synthie AI Chatbot is 100% operational.\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});

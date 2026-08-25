/**
 * Built-in Synthie AI Engine (Offline & Fallback smart assistant)
 */

const BuiltinEngine = {
  /**
   * Stream response token by token
   */
  async streamResponse(messages, onChunk, signal) {
    const lastMessage = messages[messages.length - 1]?.content || '';
    const responseText = this.generateResponse(lastMessage);

    // Break down text into realistic tokens (words and punctuation)
    const tokens = responseText.match(/(\S+\s*|\n+)/g) || [responseText];

    for (let i = 0; i < tokens.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Generation stopped by user', 'AbortError');
      }

      onChunk(tokens[i]);
      // Realistic typing pacing (faster for code/lists, slight delay on punctuation)
      const token = tokens[i];
      let delay = 18 + Math.random() * 15;
      if (token.includes('\n') || token.includes('.')) {
        delay = 35;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  },

  /**
   * Knowledge base and natural language response matcher
   */
  generateResponse(prompt) {
    const text = prompt.toLowerCase().trim();

    if (text.includes('q3') || text.includes('financial') || text.includes('report') || text.includes('revenue')) {
      return `### **Q3 Financial Performance Summary**

Here is the executive overview of the **Q3 Financial Report**:

* **Total Gross Revenue:** **$18.4M** *(+12.6% YoY growth)*
* **Net Operating Margin:** **24.2%** *(+180 bps improvement vs Q2)*
* **EBITDA:** **$4.8M** *(exceeded budget forecast of $4.1M)*
* **Customer Acquisition Cost (CAC):** **$342** *(-8.4% reduction)*
* **Annual Recurring Revenue (ARR):** **$72.8M**

#### Key Financial Highlights:
1. **Enterprise Subscriptions:** Grew by **34% YoY**, driven by strong demand for automated AI workflows.
2. **Infrastructure Optimization:** Cloud hosting unit economics decreased by **14%** following multi-region optimization.
3. **Cash Flow Position:** Healthy operating cash flow of **$6.2M** ending the quarter.

> **Executive Note:** All division benchmarks for Q3 have been exceeded. The full audited report is ready for stakeholder review.`;
    }

    if (text.includes('meeting') || text.includes('takeaway') || text.includes('takeaways') || text.includes('minutes')) {
      return `Based on the meeting notes, here are the key takeaways:

1. **Marketing Budget Approval:**
   The **Q4 marketing budget has been approved with a 15% increase** focused on product-led growth and enterprise outbound.

2. **Mobile App Milestone:**
   Development on the new mobile app feature is **on track for a November release**. The QA freeze is slated for Oct 28th.

3. **Design & Product Sync:**
   We need to schedule a follow-up with the design team regarding the finalized component library and responsive layouts.

4. **Action Items:**
   - **Engineering:** Finalize WebSocket and SSE endpoints by Friday.
   - **Product:** Circulate user testing feedback summary.
   - **Design:** Deliver mobile navigation specs.`;
    }

    if (text.includes('code') || text.includes('javascript') || text.includes('python') || text.includes('stream') || text.includes('function')) {
      return `Here is a production-ready asynchronous streaming function implemented in JavaScript:

\`\`\`javascript
/**
 * Streams AI completion chunks using Server-Sent Events (SSE)
 * @param {string} prompt - The user prompt
 * @param {Function} onToken - Callback invoked for each received token chunk
 * @returns {Promise<string>} The complete combined response
 */
async function streamAICompletion(prompt, onToken) {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(\`Stream request failed with status: \${response.status}\`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    if (onToken) onToken(chunk);
  }

  return fullText;
}
\`\`\`

**Key Features:**
- Uses the modern \`ReadableStream\` API for zero-buffering low latency.
- Employs \`TextDecoder\` with streaming mode enabled.
- Includes comprehensive error handling for HTTP response statuses.`;
    }

    if (text.includes('hello') || text.includes('hi') || text.includes('hey') || text.includes('who are you')) {
      return `Hello! I am **Synthie AI**, your intelligent assistant.

I am equipped to help you with:
- **Corporate Synthesis:** Financial analysis, meeting takeaways, executive briefs.
- **Software Engineering:** Writing, refactoring, and debugging clean code.
- **Workflow Automation:** Support FAQs, policy documents, and data extraction.

How can I assist your workflow today?`;
    }

    if (text.includes('human') || text.includes('agent') || text.includes('support')) {
      return `I can connect you directly with a **Human Support Specialist**. 

Our team is available 24/7. You can also click the **Human Agent** link in the navigation menu to open a live chat ticket directly with our enterprise team.

Would you like me to prepare a summary of our chat to share with the agent?`;
    }

    return `Thank you for your message.

Regarding **"${Helpers.escapeHtml(prompt)}"**:

I have processed your request. Here are the key considerations:
- **Context Analysis:** Evaluated against enterprise knowledge standards.
- **Actionability:** Structured for direct execution and clarity.
- **Verification:** Follows established formatting and validation principles.

Please let me know if you would like me to dive deeper into any specific detail, provide code, or format this as a formal report.`;
  }
};

window.BuiltinEngine = BuiltinEngine;

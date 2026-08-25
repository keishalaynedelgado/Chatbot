/**
 * Markdown rendering utility with code highlighting and copy capability
 */

const MarkdownRenderer = {
  /**
   * Parse Markdown string into safe, styled HTML
   */
  render(text) {
    if (!text) return '';

    // If marked is loaded from CDN/global
    if (typeof marked !== 'undefined' && marked.parse) {
      try {
        const rawHtml = marked.parse(text);
        return this.enhanceCodeBlocks(rawHtml);
      } catch (e) {
        console.warn('Marked parse error, using fallback:', e);
      }
    }

    return this.fallbackParse(text);
  },

  /**
   * Enhance code blocks with custom headers and copy buttons
   */
  enhanceCodeBlocks(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    doc.querySelectorAll('pre code').forEach((codeEl) => {
      const pre = codeEl.parentElement;
      const classList = codeEl.className || '';
      const langMatch = classList.match(/language-(\w+)/);
      const language = langMatch ? langMatch[1] : 'code';
      const rawCode = codeEl.innerText;

      const container = document.createElement('div');
      container.className = 'code-block-container not-prose my-3';

      const header = document.createElement('div');
      header.className = 'code-header';
      header.innerHTML = `
        <span>${language}</span>
        <button class="code-copy-btn" title="Copy code" onclick="Helpers.copyToClipboard(decodeURIComponent('${encodeURIComponent(rawCode)}')).then(ok => { if(ok) Helpers.showToast('Code copied to clipboard!'); })">
          <span class="material-symbols-outlined text-[14px]">content_copy</span>
          <span>Copy</span>
        </button>
      `;

      pre.parentNode.insertBefore(container, pre);
      container.appendChild(header);
      container.appendChild(pre);
    });

    return doc.body.innerHTML;
  },

  /**
   * Robust fallback Markdown parser
   */
  fallbackParse(text) {
    let out = Helpers.escapeHtml(text);

    // Code blocks
    out = out.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'code';
      const cleanCode = code.trim();
      const encoded = encodeURIComponent(cleanCode.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'"));
      return `
        <div class="code-block-container not-prose my-3">
          <div class="code-header">
            <span>${language}</span>
            <button class="code-copy-btn" onclick="Helpers.copyToClipboard(decodeURIComponent('${encoded}')).then(ok => { if(ok) Helpers.showToast('Code copied!'); })">
              <span class="material-symbols-outlined text-[14px]">content_copy</span>
              <span>Copy</span>
            </button>
          </div>
          <pre><code>${cleanCode}</code></pre>
        </div>
      `;
    });

    // Inline code
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    out = out.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    out = out.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // Blockquotes
    out = out.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');

    // Bold and Italic
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Unordered lists
    out = out.replace(/^\s*[\-\*]\s+(.*$)/gim, '<ul><li>$1</li></ul>');
    out = out.replace(/<\/ul>\s*<ul>/g, '');

    // Ordered lists
    out = out.replace(/^\s*\d+\.\s+(.*$)/gim, '<ol><li>$1</li></ol>');
    out = out.replace(/<\/ol>\s*<ol>/g, '');

    // Paragraphs / line breaks
    out = out.replace(/\n\n/g, '<br/><br/>');
    out = out.replace(/\n/g, '<br/>');

    return out;
  }
};

window.MarkdownRenderer = MarkdownRenderer;

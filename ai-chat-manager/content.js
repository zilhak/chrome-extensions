const STYLE_ID = 'ai-chat-font-controller';

const DEFAULT_SETTINGS = {
  enabled: true,
  chatWidth: 100,
  h1: 22,
  h2: 18,
  h3: 15,
  p: 13,
  li: 13,
  pre: 12,
  code: 12
};

// 사이트 감지
function getSiteType() {
  const host = window.location.hostname;
  if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) {
    return 'chatgpt';
  } else if (host.includes('gemini.google.com')) {
    return 'gemini';
  }
  return 'unknown';
}

// ChatGPT 대화 영역 셀렉터
const CHATGPT_SELECTORS = [
  '[data-message-author-role]',
  '.markdown',
  '.prose',
  '.text-message'
].join(', ');

// Gemini 대화 영역 셀렉터
const GEMINI_SELECTORS = [
  'message-content',
  '.markdown-main-panel',
  '.model-response-text',
  '.response-container-content',
  '.query-content',
  '.conversation-container'
].join(', ');

function generateCSS(settings) {
  if (!settings.enabled) {
    return '';
  }

  const siteType = getSiteType();
  let widthCSS = '';
  let selectors = '';

  if (siteType === 'chatgpt') {
    selectors = CHATGPT_SELECTORS;
    widthCSS = settings.chatWidth < 100 ? `
      main .mx-auto {
        max-width: ${settings.chatWidth}% !important;
      }
    ` : `
      main .mx-auto {
        max-width: none !important;
      }
      main .xl\\:max-w-\\[48rem\\],
      main .md\\:max-w-3xl,
      main .lg\\:max-w-\\[40rem\\],
      main .xl\\:max-w-\\[48rem\\] {
        max-width: none !important;
      }
      [class*="max-w-"] {
        max-width: none !important;
      }
    `;
  } else if (siteType === 'gemini') {
    selectors = GEMINI_SELECTORS;
    widthCSS = settings.chatWidth < 100 ? `
      .conversation-container,
      .chat-window,
      .response-container {
        max-width: ${settings.chatWidth}% !important;
        margin: 0 auto !important;
      }
    ` : `
      .conversation-container,
      .chat-window,
      .response-container {
        max-width: none !important;
      }
    `;
  } else {
    return '';
  }

  return `
    ${widthCSS}
    ${selectors} h1 {
      font-size: ${settings.h1}px !important;
      line-height: 1.3 !important;
    }
    ${selectors} h2 {
      font-size: ${settings.h2}px !important;
      line-height: 1.3 !important;
    }
    ${selectors} h3 {
      font-size: ${settings.h3}px !important;
      line-height: 1.4 !important;
    }
    ${selectors} p {
      font-size: ${settings.p}px !important;
      line-height: 1.5 !important;
    }
    ${selectors} li {
      font-size: ${settings.li}px !important;
      line-height: 1.5 !important;
    }
    ${selectors} pre,
    ${selectors} pre code {
      font-size: ${settings.pre}px !important;
      line-height: 1.4 !important;
    }
    ${selectors} code:not(pre code) {
      font-size: ${settings.code}px !important;
      line-height: 1.4 !important;
    }
    ${selectors} span,
    ${selectors} div:not([class]) {
      font-size: ${settings.p}px !important;
      line-height: 1.5 !important;
    }
  `;
}

function applyStyles(settings) {
  let styleEl = document.getElementById(STYLE_ID);

  if (!settings.enabled) {
    if (styleEl) {
      styleEl.remove();
    }
    return;
  }

  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = generateCSS(settings);
}

// 초기 로드
chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
  applyStyles(settings);
});

// 설정 변경 감지
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'sync') return;

  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    applyStyles(settings);
  });
});

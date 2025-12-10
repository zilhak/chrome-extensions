const STYLE_ID = 'chatgpt-font-size-controller';

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

// ChatGPT 대화 영역 셀렉터
const CHAT_SELECTORS = [
  '[data-message-author-role]',
  '.markdown',
  '.prose',
  '.text-message'
].join(', ');

function generateCSS(settings) {
  if (!settings.enabled) {
    return '';
  }

  const widthCSS = settings.chatWidth < 100 ? `
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

  return `
    ${widthCSS}
    ${CHAT_SELECTORS} h1 {
      font-size: ${settings.h1}px !important;
    }
    ${CHAT_SELECTORS} h2 {
      font-size: ${settings.h2}px !important;
    }
    ${CHAT_SELECTORS} h3 {
      font-size: ${settings.h3}px !important;
    }
    ${CHAT_SELECTORS} p {
      font-size: ${settings.p}px !important;
    }
    ${CHAT_SELECTORS} li {
      font-size: ${settings.li}px !important;
    }
    ${CHAT_SELECTORS} pre,
    ${CHAT_SELECTORS} pre code {
      font-size: ${settings.pre}px !important;
    }
    ${CHAT_SELECTORS} code:not(pre code) {
      font-size: ${settings.code}px !important;
    }
    ${CHAT_SELECTORS} span,
    ${CHAT_SELECTORS} div:not([class]) {
      font-size: ${settings.p}px !important;
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

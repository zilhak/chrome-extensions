type CopyMode = 'minimal' | 'normal' | 'full';
type FilterType = 'all' | 'api' | 'doc' | 'js' | 'css' | 'img' | 'other';

interface HarHeader {
  name: string;
  value: string;
}

interface HarPostData {
  text?: string;
  mimeType?: string;
}

interface HarRequest {
  method: string;
  url: string;
  headers: HarHeader[];
  postData?: HarPostData;
}

interface HarResponse {
  status: number;
  headers: HarHeader[];
}

interface HarEntry {
  request: HarRequest;
  response: HarResponse;
  _resourceType: string;
  getContent: (callback: (body: string) => void) => void;
}

(() => {
  const requests: HarEntry[] = [];
  let selectedEntry: HarEntry | null = null;
  let activeTypeFilter: FilterType = 'all';
  let filterText = '';

  const requestList = document.getElementById('request-list')!;
  const contextMenu = document.getElementById('context-menu')!;
  const toast = document.getElementById('toast')!;
  const countEl = document.getElementById('count')!;
  const clearBtn = document.getElementById('clear-btn')!;
  const filterInput = document.getElementById('filter-input') as HTMLInputElement;
  const typeButtons = document.querySelectorAll<HTMLButtonElement>('.type-btn');

  // ===== Type mapping =====
  const TYPE_MAP: Record<string, string[]> = {
    api: ['fetch', 'xhr'],
    doc: ['document'],
    js: ['script'],
    css: ['stylesheet'],
    img: ['image'],
  };

  function getTypeCategory(resourceType: string): string | null {
    if (resourceType === 'websocket') return null; // filtered out
    for (const [cat, types] of Object.entries(TYPE_MAP)) {
      if (types.includes(resourceType)) return cat;
    }
    return 'other';
  }

  // ===== Network listener =====
  chrome.devtools.network.onRequestFinished.addListener((entry) => {
    const harEntry = entry as unknown as HarEntry;
    const type = harEntry._resourceType;
    if (type === 'websocket') return;
    if (harEntry.request.url.startsWith('data:')) return;

    const index = requests.length;
    requests.push(harEntry);
    renderRow(harEntry, index);
    updateCount();
  });

  // ===== Render =====
  function renderRow(entry: HarEntry, index: number): void {
    const row = document.createElement('div');
    row.className = 'request-row';
    row.dataset.index = String(index);

    const method = entry.request.method;
    const status = entry.response.status;
    const category = getTypeCategory(entry._resourceType) || 'other';
    row.dataset.type = category;

    let pathDisplay: string;
    try {
      const url = new URL(entry.request.url);
      pathDisplay = url.pathname + url.search;
    } catch {
      pathDisplay = entry.request.url;
    }

    row.innerHTML =
      `<span class="method method-${method.toLowerCase()}">${method}</span>` +
      `<span class="status status-${Math.floor(status / 100)}xx">${status}</span>` +
      `<span class="path" title="${entry.request.url}">${pathDisplay}</span>` +
      `<span class="type">${entry._resourceType || 'other'}</span>`;

    row.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      selectedEntry = entry;
      selectRow(row);
      showContextMenu(e.clientX, e.clientY);
    });

    row.addEventListener('click', () => {
      selectedEntry = entry;
      selectRow(row);
    });

    requestList.appendChild(row);
    applyFilters(row);
  }

  function selectRow(row: HTMLElement): void {
    const prev = requestList.querySelector('.request-row.selected');
    if (prev) prev.classList.remove('selected');
    row.classList.add('selected');
  }

  function updateCount(): void {
    const visible = requestList.querySelectorAll('.request-row:not(.hidden)').length;
    countEl.textContent = `${visible} / ${requests.length}`;
  }

  // ===== Filters =====
  function applyFilters(row?: HTMLElement): void {
    if (!row) {
      requestList.querySelectorAll<HTMLElement>('.request-row').forEach(applyFilters);
      updateCount();
      return;
    }

    const typeMatch = activeTypeFilter === 'all' || row.dataset.type === activeTypeFilter;
    const pathEl = row.querySelector('.path');
    const url = pathEl ? pathEl.getAttribute('title') || '' : '';
    const textMatch = !filterText || url.toLowerCase().includes(filterText);

    row.classList.toggle('hidden', !(typeMatch && textMatch));
  }

  typeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      typeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeTypeFilter = btn.dataset.type as FilterType;
      applyFilters();
    });
  });

  filterInput.addEventListener('input', () => {
    filterText = filterInput.value.toLowerCase();
    applyFilters();
  });

  clearBtn.addEventListener('click', () => {
    requests.length = 0;
    requestList.innerHTML = '';
    updateCount();
  });

  // ===== Context menu =====
  function showContextMenu(x: number, y: number): void {
    const submenu = contextMenu.querySelector<HTMLElement>('.submenu');
    if (submenu) {
      submenu.style.top = '-1px';
      submenu.style.bottom = 'auto';
    }

    contextMenu.classList.remove('hidden');
    const rect = contextMenu.getBoundingClientRect();
    const bw = document.body.clientWidth;
    const bh = document.body.clientHeight;

    if (x + rect.width > bw) x = bw - rect.width - 4;
    if (x < 0) x = 0;

    if (y + rect.height > bh) {
      y = y - rect.height;
      if (y < 0) y = 0;
    }

    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';

    if (submenu) {
      submenu.style.display = 'block';
      submenu.style.visibility = 'hidden';
      const submenuRect = submenu.getBoundingClientRect();
      submenu.style.display = '';
      submenu.style.visibility = '';

      if (submenuRect.bottom > bh) {
        submenu.style.top = 'auto';
        submenu.style.bottom = '-1px';
      }
    }
  }

  function hideContextMenu(): void {
    contextMenu.classList.add('hidden');
  }

  document.addEventListener('click', hideContextMenu);
  document.addEventListener('contextmenu', (e) => {
    if (!(e.target as HTMLElement).closest('.request-row')) hideContextMenu();
  });

  contextMenu.querySelectorAll<HTMLElement>('.submenu-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedEntry) {
        copyTransaction(selectedEntry, item.dataset.mode as CopyMode);
      }
      hideContextMenu();
    });
  });

  // ===== Copy logic =====
  function copyTransaction(entry: HarEntry, mode: CopyMode): void {
    entry.getContent((responseBody: string) => {
      let data: unknown;
      switch (mode) {
        case 'minimal':
          data = formatMinimal(entry, responseBody);
          break;
        case 'normal':
          data = formatNormal(entry, responseBody);
          break;
        case 'full':
          data = formatFull(entry, responseBody);
          break;
      }
      const text = JSON.stringify(data, null, 2);
      copyToClipboard(text);
      showToast(`Copied (${mode})`);
    });
  }

  // ===== Formatters =====
  function parseUrl(urlStr: string): { endpoint: string; query?: Record<string, string> } {
    const url = new URL(urlStr);
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => {
      query[k] = v;
    });
    return {
      endpoint: url.origin + url.pathname,
      query: Object.keys(query).length > 0 ? query : undefined,
    };
  }

  function tryParseJson(str: string | null | undefined): unknown {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  }

  function getRequestBody(entry: HarEntry): unknown {
    const postData = entry.request.postData;
    if (!postData || !postData.text) return undefined;
    return tryParseJson(postData.text);
  }

  function formatMinimal(entry: HarEntry, responseBody: string) {
    const { endpoint, query } = parseUrl(entry.request.url);
    return {
      method: entry.request.method,
      endpoint,
      query,
      body: getRequestBody(entry),
      response: tryParseJson(responseBody),
    };
  }

  function formatNormal(entry: HarEntry, responseBody: string) {
    const { endpoint, query } = parseUrl(entry.request.url);
    return {
      request: {
        method: entry.request.method,
        endpoint,
        query,
        headers: headersToObject(entry.request.headers, true),
        body: getRequestBody(entry),
      },
      response: {
        status: entry.response.status,
        headers: headersToObject(entry.response.headers, true),
        body: tryParseJson(responseBody),
      },
    };
  }

  function formatFull(entry: HarEntry, responseBody: string) {
    const { endpoint, query } = parseUrl(entry.request.url);
    return {
      request: {
        method: entry.request.method,
        endpoint,
        query,
        headers: headersToObject(entry.request.headers, false),
        body: getRequestBody(entry),
      },
      response: {
        status: entry.response.status,
        headers: headersToObject(entry.response.headers, false),
        body: tryParseJson(responseBody),
      },
    };
  }

  // ===== Header helpers =====
  function headersToObject(headers: HarHeader[], summarizeCookies: boolean): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const h of headers) {
      const name = h.name.toLowerCase();
      // Skip HTTP/2 pseudo-headers
      if (name.startsWith(':')) continue;

      if (summarizeCookies && name === 'cookie') {
        obj[name] = summarizeCookieHeader(h.value);
      } else if (summarizeCookies && name === 'set-cookie') {
        obj[name] = summarizeSetCookieHeader(h.value);
      } else {
        obj[name] = h.value;
      }
    }
    return obj;
  }

  function summarizeCookieHeader(cookieStr: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    cookieStr.split(';').forEach((pair) => {
      const eqIndex = pair.indexOf('=');
      if (eqIndex === -1) return;
      const name = pair.substring(0, eqIndex).trim();
      const value = pair.substring(eqIndex + 1).trim();
      if (!name) return;
      result[name] = value.length > 10 ? { size: value.length } : value;
    });
    return result;
  }

  function summarizeSetCookieHeader(setCookieStr: string): unknown {
    const parts = setCookieStr.split(';');
    const eqIndex = parts[0].indexOf('=');
    if (eqIndex === -1) return setCookieStr;
    const name = parts[0].substring(0, eqIndex).trim();
    const value = parts[0].substring(eqIndex + 1).trim();
    if (value.length > 10) {
      return { [name]: { size: value.length } };
    }
    return { [name]: value };
  }

  // ===== Clipboard =====
  function copyToClipboard(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  // ===== Toast =====
  let toastTimer: ReturnType<typeof setTimeout>;
  function showToast(msg: string): void {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toastTimer = setTimeout(() => toast.classList.add('hidden'), 1500);
  }
})();

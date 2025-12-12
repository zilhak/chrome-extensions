let hotkeys = [];
let editingIndex = null;

document.addEventListener('DOMContentLoaded', () => {
  const hotkeyList = document.getElementById('hotkey-list');
  const addBtn = document.getElementById('add-btn');

  // 설정 로드
  chrome.storage.sync.get({ hotkeys: [] }, (result) => {
    hotkeys = result.hotkeys || [];
    render();
  });

  // 전역 키 이벤트 (런처 모드)
  document.addEventListener('keydown', (e) => {
    // 입력 필드에서는 무시
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

    // ESC: 창 닫기
    if (e.key === 'Escape') {
      window.close();
      return;
    }

    // 매칭되는 단축키 찾기
    const key = normalizeKey(e.key, e.shiftKey);
    const matched = hotkeys.find(h => h.key === key);

    if (matched && matched.url) {
      e.preventDefault();
      window.location.href = matched.url;
    }
  });

  // + 버튼
  addBtn.addEventListener('click', () => {
    hotkeys.push({ key: '', url: '', description: '' });
    editingIndex = hotkeys.length - 1;
    save();
  });

  function normalizeKey(key, shiftKey) {
    let normalizedKey;
    if (key === ' ') normalizedKey = 'Space';
    else if (key.length === 1) normalizedKey = key.toUpperCase();
    else normalizedKey = key;

    // Shift 조합 (Shift 키 자체는 제외)
    if (shiftKey && key !== 'Shift') {
      return 'Shift+' + normalizedKey;
    }
    return normalizedKey;
  }

  function save() {
    chrome.storage.sync.set({ hotkeys }, render);
  }

  function render() {
    hotkeyList.innerHTML = '';

    if (hotkeys.length === 0) {
      hotkeyList.innerHTML = '<div class="empty-hint">+ 버튼을 눌러 단축키를 추가하세요</div>';
      return;
    }

    hotkeys.forEach((hotkey, index) => {
      const row = document.createElement('div');
      row.className = 'hotkey-row';

      const isEditing = editingIndex === index;

      if (isEditing) {
        // 편집 모드
        row.innerHTML = `
          <input type="text"
                 class="key-input"
                 placeholder="키"
                 value="${escapeHtml(hotkey.key)}"
                 readonly
                 data-index="${index}">
          <div class="edit-fields">
            <input type="url"
                   class="url-input"
                   placeholder="URL"
                   value="${escapeHtml(hotkey.url)}"
                   data-index="${index}">
            <input type="text"
                   class="desc-input"
                   placeholder="설명 (선택)"
                   value="${escapeHtml(hotkey.description || '')}"
                   data-index="${index}">
          </div>
          <button class="done-btn" data-index="${index}">✓</button>
          <button class="delete-btn" data-index="${index}">×</button>
        `;

        // 키 입력
        const keyInput = row.querySelector('.key-input');
        keyInput.addEventListener('keydown', (e) => {
          e.preventDefault();
          // Tab, Escape, Shift만 누른 경우는 무시
          if (['Tab', 'Escape'].includes(e.key)) {
            keyInput.blur();
            return;
          }
          if (e.key === 'Shift') return;

          const key = normalizeKey(e.key, e.shiftKey);
          hotkeys[index].key = key;
          keyInput.value = key;
          save();
        });

        // URL 입력
        const urlInput = row.querySelector('.url-input');
        urlInput.addEventListener('change', (e) => {
          hotkeys[index].url = e.target.value;
          save();
        });

        // 설명 입력
        const descInput = row.querySelector('.desc-input');
        descInput.addEventListener('change', (e) => {
          hotkeys[index].description = e.target.value;
          save();
        });
        descInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            hotkeys[index].description = e.target.value;
            editingIndex = null;
            save();
          }
        });

        // 완료 버튼
        const doneBtn = row.querySelector('.done-btn');
        doneBtn.addEventListener('click', () => {
          editingIndex = null;
          render();
        });

      } else {
        // 보기 모드
        const displayText = hotkey.description || hotkey.url || '(미설정)';

        row.innerHTML = `
          <span class="key-badge">${escapeHtml(hotkey.key) || '?'}</span>
          <span class="display-text">${escapeHtml(displayText)}</span>
          <button class="edit-btn" data-index="${index}">✎</button>
          <button class="delete-btn" data-index="${index}">×</button>
        `;

        // 편집 버튼
        const editBtn = row.querySelector('.edit-btn');
        editBtn.addEventListener('click', () => {
          editingIndex = index;
          render();
        });
      }

      // 삭제 버튼
      const deleteBtn = row.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => {
        hotkeys.splice(index, 1);
        if (editingIndex === index) editingIndex = null;
        else if (editingIndex > index) editingIndex--;
        save();
      });

      hotkeyList.appendChild(row);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
});

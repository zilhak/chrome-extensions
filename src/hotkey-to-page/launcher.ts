interface HotkeyItem {
  key: string;
  url: string;
  matchKeyword: string;
  description: string;
}

interface Zone {
  name: string;
  hotkeys: HotkeyItem[];
}

type ZoneMap = Record<string, Zone>;

interface DraggedItem {
  zoneId: string;
  index: number;
}

// 상태 변수
let zones: ZoneMap = {};
let editingKey: string | null = null; // "zoneId-index" 형태
let deletingKey: string | null = null;
let draggedItem: DraggedItem | null = null;
let editingZoneId: string | null = null; // 영역 이름 편집 중

// URL 파라미터에서 모드 및 이전 URL 읽기
const urlParams = new URLSearchParams(window.location.search);
const launcherMode = urlParams.get('mode') || 'new';
const prevUrl = urlParams.get('prevUrl') ? decodeURIComponent(urlParams.get('prevUrl')!) : '';

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('grid-container')!;

  // 설정 로드 (마이그레이션 포함)
  chrome.storage.sync.get({ zones: null, hotkeys: null }, (result) => {
    if (result.zones) {
      zones = result.zones;
    } else if (result.hotkeys) {
      // 기존 데이터 마이그레이션
      zones = { "0-0": { name: "Default", hotkeys: result.hotkeys } };
      save();
    } else {
      zones = { "0-0": { name: "Default", hotkeys: [] } };
    }
    render();
  });

  // 전역 키 이벤트 (런처 모드)
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

    const key = normalizeKey(e.code, e.key, e.shiftKey);

    // 모든 영역에서 매칭되는 단축키 찾기
    for (const zoneId of Object.keys(zones)) {
      const matched = zones[zoneId].hotkeys.find(h => h.key === key);
      if (matched && matched.url) {
        e.preventDefault();
        chrome.runtime.sendMessage({
          action: 'navigateOrSwitch',
          url: matched.url,
          matchKeyword: matched.matchKeyword || '',
          mode: launcherMode,
          prevUrl: prevUrl
        });
        return;
      }
    }
  });

  function normalizeKey(code: string, key: string, shiftKey: boolean): string {
    let normalizedKey: string;

    // 물리적 키 코드에서 알파벳/숫자 추출 (입력기 상태 무관)
    if (code.startsWith('Key')) {
      normalizedKey = code.slice(3); // 'KeyB' → 'B'
    } else if (code.startsWith('Digit')) {
      normalizedKey = code.slice(5); // 'Digit1' → '1'
    } else if (code === 'Space') {
      normalizedKey = 'Space';
    } else {
      // 특수키는 기존 방식 유지
      normalizedKey = key.length === 1 ? key.toUpperCase() : key;
    }

    if (shiftKey && key !== 'Shift') {
      return 'Shift+' + normalizedKey;
    }
    return normalizedKey;
  }

  // 데이터만 저장 (UI 갱신 없음)
  function save(): void {
    chrome.storage.sync.set({ zones });
  }

  // 영역이 활성화 가능한지 체크 (인접 영역 존재 여부)
  function canActivateZone(x: number, y: number): boolean {
    if (x === 0 && y === 0) return true;
    if (x < 0 || y < 0 || x > 2 || y > 2) return false;

    // 인접한 활성 영역이 있는지 확인
    const neighbors = [
      `${x-1}-${y}`, // 좌
      `${x}-${y-1}`, // 상
    ];
    return neighbors.some(id => zones[id]);
  }

  // 영역 삭제 가능 여부 (의존하는 영역이 없어야 함)
  function canDeleteZone(x: number, y: number): boolean {
    if (x === 0 && y === 0) return false; // Default는 삭제 불가

    // 이 영역에 의존하는 활성 영역이 있는지 확인
    const dependents = [
      `${x+1}-${y}`, // 우
      `${x}-${y+1}`, // 하
    ];
    return !dependents.some(id => zones[id]);
  }

  function render(): void {
    gridContainer.innerHTML = '';

    // 그리드 크기 계산 (활성 영역 기준)
    let maxX = 0, maxY = 0;
    Object.keys(zones).forEach(id => {
      const [x, y] = id.split('-').map(Number);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    // 확장 가능 영역까지 포함 (+1)
    const gridWidth = Math.min(maxX + 2, 3);
    const gridHeight = Math.min(maxY + 2, 3);

    // 그리드 템플릿 설정 (활성 영역은 1fr, 확장 영역은 20px)
    const colSizes: string[] = [];
    for (let x = 0; x < gridWidth; x++) {
      // 이 열에 활성 영역이 있는지 확인
      let hasActiveInCol = false;
      for (let y = 0; y <= maxY; y++) {
        if (zones[`${x}-${y}`]) {
          hasActiveInCol = true;
          break;
        }
      }
      colSizes.push(hasActiveInCol ? '1fr' : '20px');
    }

    const rowSizes: string[] = [];
    for (let y = 0; y < gridHeight; y++) {
      // 이 행에 활성 영역이 있는지 확인
      let hasActiveInRow = false;
      for (let x = 0; x <= maxX; x++) {
        if (zones[`${x}-${y}`]) {
          hasActiveInRow = true;
          break;
        }
      }
      rowSizes.push(hasActiveInRow ? '1fr' : '20px');
    }

    gridContainer.style.gridTemplateColumns = colSizes.join(' ');
    gridContainer.style.gridTemplateRows = rowSizes.join(' ');

    // 그리드 셀 렌더링
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const zoneId = `${x}-${y}`;
        const zone = zones[zoneId];

        if (zone) {
          // 활성 영역
          renderActiveZone(zoneId, zone, x, y);
        } else if (canActivateZone(x, y)) {
          // 확장 가능 영역
          renderExpandButton(zoneId);
        }
      }
    }
  }

  function renderActiveZone(zoneId: string, zone: Zone, x: number, y: number): void {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'zone active';
    zoneEl.dataset.zoneId = zoneId;

    // 영역 헤더
    const header = document.createElement('div');
    header.className = 'zone-header';

    const isEditingZone = editingZoneId === zoneId;

    if (isEditingZone) {
      // 편집 모드
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'zone-title-input';
      titleInput.value = zone.name || '';
      titleInput.placeholder = zoneId === '0-0' ? 'Default' : `Zone ${zoneId}`;

      titleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          zones[zoneId].name = titleInput.value;
          editingZoneId = null;
          save();
          // 인라인으로 UI 업데이트
          updateZoneHeader(header, zoneId, zone, x, y);
        } else if (e.key === 'Escape') {
          editingZoneId = null;
          updateZoneHeader(header, zoneId, zone, x, y);
        }
      });

      titleInput.addEventListener('blur', () => {
        if (editingZoneId === zoneId) {
          zones[zoneId].name = titleInput.value;
          editingZoneId = null;
          save();
          updateZoneHeader(header, zoneId, zone, x, y);
        }
      });

      header.appendChild(titleInput);
      setTimeout(() => titleInput.focus(), 0);

    } else {
      renderZoneHeaderContent(header, zoneId, zone, x, y);
    }

    zoneEl.appendChild(header);

    // 핫키 리스트
    const list = document.createElement('div');
    list.className = 'hotkey-list';

    if (zone.hotkeys.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'empty-hint';
      hint.textContent = '+ 버튼으로 추가';
      list.appendChild(hint);
    }

    zone.hotkeys.forEach((hotkey, index) => {
      const itemKey = `${zoneId}-${index}`;
      const row = createHotkeyRow(zoneId, hotkey, index, itemKey, list);
      list.appendChild(row);
    });

    zoneEl.appendChild(list);

    // 영역 드롭 이벤트 (다른 영역에서 드래그해온 경우)
    zoneEl.addEventListener('dragover', (e) => {
      if (draggedItem && draggedItem.zoneId !== zoneId) {
        e.preventDefault();
        zoneEl.classList.add('zone-drop-target');
      }
    });

    zoneEl.addEventListener('dragleave', (e) => {
      if (!zoneEl.contains(e.relatedTarget as Node)) {
        zoneEl.classList.remove('zone-drop-target');
      }
    });

    zoneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      zoneEl.classList.remove('zone-drop-target');

      if (draggedItem && draggedItem.zoneId !== zoneId) {
        // 다른 영역에서 이동
        const item = zones[draggedItem.zoneId].hotkeys.splice(draggedItem.index, 1)[0];
        zones[zoneId].hotkeys.push(item);
        draggedItem = null;
        save();
        render();
      }
    });

    // 추가 버튼
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
      zones[zoneId].hotkeys.push({ key: '', url: '', description: '', matchKeyword: '' });
      editingKey = `${zoneId}-${zones[zoneId].hotkeys.length - 1}`;
      save();
      render();
    });
    zoneEl.appendChild(addBtn);

    gridContainer.appendChild(zoneEl);
  }

  // 영역 헤더 내용 렌더링 (보기 모드)
  function renderZoneHeaderContent(header: HTMLElement, zoneId: string, zone: Zone, x: number, y: number): void {
    const titleWrapper = document.createElement('div');
    titleWrapper.className = 'zone-title-wrapper';

    const title = document.createElement('span');
    title.className = 'zone-title';
    title.textContent = zone.name || (zoneId === '0-0' ? 'Default' : `Zone ${zoneId}`);
    titleWrapper.appendChild(title);

    const editZoneBtn = document.createElement('button');
    editZoneBtn.className = 'zone-edit-btn';
    editZoneBtn.textContent = '✎';
    editZoneBtn.addEventListener('click', () => {
      editingZoneId = zoneId;
      render();
    });
    titleWrapper.appendChild(editZoneBtn);

    header.appendChild(titleWrapper);

    // 영역 삭제 버튼
    if (canDeleteZone(x, y)) {
      const deleteZoneBtn = document.createElement('button');
      deleteZoneBtn.className = 'zone-delete-btn';
      deleteZoneBtn.textContent = '×';
      deleteZoneBtn.addEventListener('click', () => {
        delete zones[zoneId];
        save();
        render();
      });
      header.appendChild(deleteZoneBtn);
    }
  }

  // 영역 헤더 인라인 업데이트
  function updateZoneHeader(header: HTMLElement, zoneId: string, zone: Zone, x: number, y: number): void {
    header.innerHTML = '';
    renderZoneHeaderContent(header, zoneId, zone, x, y);
  }

  function renderExpandButton(zoneId: string): void {
    const zoneEl = document.createElement('div');
    zoneEl.className = 'zone expandable';

    const btn = document.createElement('button');
    btn.className = 'expand-btn';
    btn.textContent = '+';
    btn.addEventListener('click', () => {
      zones[zoneId] = { name: '', hotkeys: [] };
      save();
      render();
    });

    zoneEl.appendChild(btn);
    gridContainer.appendChild(zoneEl);
  }

  function createHotkeyRow(zoneId: string, hotkey: HotkeyItem, index: number, itemKey: string, listEl: HTMLElement): HTMLDivElement {
    const row = document.createElement('div');
    row.className = 'hotkey-row';

    const isEditing = editingKey === itemKey;

    if (isEditing) {
      // 편집 모드
      row.innerHTML = `
        <input type="text" class="key-input" placeholder="키" value="${escapeHtml(hotkey.key)}" readonly>
        <div class="edit-fields">
          <input type="url" class="url-input" placeholder="URL" value="${escapeHtml(hotkey.url)}">
          <input type="text" class="match-input" placeholder="동일성 키워드 (선택)" value="${escapeHtml(hotkey.matchKeyword || '')}">
          <input type="text" class="desc-input" placeholder="설명 (선택)" value="${escapeHtml(hotkey.description || '')}">
        </div>
        <button class="done-btn">✓</button>
        <button class="delete-btn">×</button>
      `;

      const keyInput = row.querySelector('.key-input') as HTMLInputElement;
      keyInput.addEventListener('keydown', (e) => {
        e.preventDefault();
        if (['Tab', 'Escape'].includes(e.key)) {
          keyInput.blur();
          return;
        }
        if (e.key === 'Shift') return;

        const key = normalizeKey(e.code, e.key, e.shiftKey);
        zones[zoneId].hotkeys[index].key = key;
        keyInput.value = key;
        save(); // 데이터만 저장, UI 갱신 없음
      });

      (row.querySelector('.url-input') as HTMLInputElement).addEventListener('change', (e) => {
        zones[zoneId].hotkeys[index].url = (e.target as HTMLInputElement).value;
        save();
      });

      (row.querySelector('.match-input') as HTMLInputElement).addEventListener('change', (e) => {
        zones[zoneId].hotkeys[index].matchKeyword = (e.target as HTMLInputElement).value;
        save();
      });

      (row.querySelector('.desc-input') as HTMLInputElement).addEventListener('change', (e) => {
        zones[zoneId].hotkeys[index].description = (e.target as HTMLInputElement).value;
        save();
      });

      row.querySelector('.done-btn')!.addEventListener('mousedown', (e) => {
        e.preventDefault();
        editingKey = null;
        save();
        // 해당 row만 교체
        const newRow = createHotkeyRow(zoneId, hotkey, index, itemKey, listEl);
        row.replaceWith(newRow);
      });

      row.querySelector('.delete-btn')!.addEventListener('mousedown', (e) => {
        e.preventDefault();
        zones[zoneId].hotkeys.splice(index, 1);
        editingKey = null;
        save();
        render();
      });

    } else {
      // 보기 모드
      row.draggable = true;
      row.dataset.zoneId = zoneId;
      row.dataset.index = String(index);

      const displayText = hotkey.description || hotkey.url || '(미설정)';
      const hasMatch = hotkey.matchKeyword ? ' 🔗' : '';
      const isDeleting = deletingKey === itemKey;

      row.innerHTML = `
        <span class="drag-handle">⋮⋮</span>
        <span class="key-badge">${escapeHtml(hotkey.key) || '?'}</span>
        <span class="display-text">${escapeHtml(displayText)}${hasMatch}</span>
        <button class="edit-btn">✎</button>
        <button class="delete-btn${isDeleting ? ' confirm' : ''}">${isDeleting ? 'ok?' : '×'}</button>
      `;

      // 드래그 이벤트
      row.addEventListener('dragstart', (e) => {
        draggedItem = { zoneId, index };
        row.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        draggedItem = null;
        document.querySelectorAll('.drop-target, .zone-drop-target').forEach(el => {
          el.classList.remove('drop-target', 'zone-drop-target');
        });
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedItem && (draggedItem.zoneId !== zoneId || draggedItem.index !== index)) {
          row.classList.add('drop-target');
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drop-target');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        row.classList.remove('drop-target');

        if (draggedItem) {
          if (draggedItem.zoneId === zoneId) {
            // 같은 영역 내 이동
            const item = zones[zoneId].hotkeys.splice(draggedItem.index, 1)[0];
            zones[zoneId].hotkeys.splice(index, 0, item);
          } else {
            // 다른 영역에서 이동
            const item = zones[draggedItem.zoneId].hotkeys.splice(draggedItem.index, 1)[0];
            zones[zoneId].hotkeys.splice(index, 0, item);
          }
          draggedItem = null;
          save();
          render();
        }
      });

      row.querySelector('.edit-btn')!.addEventListener('click', () => {
        editingKey = itemKey;
        deletingKey = null;
        // 해당 row만 교체
        const newRow = createHotkeyRow(zoneId, hotkey, index, itemKey, listEl);
        row.replaceWith(newRow);
      });

      const deleteBtn = row.querySelector('.delete-btn')!;
      if (isDeleting) {
        deleteBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          zones[zoneId].hotkeys.splice(index, 1);
          deletingKey = null;
          save();
          render();
        });
      } else {
        deleteBtn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          deletingKey = itemKey;
          // 해당 버튼만 교체
          deleteBtn.textContent = 'ok?';
          deleteBtn.classList.add('confirm');
          // 이벤트 리스너 교체
          deleteBtn.replaceWith(deleteBtn.cloneNode(true));
          row.querySelector('.delete-btn')!.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            zones[zoneId].hotkeys.splice(index, 1);
            deletingKey = null;
            save();
            render();
          });
        });
      }
    }

    return row;
  }

  function escapeHtml(str: string): string {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  }
});

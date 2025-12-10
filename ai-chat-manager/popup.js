const PRESETS = {
  xsmall: {
    h1: 18,
    h2: 15,
    h3: 13,
    p: 11,
    li: 11,
    pre: 10,
    code: 10
  },
  small: {
    h1: 22,
    h2: 18,
    h3: 15,
    p: 13,
    li: 13,
    pre: 12,
    code: 12
  },
  large: {
    h1: 32,
    h2: 26,
    h3: 22,
    p: 18,
    li: 18,
    pre: 16,
    code: 16
  }
};

const DEFAULT_SETTINGS = {
  enabled: true,
  chatWidth: 100,
  ...PRESETS.small
};
const TAGS = ['h1', 'h2', 'h3', 'p', 'li', 'pre', 'code'];

document.addEventListener('DOMContentLoaded', () => {
  const enabledToggle = document.getElementById('enabled');
  const controls = document.getElementById('controls');
  const disabledMessage = document.getElementById('disabled-message');
  const applyBtn = document.getElementById('apply');

  // 프리셋 버튼
  const presetXSmall = document.getElementById('preset-xsmall');
  const presetSmall = document.getElementById('preset-small');
  const presetLarge = document.getElementById('preset-large');

  // 너비 슬라이더
  const widthSlider = document.getElementById('chatWidth');
  const widthValue = document.getElementById('width-value');

  // 저장된 설정 불러오기
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    enabledToggle.checked = settings.enabled;
    updateControlsVisibility(settings.enabled);
    updateSliders(settings);

    // 너비 설정
    widthSlider.value = settings.chatWidth || 100;
    widthValue.textContent = `${settings.chatWidth || 100}%`;
  });

  // 활성화 토글 (즉시 적용)
  enabledToggle.addEventListener('change', () => {
    const enabled = enabledToggle.checked;
    updateControlsVisibility(enabled);

    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      settings.enabled = enabled;
      chrome.storage.sync.set(settings);
    });
  });

  // 슬라이더 input 이벤트 (UI만 업데이트, 저장 안함)
  TAGS.forEach((tag) => {
    const slider = document.getElementById(tag);
    const valueDisplay = document.getElementById(`${tag}-value`);

    slider.addEventListener('input', () => {
      valueDisplay.textContent = `${slider.value}px`;
    });
  });

  // 너비 슬라이더 (즉시 적용)
  widthSlider.addEventListener('input', () => {
    widthValue.textContent = `${widthSlider.value}%`;
  });

  widthSlider.addEventListener('change', () => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
      settings.chatWidth = parseInt(widthSlider.value, 10);
      chrome.storage.sync.set(settings);
    });
  });

  // 적용 버튼 (글자 크기만)
  applyBtn.addEventListener('click', () => {
    const settings = {
      enabled: enabledToggle.checked,
      chatWidth: parseInt(widthSlider.value, 10)
    };
    TAGS.forEach((tag) => {
      settings[tag] = parseInt(document.getElementById(tag).value, 10);
    });
    chrome.storage.sync.set(settings);
  });

  // 프리셋 버튼 (즉시 적용)
  presetXSmall.addEventListener('click', () => applyPreset('xsmall'));
  presetSmall.addEventListener('click', () => applyPreset('small'));
  presetLarge.addEventListener('click', () => applyPreset('large'));

  function applyPreset(name) {
    const preset = { ...PRESETS[name], enabled: enabledToggle.checked };
    chrome.storage.sync.set(preset);
    updateSliders(preset);
  }

  function updateSliders(settings) {
    TAGS.forEach((tag) => {
      const slider = document.getElementById(tag);
      const valueDisplay = document.getElementById(`${tag}-value`);
      slider.value = settings[tag];
      valueDisplay.textContent = `${settings[tag]}px`;
    });
  }

  function updateControlsVisibility(enabled) {
    if (enabled) {
      controls.classList.remove('disabled');
      disabledMessage.classList.remove('show');
    } else {
      controls.classList.add('disabled');
      disabledMessage.classList.add('show');
    }
  }
});

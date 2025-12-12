// 단축키 명령어 처리
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-launcher') {
    // 새 탭에서 열기
    chrome.tabs.create({
      url: chrome.runtime.getURL('launcher.html')
    });
  } else if (command === 'open-launcher-current') {
    // 현재 탭에서 열기
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.update(tabs[0].id, {
          url: chrome.runtime.getURL('launcher.html')
        });
      }
    });
  }
});

// 확장 프로그램 아이콘 클릭 시에도 런처 열기
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('launcher.html')
  });
});

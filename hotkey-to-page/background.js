// 단축키 명령어 처리
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-launcher') {
    // 새 탭에서 열기 (mode=new)
    chrome.tabs.create({
      url: chrome.runtime.getURL('launcher.html?mode=new')
    });
  } else if (command === 'open-launcher-current') {
    // 현재 탭에서 열기 (mode=current, 이전 URL 저장)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const prevUrl = encodeURIComponent(tabs[0].url || '');
        chrome.tabs.update(tabs[0].id, {
          url: chrome.runtime.getURL(`launcher.html?mode=current&prevUrl=${prevUrl}`)
        });
      }
    });
  }
});

// 확장 프로그램 아이콘 클릭 시에도 런처 열기
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('launcher.html?mode=new')
  });
});

// 런처에서 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'navigateOrSwitch') {
    handleNavigateOrSwitch(request, sender.tab);
  }
  return true;
});

// 탭 전환 또는 네비게이션 처리
async function handleNavigateOrSwitch(request, launcherTab) {
  const { url, matchKeyword, mode, prevUrl } = request;

  // 동일성 키워드가 있으면 해당 URL로 시작하는 탭 검색
  if (matchKeyword) {
    try {
      // 모든 탭 검색
      const tabs = await chrome.tabs.query({});
      const matchedTab = tabs.find(tab =>
        tab.url && tab.url.startsWith(matchKeyword) && tab.id !== launcherTab.id
      );

      if (matchedTab) {
        // 매칭된 탭이 있으면 해당 탭으로 전환
        await chrome.tabs.update(matchedTab.id, { active: true });
        await chrome.windows.update(matchedTab.windowId, { focused: true });

        // 런처 탭 처리
        if (mode === 'new') {
          // 새 탭으로 열었으면 런처 탭 닫기
          await chrome.tabs.remove(launcherTab.id);
        } else if (mode === 'current' && prevUrl) {
          // 현재 탭으로 열었으면 이전 URL로 복원
          await chrome.tabs.update(launcherTab.id, { url: prevUrl });
        }
        return;
      }
    } catch (e) {
      console.error('Tab search error:', e);
    }
  }

  // 매칭된 탭이 없으면 현재 탭에서 URL로 이동
  if (url) {
    await chrome.tabs.update(launcherTab.id, { url: url });
  }
}

# ai-chat-manager (AI Chat Font Controller)

AI 채팅 사이트의 글자 크기 및 대화 영역 너비를 조절하는 Chrome 확장 프로그램

## 대상 사이트

- `chatgpt.com` / `chat.openai.com`
- `gemini.google.com`

## 구성

- **content script**: 페이지에 주입되어 CSS 변수로 폰트 크기/너비 조절
- **popup**: 사용자가 값을 조절하는 UI (다크 테마)
- **storage**: `chrome.storage`로 설정 값 저장

## 파일 구조

```
src/ai-chat-manager/
├── manifest.json   # Manifest V3, permissions: storage
├── content.ts      # 페이지 주입 스크립트
├── popup.html      # 팝업 UI
├── popup.ts        # 팝업 로직
├── popup.css       # 팝업 스타일
└── icons/          # 아이콘 (16, 48, 128px)
```

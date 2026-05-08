# hotkey-to-page (Hotkey to Page)

단축키로 지정한 웹페이지를 빠르게 여는 Chrome 확장 프로그램. 북마크 연동 지원.

## 기능

- 단축키로 런처 페이지 열기
- 런처에서 URL 검색/선택하여 이동
- 북마크 폴더 연동
- 영역(그룹) 관리 및 드래그 드롭 정렬

## 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl+Shift+Q` (Mac: `MacCtrl+Shift+Q`) | 런처를 새 탭에서 열기 |
| `Ctrl+Shift+A` (Mac: `MacCtrl+Shift+A`) | 런처를 현재 탭에서 열기 |

## 구성

- **background (service worker)**: 단축키 명령 처리, 탭 네비게이션
- **launcher**: 전체 페이지 런처 UI (검색, 영역 관리, 드래그 드롭)
- **storage**: `chrome.storage`로 영역/URL 설정 저장
- **permissions**: storage, bookmarks, tabs

## 파일 구조

```
src/hotkey-to-page/
├── manifest.json    # Manifest V3, commands 정의
├── background.ts    # 서비스 워커 (단축키, 탭 관리)
├── launcher.html    # 런처 페이지
├── launcher.ts      # 런처 로직
├── launcher.css     # 런처 스타일
└── icons/           # 아이콘 (16, 48, 128px)
```

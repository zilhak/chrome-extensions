# Chrome Extensions Project

Chrome 브라우저 확장 프로그램 모음 프로젝트. 각 확장의 상세 기능/기획은 `docs/` 참조.

## 프로젝트 구조

```
chrome-extensions/
├── src/
│   ├── ai-chat-manager/      # AI 채팅 사이트 글자 크기/너비 조절
│   ├── hotkey-to-page/        # 단축키로 페이지 이동 (런처, 북마크 연동)
│   └── transaction-to-clip/   # DevTools 네트워크 트랜잭션 클립보드 복사
├── docs/                      # 확장 프로그램별 상세 문서
├── build.ts                   # Bun 빌드 스크립트
└── dist/                      # 빌드 결과물
```

## Git 규칙

- 작업 하나를 완료할 때마다 커밋할 것
- 커밋 시 반드시 로컬 git 설정의 name과 email을 사용
- 커밋 메시지, author name, email 등에 "claude", "ai", "generated" 등의 문구 삽입 금지
- Co-Authored-By 헤더 사용 금지

## 개발 규칙

- Manifest V3
- TypeScript → Bun 빌드 (`bun run build`)
- 권한은 최소한으로 요청
- 다크 테마 UI 기본
- CSS 변수 활용 권장

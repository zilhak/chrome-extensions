# transaction-to-clip (TransactionToClip)

DevTools 패널에서 네트워크 요청-응답(Transaction)을 구조화하여 클립보드에 복사하는 Chrome 확장 프로그램

## 기능

- DevTools Network 탭의 HAR 데이터를 캡처
- 요청/응답을 구조화된 텍스트로 변환
- 복사 모드: minimal / normal / full
- 리소스 타입별 필터링 (all, api, doc, js, css, img, other)

## 구성

- **devtools page**: DevTools에 패널 등록
- **panel**: 네트워크 트랜잭션 목록 표시 및 클립보드 복사 UI
- **permissions**: clipboardWrite

## 파일 구조

```
src/transaction-to-clip/
├── manifest.json    # Manifest V3, devtools_page 설정
├── devtools.html    # DevTools 진입점
├── devtools.ts      # 패널 생성
├── panel.html       # 패널 UI
├── panel.ts         # 패널 로직 (HAR 파싱, 복사)
└── panel.css        # 패널 스타일
```

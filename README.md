# Markdown Preview Studio

실시간 Markdown 작성, 공유, 내보내기를 한 번에 처리하는 웹앱입니다.
개인 문서 작성부터 협업 리뷰까지 빠르게 사용할 수 있도록 설계했습니다.

## 핵심 기능

- **Live Preview (Editor + Preview split view)**
- **GitHub Flavored Markdown (GFM)** + 코드 하이라이팅
- **Mermaid 다이어그램 렌더링**
- **다크 모드 / 라이트 모드 전환**
- **자동 저장(LocalStorage)**
- **Export HTML / PDF**
- **공유 링크 생성**
  - Read-only 링크 (`?readonly=1`)
  - 실시간 공동 편집 링크 (`?room=<id>`)
- **실시간 협업 편집(Yjs + y-webrtc + CodeMirror awareness)**
- **접근성 개선**
  - 버튼 ARIA 라벨
  - 상태 메시지 `aria-live` 알림

## 이번 주 업데이트 (2026-03 2주차)

### 1) 접근성 강화
- 문서 작업 버튼들에 ARIA 라벨을 추가해 스크린리더 사용성을 개선했습니다.
- 공유/복사 상태 메시지를 `aria-live="polite"`로 제공해 보조기기 사용자 피드백을 강화했습니다.

### 2) 미리보기 입력 반응성 개선
- `useDeferredValue` 기반으로 렌더링 타이밍을 분리해, 대용량 Markdown 입력 시 타이핑 끊김을 줄였습니다.

### 3) Mermaid 렌더링 성능 최적화
- Mermaid 초기화를 1회만 수행하도록 변경해 반복 렌더 비용을 줄였습니다.
- Mermaid를 **지연 로딩(dynamic import)** 처리해 초기 번들 부담을 낮추고 초기 로딩 체감을 개선했습니다.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Editor:** CodeMirror 6 (`@uiw/react-codemirror`)
- **Markdown:** `react-markdown`, `remark-gfm`, `rehype-highlight`
- **Diagram:** Mermaid
- **Collaboration:** Yjs, y-webrtc, y-codemirror.next
- **Export:** html2pdf.js

## 시작하기

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
npm run preview
```

## 사용 시나리오

1. 기본 모드에서 Markdown 작성/미리보기
2. `Share Collab`으로 실시간 공동 편집 링크 공유
3. `Share Readonly`로 읽기 전용 링크 공유
4. 완료 문서를 HTML/PDF로 내보내기

## 포트폴리오 요약 포인트 (면접용)

- 협업 중심 문서 도구로 확장하며 단순 미리보기 앱에서 **실사용 가능한 협업 워크플로우**까지 구현
- 렌더링/번들 최적화를 통해 **체감 성능(입력 반응, 초기 로딩)**을 개선
- 접근성 속성(ARIA, live region) 반영으로 **기능 완성도 + 사용자 범용성**을 함께 확보
- 링크 기반 공유 전략(read-only / room)으로 **사용 장벽을 낮춘 제품 UX 설계** 경험 확보

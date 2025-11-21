# work_movie 설계 요약

LLM HTML 연수 관리 대시보드(`work_movie` 프로젝트)의 핵심 개념과 플로우를 요약한 문서입니다. 
에이전트나 개발자가 빠르게 컨텍스트를 잡을 수 있도록 설계 문서들의 내용을 압축했습니다.

---

## 1. 프로젝트 목적

- 대상: **특수학교 특수교사** (HTML/CSS/JS 기초 수준)
- 목표:
  - LLM(ChatGPT 등)을 활용해 **교육과정 성취기준 기반 HTML 학습 도구**를 직접 만들어보는 연수
  - 연수 중 교사들이 작성하는 HTML 코드를 **실시간으로 관리/지원**하는 강사용 대시보드 제공
  - 연수 종료 후, 각 교사가 **자신의 작품을 바로 수업에 활용**할 수 있도록 산출물 제공

요약하면, 
> "특수교사 HTML 연수를 위한 실시간 실습/모니터링/산출물 관리 시스템"입니다.

---

## 2. 전체 아키텍처 개요

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Editor**: Monaco Editor (`@monaco-editor/react`)
- **Backend/DB**: Supabase (PostgreSQL + Realtime + Storage)
- **AI**: Google Gemini 2.0 Flash API를 이용한 코드 검증(`/api/validate-code`)
- **Deploy**: Vercel + Supabase

폴더 구조(개념):

- `src/app/`
  - `page.tsx`: 홈 + 빠른 액션 진입점
  - `login/`: 닉네임 + 좌석 선택 로그인 페이지
  - `participant/[sessionId]/`: 참가자 코드 편집/미리보기 화면
  - `participant/[sessionId]/report/`: 참가자 개인 리포트 + ZIP/QR
  - `instructor/[sessionId]/`: 강사 대시보드 (좌석, 도움 요청, 로그)
  - `instructor/[sessionId]/report/`: 강사용 리포트 페이지
  - `instructor/sessions`: 세션 목록
  - `instructor/new-session`: 세션 생성(템플릿 선택)
  - `api/validate-code`: Gemini 코드 검증 API
  - (추가 구현 예정) 템플릿/예제 관리용 라우트

- `src/components/`
  - `editor/`: CodeEditor, PreviewFrame, ExampleSelector 등 참가자 에디터 관련 컴포넌트
  - `dashboard/`: StatsBar, SeatMap, HelpQueue, ActivityLog, ParticipantModal 등 강사 대시보드 컴포넌트
  - `shared/`: 공통 UI 컴포넌트

- `src/lib/`
  - `supabase.ts`, `supabase-server.ts`: 클라이언트/서버용 Supabase 클라이언트
  - `realtime.ts`: Realtime 채널 관리 (좌석/도움요청 등)
  - `utils.ts`, `seatLayout.ts`: 유틸 함수, 좌석 레이아웃 생성 등

- `설계 문서/`: 각 기능별 상세 설계 (DATABASE, PARTICIPANT, INSTRUCTOR, TEMPLATE, EXPORT, DEPLOY 등)

---

## 3. 참가자(교사) 플로우

### 3.1 입장

1. 강사가 공유한 링크로 접속: `/login?session=SESSION_ID`
2. 화면에서:
   - 연수 제목 확인
   - 닉네임 입력
   - 좌석 배치도에서 빈 좌석 선택
3. `participants` 테이블에 레코드 생성, 좌석 중복은 에러 처리
4. 로그인 완료 후 `/participant/[sessionId]` 화면으로 이동

### 3.2 코드 작성 화면

경험 설계:

- 화면 상단: 닉네임, 좌석 위치, 마지막 저장 시각 표시
- 좌측 40%: Monaco 기반 코드 에디터(HTML 전용)
- 우측 60%: iframe으로 실시간 미리보기
- 하단 버튼들:
  - **예제 불러오기**: Supabase `example_codes`에서 예제 HTML을 선택해 에디터에 로드
  - **코드 검증 (Gemini)**: `/api/validate-code`로 전송 → 200자 이내 한국어 피드백 모달로 표시
  - **도움 요청**: 메시지 입력 → `help_requests`에 코드 스냅샷과 함께 저장
  - **내 작품 저장**: `code_works`에 현재 코드 버전을 명시적으로 저장

자동 저장:

- 3초마다 현재 코드를 `code_works`에 "자동 저장" 형태로 insert
- 최종본/버전관리는 `is_final` 또는 `title` 필드를 통해 구분

### 3.3 개인 리포트 및 산출물

경로: `/participant/[sessionId]/report`

- 참가자 정보(닉네임, 좌석) 및 활동 통계 표시
  - 작성한 작품 수, 코드 검증 횟수, 도움 요청 횟수, 작성한 코드 줄 수 등
- 작품 리스트:
  - 각 작품의 제목, 생성시각, 줄 수/문자 수를 보여주고 개별 HTML로 다운로드 가능
- ZIP 일괄 다운로드:
  - `jszip`으로 모든 작품을 ZIP으로 묶어 다운로드 (`닉네임_작품모음.zip`)
- QR 코드:
  - 현재 리포트 URL을 기준으로 QR코드 생성 → 교사가 모바일로 보고 공유 가능

이로써, 연수 후에도 교사가 자신의 산출물을 쉽게 **학교 공유 폴더나 클라우드에 올려서 수업에 바로 활용**할 수 있다.

---

## 4. 강사 플로우

### 4.1 연수 전 준비

1. Supabase에서 DB/RLS 설정 (DATABASE.md 참고)
2. `templates` 테이블에 연수 템플릿 생성
   - 좌석 배치 (행/열/라벨)
   - 예제 코드 세트(`example_codes`) 연결
   - 진행 단계 텍스트 (예: 1단계 성취기준 선택, 2단계 예제 불러오기, ...)
3. `/instructor/new-session`에서 템플릿을 선택해 새 세션 생성
4. 생성된 세션 ID로:
   - 참가자 입장 URL: `/login?session=ID`
   - 강사 대시보드 URL: `/instructor/ID`
   - (필요시) 리포트 URL: `/instructor/ID/report`
   를 미리 확보하여 연수 안내문/슬라이드에 넣는다.

### 4.2 연수 중 운영

- **참가자 입장 모니터링**
  - 강사 대시보드 `/instructor/[sessionId]`에서 실시간 StatsBar + SeatMap 확인
  - 좌석 색상으로 상태 파악 (미접속/대기/진행중/도움필요)

- **도움 요청 처리**
  - HelpQueue에서 대기중인 도움 요청을 보고, 요청 메시지/코드 스냅샷을 확인
  - 해결 후 `resolved` 처리 → 참가자 상태 업데이트

- **예제 배포 (구현/확장 포인트)**
  - 특정 예제를 세션 참가자들에게 "추천" 형태로 푸시
  - 참가자 화면에는 상단 배너나 버튼으로 "강사가 추천한 예제 불러오기" 표시

- **우수작 공유 (구현/확장 포인트)**
  - 특정 참가자의 최신 코드를 우수작으로 지정
  - 이 코드를 다른 참가자 iframe에 로드하거나, 별도 미리보기 URL로 공유

- **활동 로그 확인**
  - ActivityLog에서 접속/도움요청/코드검증/저장 등의 이벤트를 시간 순으로 모니터링

### 4.3 연수 후 리포트 및 산출물

- 강사용 리포트 페이지 `/instructor/[sessionId]/report`:
  - 세션 요약 통계 (참가자 수, 작품 수, 코드 검증 수, 도움 요청 수, 평균 코드 줄 수 등)
  - 우수 참가자 TOP5 (코드 줄 수, 작품 수 기반)
  - 참가자별 상세 통계 테이블
  - Excel 내보내기 (`xlsx`) 기능으로 관리용 자료 저장

- 참가자 산출물 관리:
  - 각 참가자 리포트를 통해 HTML/ZIP을 다운로드 받아 아카이브 가능
  - Supabase Storage를 활용해 코드 파일의 퍼블릭 URL을 관리하는 옵션도 존재

---

## 5. 템플릿/예제 시스템과 자인 프로젝트 연계

`TEMPLATE.md`에 정의된 템플릿/예제 시스템은 자인 프로젝트의
**`HTML_도구_실습용` 30개 도구 및 완성형 예제**를 재사용하기 위한 기반입니다.

- `example_codes` 테이블에는 다음 형태로 데이터가 들어갑니다.
  - `title`: 예) `[국어-선택형] 2국어02-02 모양 변별`
  - `description`: 짧은 설명 (성취기준, 도구 유형)
  - `code`: 단일 HTML 파일 코드 전체 (CSS/JS 포함)
  - `difficulty`: `basic` / `intermediate` / `advanced`

- 연수용 템플릿(`templates`)에는:
  - 연수실 좌석 구성(행/열/라벨)
  - 사용할 예제 코드 세트 목록
  - 연수 진행 단계 텍스트(5분 워크플로우 기반)를 `steps` 배열로 저장

이 설계 덕분에,
- 강사는 연수마다 **예제 세트와 좌석 배치가 다른 템플릿**을 만들어 재사용할 수 있고,
- 참가자는 `예제 불러오기`에서 자인 프로젝트의 HTML 도구들을 그대로 활용하게 됩니다.

---

## 6. 연수 전/중/후 운영 시나리오 (요약)

### 6.1 연수 전

1. Supabase 프로젝트 및 RLS 설정 완료
2. `templates` + `example_codes`를 기반으로 **연수 템플릿 1개 이상 생성**
3. `/instructor/new-session`에서 세션 생성
4. 참가자/강사용 URL을 안내 자료(PPT, 공문, 메일)에 포함

### 6.2 연수 중

1. 참가자: QR/URL로 `/login?session=ID` 접속 → 닉네임+좌석 선택
2. 참가자: `/participant/[sessionId]`에서 예제 불러오기 → HTML 수정/실험/검증/도움요청
3. 강사: `/instructor/[sessionId]`에서 좌석/도움요청/로그 모니터링 + 공지/예제/우수작 공유

### 6.3 연수 후

1. 참가자: `/participant/[sessionId]/report`에서 ZIP/QR 등으로 **자기 작품 회수**
2. 강사: `/instructor/[sessionId]/report`에서 Excel 및 통계 확인
3. 연수 자료 아카이브: HTML/ZIP/리포트 파일을 학교나 교육청 시스템에 저장

---

## 7. 이 문서를 사용하는 방법

- **에이전트 AI에게 컨텍스트 제공**: 
  - 이 문서와 함께 `설계 문서/README.md`, `PARTICIPANT.md`, `INSTRUCTOR.md`, `TEMPLATE.md`, `EXPORT.md`, `DEPLOY.md`를 전달하면
    에이전트가 전체 구조를 빠르게 이해하고 구체 구현/수정을 도울 수 있습니다.

- **새 개발자 온보딩**:
  - 이 요약 문서를 먼저 읽고, 이후 각 세부 설계 문서를 차례대로 읽게 하면 온보딩 시간을 줄일 수 있습니다.

- **추가 변경사항 누적**:
  - 프로젝트가 진화하면서 중요한 설계 변경이 생기면, 이 문서의 관련 섹션 하단에 
    `### 변경 이력` 섹션을 추가해 간단히 기록해 두는 것을 권장합니다.

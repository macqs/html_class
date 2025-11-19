# LLM HTML 연수 관리 대시보드

## 📋 프로젝트 개요

특수학교 교사 대상 LLM 활용 HTML 코딩 연수를 위한 실시간 관리 대시보드입니다.
참가자는 자리에서 HTML 코드를 작성하고, 강사는 실시간으로 전체 진행 상황을 모니터링하며 도움을 제공합니다.

## 🎯 핵심 기능

### 참가자 기능
- ✅ 닉네임으로 로그인 및 좌석 선택
- ✅ Monaco Editor 기반 HTML 코드 작성
- ✅ 실시간 미리보기 (iframe)
- ✅ AI 코드 검증 (Google Gemini API)
- ✅ 도움 요청 시스템
- ✅ 예제 코드 라이브러리
- ✅ 작품 저장 및 다운로드
- ✅ 자동 코드 백업

### 강사 기능
- ✅ 실시간 좌석 배치도 모니터링 (최대 100명)
- ✅ 도움 요청 큐 관리
- ✅ 전체 공지 전송
- ✅ 예제 코드 일괄 배포
- ✅ 우수 작품 공유
- ✅ 연수 후 리포트 자동 생성
- ✅ 템플릿 저장/불러오기
- ✅ 개별 참가자 상세 모니터링

## 🛠 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Editor**: Monaco Editor (VS Code 엔진)
- **Styling**: Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Realtime**: Supabase Realtime
- **AI**: Google Gemini 2.0 Flash API
- **Deployment**: Vercel

## 📁 프로젝트 구조

```
training-dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/              # 로그인 페이지
│   ├── participant/
│   │   ├── [sessionId]/        # 참가자 메인 화면
│   │   └── report/             # 개인 리포트
│   ├── instructor/
│   │   ├── [sessionId]/        # 강사 대시보드
│   │   └── templates/          # 템플릿 관리
│   └── api/
│       ├── validate-code/      # Gemini 코드 검증
│       ├── help-request/       # 도움 요청
│       └── export/             # 산출물 생성
├── components/
│   ├── editor/
│   │   ├── CodeEditor.tsx      # Monaco Editor 래퍼
│   │   └── PreviewFrame.tsx    # iframe 미리보기
│   ├── dashboard/
│   │   ├── SeatMap.tsx         # 좌석 배치도
│   │   ├── HelpQueue.tsx       # 도움 요청 큐
│   │   └── ActivityLog.tsx     # 활동 로그
│   └── shared/
│       ├── Notification.tsx    # 알림 컴포넌트
│       └── Modal.tsx           # 모달
├── lib/
│   ├── supabase.ts             # Supabase 클라이언트
│   ├── gemini.ts               # Gemini API 래퍼
│   └── realtime.ts             # Realtime 채널 관리
├── types/
│   └── index.ts                # TypeScript 타입 정의
└── public/
    └── examples/               # 예제 HTML 파일들
```

## 🚀 빠른 시작

1. 프로젝트 생성
```bash
npx create-next-app@latest training-dashboard --typescript --tailwind --app
cd training-dashboard
```

2. 필수 패키지 설치
```bash
npm install @supabase/supabase-js @monaco-editor/react lucide-react
```

3. 환경 변수 설정 (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

4. 개발 서버 실행
```bash
npm run dev
```

## 📚 상세 문서

구현을 위한 상세 가이드:

1. **[SETUP.md](./SETUP.md)** - 환경 설정 및 초기 셋업
2. **[DATABASE.md](./DATABASE.md)** - Supabase 스키마 및 설정
3. **[PARTICIPANT.md](./PARTICIPANT.md)** - 참가자 화면 구현
4. **[INSTRUCTOR.md](./INSTRUCTOR.md)** - 강사 대시보드 구현
5. **[REALTIME.md](./REALTIME.md)** - 실시간 통신 구현
6. **[GEMINI_API.md](./GEMINI_API.md)** - Gemini API 연동
7. **[TEMPLATE.md](./TEMPLATE.md)** - 템플릿 시스템
8. **[EXPORT.md](./EXPORT.md)** - 산출물 및 리포트
9. **[DEPLOY.md](./DEPLOY.md)** - 배포 가이드

## 🎬 개발 순서

### Phase 1: 기본 골격 (1-2일)
- [ ] Next.js 프로젝트 셋업
- [ ] Supabase 연결 및 DB 스키마 생성
- [ ] 로그인 (닉네임) + 좌석 선택
- [ ] 코드 에디터 + 미리보기 기본 UI

### Phase 2: 핵심 기능 (3-4일)
- [ ] 실시간 좌석 상태 동기화
- [ ] 도움 요청 시스템
- [ ] Gemini API 연동 (코드 검증)
- [ ] 강사 대시보드 기본

### Phase 3: 산출물 & 템플릿 (2-3일)
- [ ] 작품 저장/다운로드
- [ ] 템플릿 시스템
- [ ] 연수 후 리포트 자동 생성

### Phase 4: 최적화 & 배포 (2일)
- [ ] 100명 성능 테스트
- [ ] 에러 핸들링
- [ ] Vercel 배포

## 💡 주요 설계 결정

### 1. 100명 규모 최적화
- Supabase Realtime 채널을 10개 그룹으로 분할 (각 10명)
- 코드는 변경 시에만 전송 (전체 코드 전송 X)
- 강사만 모든 채널 구독

### 2. 코드 검증 전략
- Google Gemini 2.0 Flash 사용 (무료, 빠름)
- 프롬프트 최적화로 200자 이내 응답
- 검증 실패 시 graceful fallback

### 3. 산출물 관리
- 작품은 Supabase Storage 저장
- 다운로드는 .html 단일 파일
- QR 코드로 모바일 전송 가능

## 🔐 보안 고려사항

- API 키는 서버 사이드에서만 사용
- Row Level Security (RLS) 활성화
- Rate limiting 적용 (Gemini API 보호)
- XSS 방지 (iframe sandbox)

## 📞 지원

문제가 발생하면 각 .md 문서의 "문제 해결" 섹션을 참고하세요.

## 📄 라이선스

MIT License

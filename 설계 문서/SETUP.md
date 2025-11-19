# 환경 설정 및 초기 셋업

## 1. 프로젝트 생성

```bash
# Next.js 프로젝트 생성
npx create-next-app@latest training-dashboard \
  --typescript \
  --tailwind \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd training-dashboard
```

## 2. 필수 패키지 설치

```bash
# 핵심 의존성
npm install @supabase/supabase-js @supabase/ssr

# 에디터
npm install @monaco-editor/react

# UI 라이브러리
npm install lucide-react

# 유틸리티
npm install date-fns clsx tailwind-merge

# 타입
npm install -D @types/node
```

## 3. Supabase 프로젝트 생성

### 3.1 Supabase 계정 생성
1. https://supabase.com 접속
2. "Start your project" 클릭
3. GitHub로 로그인
4. "New Project" 클릭

### 3.2 프로젝트 정보 입력
- **Name**: training-dashboard
- **Database Password**: 강력한 비밀번호 생성 (저장해두기!)
- **Region**: Northeast Asia (Seoul)
- **Pricing Plan**: Free

### 3.3 API 키 확인
프로젝트 생성 후:
1. 좌측 메뉴에서 "Project Settings" 클릭
2. "API" 탭 선택
3. 다음 정보 복사:
   - `Project URL`
   - `anon public` key

## 4. Google Gemini API 키 발급

### 4.1 Google AI Studio 접속
1. https://aistudio.google.com 접속
2. Google 계정으로 로그인

### 4.2 API 키 생성
1. 좌측 메뉴에서 "Get API key" 클릭
2. "Create API key" 클릭
3. "Create API key in new project" 선택
4. API 키 복사 (다시 볼 수 없으니 저장!)

## 5. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일 생성:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Gemini API
GEMINI_API_KEY=your-gemini-api-key

# App Config
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

⚠️ **중요**: `.env.local`을 `.gitignore`에 추가하세요!

## 6. 프로젝트 구조 생성

```bash
# 디렉토리 구조 생성
mkdir -p app/api/{validate-code,help-request,export}
mkdir -p app/participant/\[sessionId\]
mkdir -p app/instructor/\[sessionId\]
mkdir -p components/{editor,dashboard,shared}
mkdir -p lib
mkdir -p types
mkdir -p public/examples
```

## 7. Tailwind CSS 설정 최적화

`tailwind.config.ts` 수정:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
```

## 8. TypeScript 타입 정의

`types/index.ts` 파일 생성:

```typescript
// 세션
export interface Session {
  id: string;
  title: string;
  date: string;
  instructor_id: string;
  seat_layout: SeatLayout;
  template_id?: string;
  status: 'active' | 'ended';
  created_at: string;
}

export interface SeatLayout {
  rows: number;
  cols: number;
  labels: string[][]; // 예: [['A-1', 'A-2'], ['B-1', 'B-2']]
}

// 참가자
export interface Participant {
  id: string;
  session_id: string;
  nickname: string;
  seat_position: string;
  status: 'idle' | 'working' | 'help_needed';
  last_active: string;
  created_at: string;
}

// 작품
export interface CodeWork {
  id: string;
  participant_id: string;
  title: string;
  code: string;
  version: number;
  is_final: boolean;
  created_at: string;
}

// 도움 요청
export interface HelpRequest {
  id: string;
  participant_id: string;
  participant?: Participant;
  message: string;
  code_snapshot: string;
  status: 'pending' | 'resolved';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

// 템플릿
export interface Template {
  id: string;
  name: string;
  description: string;
  config: TemplateConfig;
  created_by: string;
  created_at: string;
}

export interface TemplateConfig {
  seat_layout: SeatLayout;
  example_codes: ExampleCode[];
  steps: string[];
}

// 예제 코드
export interface ExampleCode {
  id: string;
  template_id?: string;
  title: string;
  description: string;
  code: string;
  difficulty: 'basic' | 'intermediate' | 'advanced';
  order_index: number;
}

// Realtime 이벤트
export interface RealtimeEvent {
  type: 'status_change' | 'help_request' | 'broadcast' | 'code_update';
  participant_id?: string;
  data: any;
  timestamp: string;
}

// API 응답
export interface ValidationResponse {
  success: boolean;
  validation: string;
  errors?: string[];
}
```

## 9. Supabase 클라이언트 설정

`lib/supabase.ts` 파일 생성:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 타입 안전한 클라이언트
export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          title: string;
          date: string;
          instructor_id: string;
          seat_layout: any;
          template_id: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          date: string;
          instructor_id: string;
          seat_layout: any;
          template_id?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          date?: string;
          instructor_id?: string;
          seat_layout?: any;
          template_id?: string | null;
          status?: string;
          created_at?: string;
        };
      };
      // ... 다른 테이블들
    };
  };
};

export const supabaseTyped = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

## 10. 유틸리티 함수

`lib/utils.ts` 파일 생성:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind 클래스 병합
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 좌석 위치 생성 (A-1, A-2, B-1, B-2...)
export function generateSeatLabels(rows: number, cols: number): string[][] {
  const labels: string[][] = [];
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  for (let r = 0; r < rows; r++) {
    const row: string[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(`${rowLabels[r]}-${c + 1}`);
    }
    labels.push(row);
  }
  
  return labels;
}

// 날짜 포맷팅
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

// 시간 경과 계산 (몇 분 전)
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}
```

## 11. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속하여 기본 화면 확인

## 12. Git 초기화 (선택사항)

```bash
git init
git add .
git commit -m "Initial setup"
```

`.gitignore`에 다음 내용이 포함되어 있는지 확인:

```
# 환경 변수
.env*.local

# 의존성
node_modules/

# Next.js
.next/
out/

# 디버그
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

## ✅ 체크리스트

설정이 완료되었는지 확인:

- [ ] Next.js 프로젝트 생성됨
- [ ] 모든 패키지 설치됨
- [ ] Supabase 프로젝트 생성됨
- [ ] Gemini API 키 발급받음
- [ ] `.env.local` 파일 생성 및 설정됨
- [ ] 프로젝트 구조 생성됨
- [ ] 타입 정의 완료됨
- [ ] Supabase 클라이언트 설정됨
- [ ] 개발 서버 정상 실행됨

## 🔧 문제 해결

### Supabase 연결 오류
```
Error: Invalid API key
```
- `.env.local` 파일의 키가 정확한지 확인
- 개발 서버 재시작 (`npm run dev` 다시 실행)

### Monaco Editor 로딩 실패
```
Module not found: Can't resolve 'monaco-editor'
```
- `npm install @monaco-editor/react` 다시 실행
- `node_modules` 삭제 후 `npm install`

### 포트 충돌
```
Port 3000 is already in use
```
- 다른 포트 사용: `npm run dev -- -p 3001`

## 다음 단계

환경 설정이 완료되었습니다! 이제 다음 문서를 진행하세요:

👉 **[DATABASE.md](./DATABASE.md)** - 데이터베이스 스키마 생성

# 배포 가이드 (Vercel)

## 1. 배포 전 체크리스트

### 1.1 필수 확인 사항

- [ ] 모든 환경 변수가 `.env.local`에 설정됨
- [ ] Supabase 데이터베이스 스키마 생성 완료
- [ ] Gemini API 키 발급 완료
- [ ] 로컬에서 정상 작동 확인
- [ ] Git 저장소 초기화 완료

### 1.2 프로덕션 최적화

`next.config.js` 설정:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // 환경 변수 (클라이언트 사이드)
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // 성능 최적화
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // 이미지 최적화
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
}

module.exports = nextConfig;
```

## 2. Vercel 배포

### 2.1 Git 저장소 준비

```bash
# Git 초기화 (아직 안 했다면)
git init

# .gitignore 확인
echo "
.env*.local
node_modules
.next
out
.DS_Store
" >> .gitignore

# 커밋
git add .
git commit -m "Initial commit"

# GitHub에 푸시
git remote add origin https://github.com/your-username/training-dashboard.git
git branch -M main
git push -u origin main
```

### 2.2 Vercel 프로젝트 생성

1. **Vercel 계정 생성/로그인**
   - https://vercel.com 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 임포트**
   - "New Project" 클릭
   - GitHub 저장소 선택
   - "Import" 클릭

3. **프로젝트 설정**
   - **Project Name**: `training-dashboard`
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `.next` (기본값)

### 2.3 환경 변수 설정

Vercel 대시보드에서:

1. 프로젝트 선택
2. "Settings" → "Environment Variables" 탭
3. 다음 환경 변수 추가:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

**중요:** 각 환경 변수를 Production, Preview, Development 모두 선택

4. "Save" 클릭

### 2.4 배포 실행

```bash
# Vercel CLI 설치 (선택사항)
npm install -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

또는 GitHub에 푸시만 하면 자동 배포됨:

```bash
git add .
git commit -m "Deploy to production"
git push
```

## 3. 커스텀 도메인 설정 (선택사항)

### 3.1 Vercel에서 도메인 추가

1. 프로젝트 → "Settings" → "Domains"
2. 도메인 입력 (예: `training.yourdomain.com`)
3. DNS 레코드 추가:

```
Type: CNAME
Name: training (또는 @)
Value: cname.vercel-dns.com
```

### 3.2 SSL 인증서

Vercel이 자동으로 Let's Encrypt SSL 인증서 발급 (무료)

## 4. 성능 모니터링

### 4.1 Vercel Analytics 활성화

```bash
npm install @vercel/analytics
```

`app/layout.tsx`에 추가:

```typescript
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 4.2 Vercel Speed Insights

```bash
npm install @vercel/speed-insights
```

`app/layout.tsx`에 추가:

```typescript
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## 5. 프로덕션 환경 최적화

### 5.1 로딩 상태 개선

`app/loading.tsx` 생성:

```typescript
export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
    </div>
  );
}
```

### 5.2 에러 처리

`app/error.tsx` 생성:

```typescript
'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">문제가 발생했습니다</h2>
      <p className="text-gray-600 mb-4">잠시 후 다시 시도해주세요.</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        다시 시도
      </button>
    </div>
  );
}
```

### 5.3 메타데이터 최적화

`app/layout.tsx`:

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LLM HTML 연수 대시보드',
  description: '특수교사 대상 LLM 활용 HTML 코딩 연수 관리 시스템',
  keywords: ['LLM', 'HTML', '연수', '교육', '특수교육'],
  authors: [{ name: '마큐스' }],
  openGraph: {
    title: 'LLM HTML 연수 대시보드',
    description: '실시간 연수 관리 및 코드 검증 시스템',
    type: 'website',
  },
};
```

## 6. Supabase 프로덕션 설정

### 6.1 Row Level Security (RLS) 확인

프로덕션 환경에서는 RLS가 필수입니다. DATABASE.md의 RLS 정책이 모두 적용되었는지 확인.

### 6.2 Database Connection Pooling

Vercel의 Serverless 환경을 위해:

1. Supabase 대시보드 → "Settings" → "Database"
2. "Connection Pooling" 섹션에서 "Transaction" 모드 활성화
3. Connection string 복사
4. (선택) `SUPABASE_DB_URL` 환경 변수로 추가

### 6.3 Realtime 제한

프로덕션에서 Realtime 연결 수 제한:

```typescript
// lib/realtime.ts
const MAX_CONNECTIONS = process.env.NODE_ENV === 'production' ? 50 : 100;
```

## 7. 보안 강화

### 7.1 CORS 설정

`middleware.ts` 생성:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // CORS 헤더
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

### 7.2 Rate Limiting 강화

```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  req: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
): { success: boolean; remaining: number } {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  
  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }
  
  record.count++;
  return { success: true, remaining: limit - record.count };
}
```

## 8. 모니터링 및 로깅

### 8.1 Sentry 설정 (선택사항)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 8.2 로그 수집

```typescript
// lib/logger.ts
export function logError(error: Error, context?: any) {
  if (process.env.NODE_ENV === 'production') {
    // Sentry 또는 다른 로깅 서비스로 전송
    console.error('Error:', error, context);
  } else {
    console.error(error, context);
  }
}

export function logEvent(event: string, data?: any) {
  if (process.env.NODE_ENV === 'production') {
    // Analytics 전송
    console.log('Event:', event, data);
  }
}
```

## 9. 배포 후 확인사항

### 9.1 기능 테스트

- [ ] 로그인 페이지 접속
- [ ] 좌석 선택 가능
- [ ] 코드 에디터 정상 작동
- [ ] 코드 검증 (Gemini API) 작동
- [ ] 도움 요청 전송
- [ ] 강사 대시보드 접속
- [ ] 실시간 동기화 확인
- [ ] 작품 다운로드
- [ ] 리포트 생성

### 9.2 성능 테스트

```bash
# Lighthouse 점수 확인
npx lighthouse https://your-domain.vercel.app --view

# 목표:
# - Performance: 90+
# - Accessibility: 90+
# - Best Practices: 90+
# - SEO: 90+
```

### 9.3 부하 테스트 (100명 동시 접속)

간단한 테스트 스크립트:

```javascript
// test-load.js
const participants = 100;
const promises = [];

for (let i = 0; i < participants; i++) {
  promises.push(
    fetch('https://your-domain.vercel.app/api/validate-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: '<html><body>Test</body></html>',
        participantId: `test-${i}`,
      }),
    })
  );
}

Promise.all(promises).then(() => console.log('All requests completed'));
```

## 10. 유지보수

### 10.1 정기 업데이트

```bash
# 패키지 업데이트 확인
npm outdated

# 업데이트 실행
npm update

# 보안 취약점 확인
npm audit

# 자동 수정
npm audit fix
```

### 10.2 백업 전략

- **Supabase 자동 백업**: 매일 자동 백업 (Free tier: 7일 보관)
- **수동 백업**: 중요 연수 전 수동 백업

```sql
-- 데이터 내보내기
COPY (SELECT * FROM sessions) TO '/tmp/sessions_backup.csv' WITH CSV HEADER;
```

### 10.3 모니터링 알림

Vercel 대시보드에서 설정:
- Deployment failures
- Performance degradation
- Error rate threshold

## 11. 비용 관리

### 11.1 Vercel (무료 플랜)

- **Bandwidth**: 100 GB/month
- **Builds**: 6,000분/month
- **Serverless Functions**: 100 GB-hours

### 11.2 Supabase (무료 플랜)

- **Database**: 500 MB
- **Storage**: 1 GB
- **Bandwidth**: 5 GB/month

### 11.3 Gemini API (무료)

- **요청**: 일일 1,500회
- **토큰**: 분당 1M

## 12. 롤백 전략

문제 발생 시 이전 버전으로 롤백:

```bash
# Vercel CLI
vercel rollback
```

또는 Vercel 대시보드:
1. "Deployments" 탭
2. 이전 배포 선택
3. "⋯" → "Promote to Production"

## ✅ 최종 체크리스트

배포 완료 후 확인:

- [ ] 프로덕션 URL 접속 가능
- [ ] 모든 환경 변수 설정 확인
- [ ] SSL 인증서 활성화 확인
- [ ] 주요 기능 정상 작동
- [ ] 성능 지표 확인 (Lighthouse)
- [ ] 에러 로깅 설정
- [ ] 백업 설정 확인
- [ ] 팀에 배포 URL 공유
- [ ] 사용자 가이드 작성

## 🎉 축하합니다!

배포가 완료되었습니다! 

**다음 단계:**
- 실제 연수에서 테스트
- 사용자 피드백 수집
- 지속적인 개선

**도움이 필요하면:**
- [Next.js 문서](https://nextjs.org/docs)
- [Vercel 문서](https://vercel.com/docs)
- [Supabase 문서](https://supabase.com/docs)

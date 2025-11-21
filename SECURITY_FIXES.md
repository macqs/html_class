# 실전 배포 전 보안 및 안정성 수정 사항

## 우선순위 높음 (즉시 수정 필요)

### 1. XSS 취약점 수정
**파일**: `src/app/preview/[codeWorkId]/page.tsx`

**현재 코드**:
```tsx
<div dangerouslySetInnerHTML={{ __html: data.code }} />
```

**수정안 1 - iframe 샌드박스 사용** (권장):
```tsx
// PreviewFrame 컴포넌트처럼 iframe sandbox 사용
<iframe 
  sandbox="allow-scripts"
  srcDoc={data.code}
  style={{ width: '100%', height: '100vh', border: 'none' }}
/>
```

**수정안 2 - DOMPurify 사용**:
```bash
npm install dompurify @types/dompurify
npm install isomorphic-dompurify  # SSR 지원
```

```tsx
import DOMPurify from 'isomorphic-dompurify';

const sanitizedCode = DOMPurify.sanitize(data.code, {
  ALLOWED_TAGS: ['html', 'head', 'body', 'div', 'p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                  'ul', 'ol', 'li', 'a', 'img', 'table', 'tr', 'td', 'th', 'style'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'id', 'style'],
});

<div dangerouslySetInnerHTML={{ __html: sanitizedCode }} />
```

---

### 2. 코드 저장 에러 핸들링 추가
**파일**: `src/app/participant/[sessionId]/page.tsx`

**수정 코드**:
```tsx
const saveCode = useCallback(
  async (isFinal = false) => {
    if (!participant) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.from('td_code_works').insert({
        participant_id: participant.id,
        title: isFinal ? '최종 작품' : '자동 저장',
        code,
        is_final: isFinal,
      });

      if (error) {
        console.error('Code save error:', error);
        if (isFinal) {
          alert('저장에 실패했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.');
        }
        return;
      }

      setLastSaved(new Date());

      if (isFinal) {
        const newExample: LocalExampleItem = {
          id: crypto.randomUUID?.() ?? `${Date.now()}`,
          title: `내 작품 (${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})`,
          code,
          savedAt: new Date().toISOString(),
        };
        const next = [...localExamples, newExample].slice(-6);
        persistLocalExamples(participant.id, next);
      }
    } catch (error) {
      console.error('Save exception:', error);
      if (isFinal) {
        alert('저장 중 오류가 발생했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  },
  [code, localExamples, participant, persistLocalExamples]
);
```

---

### 3. 코드 사이즈 제한 추가
**파일**: `src/app/participant/[sessionId]/page.tsx`

**추가 코드**:
```tsx
const MAX_CODE_SIZE = 100000; // 100KB

const saveCode = useCallback(
  async (isFinal = false) => {
    if (!participant) return;

    // 코드 사이즈 체크
    const codeSize = new Blob([code]).size;
    if (codeSize > MAX_CODE_SIZE) {
      alert(`코드가 너무 큽니다 (${(codeSize / 1024).toFixed(1)}KB / 100KB). 불필요한 내용을 줄여주세요.`);
      return;
    }

    setIsSaving(true);
    // ... 나머지 로직
  },
  [code, localExamples, participant, persistLocalExamples]
);
```

---

### 4. 도움 요청 에러 핸들링
**파일**: `src/app/participant/[sessionId]/page.tsx`

**수정 코드**:
```tsx
async function handleRequestHelp() {
  if (!participant) return;
  
  try {
    await requestHelp('도움이 필요합니다.', code);
    setParticipant((prev) => (prev ? { ...prev, status: 'help_needed' } : prev));
    alert('도움 요청이 전송되었습니다!');
  } catch (error) {
    console.error('Help request error:', error);
    alert('도움 요청 전송에 실패했습니다. 다시 시도해주세요.');
  }
}
```

---

### 5. QR 공유 API 에러 핸들링 강화
**파일**: `src/app/api/share-html/route.ts`

**추가 검증**:
```tsx
export async function POST(request: NextRequest) {
  try {
    const { participantId, code } = await request.json();

    if (!participantId || !code) {
      return NextResponse.json({ success: false, error: 'Missing participantId or code' }, { status: 400 });
    }

    // 코드 사이즈 체크
    const codeSize = Buffer.byteLength(code, 'utf8');
    if (codeSize > 100000) {
      return NextResponse.json({ success: false, error: 'Code size exceeds limit (100KB)' }, { status: 413 });
    }

    // ... 나머지 로직
  } catch (error) {
    console.error('Error in share-html API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## 우선순위 중간 (배포 전 권장)

### 6. 자동 저장 디바운스 추가
**목적**: 과도한 DB 요청 방지

```tsx
import { useCallback, useEffect, useRef } from 'react';

const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (!participant) return;

  // 디바운스: 코드 변경 후 3초 대기
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(() => {
    saveCode();
  }, 3000);

  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [code, participant, saveCode]);
```

---

### 7. Realtime 채널 정리 개선
**파일**: `src/hooks/useInstructorRealtime.ts`, `useParticipantRealtime.ts`

**확인 사항**:
- 모든 구독에 대해 `unsubscribe()` 호출 확인
- 컴포넌트 unmount 시 정리 확인

---

### 8. Rate Limiting 추가
**파일**: API 라우트들

**목적**: 과도한 요청 방지

```tsx
// Simple in-memory rate limiter
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// API 라우트에서 사용
const ip = request.headers.get('x-forwarded-for') || 'unknown';
if (!checkRateLimit(ip, 60, 60000)) { // 분당 60회
  return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
}
```

---

## 우선순위 낮음 (개선 사항)

### 9. 타입 안정성 강화
- 모든 `any` 타입 제거
- API 응답 타입 정의

### 10. 로깅 개선
- 프로덕션 환경에서 `console.log` 제거
- 구조화된 로깅 도구 사용 (예: winston, pino)

### 11. 성능 모니터링
- Vercel Analytics 활성화
- 에러 추적 도구 연동 (예: Sentry)

---

## 테스트 시나리오

### 악의적인 코드 입력 테스트
```html
<!-- XSS 시도 -->
<script>alert('XSS')</script>
<img src=x onerror="alert('XSS')">
<iframe src="javascript:alert('XSS')"></iframe>

<!-- 매우 큰 코드 -->
<div>{"A".repeat(200000)}</div>

<!-- 잘못된 HTML -->
<div><span></div></span>
<img src="broken">

<!-- 특수문자 -->
<div>🎉 한글 テスト 特殊字符</div>
```

### 네트워크 오류 시뮬레이션
- 개발자 도구에서 네트워크 Offline으로 전환
- 저장 버튼 클릭
- 에러 메시지 확인

### 동시 접속 부하 테스트
- 10명 이상 동시 접속
- 동시에 도움 요청
- 실시간 업데이트 확인

---

## 즉시 적용 순서

1. ✅ XSS 취약점 수정 (iframe sandbox 또는 DOMPurify)
2. ✅ 코드 저장 에러 핸들링
3. ✅ 코드 사이즈 제한
4. ✅ 도움 요청/QR 공유 에러 핸들링
5. ⏭️ 자동 저장 디바운스
6. ⏭️ Rate limiting (선택)

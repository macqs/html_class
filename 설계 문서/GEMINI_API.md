# Google Gemini API 연동 가이드

## 1. Gemini API 개요

Google Gemini 2.0 Flash 모델을 사용하여 HTML 코드 검증을 수행합니다.

**무료 한도 (2025년 기준):**
- 분당 최대 1,000,000 토큰
- 일일 1,500 요청
- RPM(분당 요청): 15

**100명 연수 시나리오:**
- 예상 사용량: 1,000회 검증 × 500 토큰 = 500,000 토큰
- ✅ 무료 한도 내에서 충분히 커버 가능

## 2. Gemini API 클라이언트 설정

### 2.1 Gemini 유틸리티

`lib/gemini.ts`:

```typescript
interface GeminiRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    maxOutputTokens?: number;
    temperature?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  private model = 'gemini-2.0-flash';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateContent(prompt: string, maxTokens: number = 300): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.3, // 일관된 응답을 위해 낮게 설정
            },
          } as GeminiRequest),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API Error: ${error.error?.message || 'Unknown error'}`);
      }

      const data: GeminiResponse = await response.json();
      
      // 응답 검증
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response from Gemini');
      }

      const text = data.candidates[0].content.parts[0].text;
      
      // 토큰 사용량 로깅 (선택)
      if (data.usageMetadata) {
        console.log('Token usage:', data.usageMetadata);
      }

      return text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  // HTML 코드 검증 전용 메서드
  async validateHTMLCode(code: string): Promise<{
    isValid: boolean;
    feedback: string;
    errors: string[];
  }> {
    const prompt = this.buildValidationPrompt(code);
    const response = await this.generateContent(prompt, 250);
    
    return this.parseValidationResponse(response);
  }

  private buildValidationPrompt(code: string): string {
    return `당신은 초보자의 HTML 코드를 검토하는 친절한 조교입니다.

다음 HTML 코드를 검토하고 정확히 아래 형식으로 답변하세요:

### 구문 오류
[오류가 있다면 정확한 위치와 해결 방법, 없으면 "없음"]

### 실행 가능 여부
[예/아니오 + 간단한 이유]

### 개선 제안
[1-2개의 간단한 제안, 없으면 "잘 작성되었습니다"]

코드:
\`\`\`html
${code}
\`\`\`

최대 200자 이내로 간결하게 답변하세요.`;
  }

  private parseValidationResponse(response: string): {
    isValid: boolean;
    feedback: string;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // "구문 오류" 섹션에서 오류 추출
    const errorMatch = response.match(/### 구문 오류\s*\n([^\n]+)/);
    if (errorMatch && !errorMatch[1].includes('없음')) {
      errors.push(errorMatch[1]);
    }

    // "실행 가능 여부" 확인
    const isValid = response.includes('실행 가능 여부') && 
                   (response.includes('예') || response.includes('가능'));

    return {
      isValid,
      feedback: response,
      errors,
    };
  }
}

// 싱글톤 인스턴스
let geminiClient: GeminiClient | null = null;

export function getGeminiClient(): GeminiClient {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set');
    }
    geminiClient = new GeminiClient(apiKey);
  }
  return geminiClient;
}
```

## 3. API Route 구현

### 3.1 코드 검증 API

`app/api/validate-code/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGeminiClient } from '@/lib/gemini';

// Rate limiting (간단한 in-memory 구현)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(participantId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(participantId);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(participantId, {
      count: 1,
      resetTime: now + 60000, // 1분
    });
    return true;
  }

  if (limit.count >= 10) { // 분당 10회 제한
    return false;
  }

  limit.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const { code, participantId } = await req.json();

    // 입력 검증
    if (!code || !participantId) {
      return NextResponse.json(
        { success: false, validation: '코드와 참가자 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(participantId)) {
      return NextResponse.json(
        { 
          success: false, 
          validation: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 429 }
      );
    }

    // 코드 길이 제한 (10KB)
    if (code.length > 10000) {
      return NextResponse.json(
        { success: false, validation: '코드가 너무 깁니다. (최대 10KB)' },
        { status: 400 }
      );
    }

    // Gemini API 호출
    const gemini = getGeminiClient();
    const result = await gemini.validateHTMLCode(code);

    // Supabase에 검증 결과 저장
    await supabase.from('code_validations').insert({
      participant_id: participantId,
      code,
      validation_result: result.feedback,
    });

    // 활동 로그 기록
    const { data: participant } = await supabase
      .from('participants')
      .select('session_id, nickname')
      .eq('id', participantId)
      .single();

    if (participant) {
      await supabase.from('activity_logs').insert({
        session_id: participant.session_id,
        participant_id: participantId,
        action_type: 'code_validation',
        content: `${participant.nickname}님이 코드 검증을 완료했습니다.`,
      });
    }

    return NextResponse.json({
      success: true,
      validation: result.feedback,
      isValid: result.isValid,
      errors: result.errors,
    });

  } catch (error: any) {
    console.error('Validation error:', error);

    // Gemini API 에러 처리
    if (error.message?.includes('quota')) {
      return NextResponse.json(
        { 
          success: false, 
          validation: 'API 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.' 
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        validation: '코드 검증 중 오류가 발생했습니다. 다시 시도해주세요.' 
      },
      { status: 500 }
    );
  }
}
```

### 3.2 배치 검증 API (강사용)

`app/api/validate-batch/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getGeminiClient } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    // 모든 참가자의 최신 코드 가져오기
    const { data: participants } = await supabase
      .from('participants')
      .select('id, nickname')
      .eq('session_id', sessionId);

    if (!participants) {
      return NextResponse.json({ success: false, message: '참가자를 찾을 수 없습니다.' });
    }

    const gemini = getGeminiClient();
    const results = [];

    for (const participant of participants) {
      // 최신 코드 가져오기
      const { data: codeWork } = await supabase
        .from('code_works')
        .select('code')
        .eq('participant_id', participant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!codeWork) continue;

      try {
        const validation = await gemini.validateHTMLCode(codeWork.code);
        results.push({
          participantId: participant.id,
          nickname: participant.nickname,
          ...validation,
        });

        // 약간의 딜레이 (Rate limit 방지)
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Validation failed for ${participant.nickname}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      results,
      total: participants.length,
      validated: results.length,
    });

  } catch (error) {
    console.error('Batch validation error:', error);
    return NextResponse.json(
      { success: false, message: '배치 검증 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
```

## 4. 프롬프트 최적화

### 4.1 다양한 프롬프트 템플릿

`lib/gemini-prompts.ts`:

```typescript
export const VALIDATION_PROMPTS = {
  // 기본 검증
  basic: (code: string) => `
당신은 HTML 코드 검증 도구입니다.

코드:
${code}

다음을 간단히 체크하세요:
1. 구문 오류 유무
2. 실행 가능 여부
3. 1가지 개선 제안

200자 이내로 답변하세요.
`,

  // 상세 검증
  detailed: (code: string) => `
당신은 전문 HTML 강사입니다.

코드:
${code}

다음을 상세히 분석하세요:
1. HTML 구조의 적절성
2. 시맨틱 태그 사용 여부
3. 접근성 고려사항
4. 성능 최적화 제안

500자 이내로 답변하세요.
`,

  // 초보자용 (매우 친절)
  beginner: (code: string) => `
당신은 초보자를 위한 매우 친절한 HTML 선생님입니다.

코드:
${code}

칭찬과 함께 다음을 알려주세요:
1. 잘한 점
2. 고칠 점 (있다면)
3. 다음 단계 제안

부드럽고 격려하는 톤으로 250자 이내로 답변하세요.
`,

  // 오류만 체크
  errorOnly: (code: string) => `
코드에서 오류만 찾아주세요:

${code}

오류가 있으면 위치와 해결 방법을, 없으면 "오류 없음"만 출력하세요.
100자 이내로 답변하세요.
`,
};

export type PromptType = keyof typeof VALIDATION_PROMPTS;
```

### 4.2 프롬프트 선택 옵션

API Route에 프롬프트 타입 추가:

```typescript
export async function POST(req: NextRequest) {
  const { code, participantId, promptType = 'basic' } = await req.json();
  
  const prompt = VALIDATION_PROMPTS[promptType as PromptType](code);
  const gemini = getGeminiClient();
  const response = await gemini.generateContent(prompt);
  
  // ...
}
```

## 5. 응답 캐싱 (선택사항)

동일한 코드에 대한 반복 검증을 방지:

```typescript
import { createHash } from 'crypto';

// 간단한 in-memory 캐시
const validationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 300000; // 5분

function getCacheKey(code: string): string {
  return createHash('md5').update(code).digest('hex');
}

function getCachedValidation(code: string): any | null {
  const key = getCacheKey(code);
  const cached = validationCache.get(key);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  return null;
}

function setCachedValidation(code: string, result: any): void {
  const key = getCacheKey(code);
  validationCache.set(key, { result, timestamp: Date.now() });
  
  // 캐시 크기 제한 (100개)
  if (validationCache.size > 100) {
    const firstKey = validationCache.keys().next().value;
    validationCache.delete(firstKey);
  }
}

// API Route에서 사용
const cached = getCachedValidation(code);
if (cached) {
  return NextResponse.json({ success: true, ...cached, cached: true });
}

const result = await gemini.validateHTMLCode(code);
setCachedValidation(code, result);
```

## 6. 에러 처리 및 Fallback

```typescript
async function validateCodeWithFallback(code: string): Promise<string> {
  try {
    const gemini = getGeminiClient();
    const result = await gemini.validateHTMLCode(code);
    return result.feedback;
  } catch (error: any) {
    console.error('Gemini validation error:', error);
    
    // Fallback: 기본 HTML 구문 체크
    return performBasicValidation(code);
  }
}

function performBasicValidation(code: string): string {
  const errors = [];
  
  // 기본 태그 체크
  if (!code.includes('<!DOCTYPE html>')) {
    errors.push('<!DOCTYPE html> 선언이 없습니다.');
  }
  
  if (!code.includes('<html')) {
    errors.push('<html> 태그가 없습니다.');
  }
  
  if (!code.includes('<head>')) {
    errors.push('<head> 태그가 없습니다.');
  }
  
  if (!code.includes('<body>')) {
    errors.push('<body> 태그가 없습니다.');
  }
  
  // 태그 짝 맞추기 체크 (간단 버전)
  const openTags = code.match(/<(\w+)[^>]*>/g) || [];
  const closeTags = code.match(/<\/(\w+)>/g) || [];
  
  if (openTags.length !== closeTags.length) {
    errors.push('닫히지 않은 태그가 있을 수 있습니다.');
  }
  
  if (errors.length === 0) {
    return '기본 구조는 올바릅니다. (간단 검증)';
  }
  
  return `다음 항목을 확인해주세요:\n${errors.join('\n')}`;
}
```

## 7. 사용량 모니터링

```typescript
// lib/gemini-monitor.ts
interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  errors: number;
  lastReset: number;
}

const stats: UsageStats = {
  totalRequests: 0,
  totalTokens: 0,
  errors: 0,
  lastReset: Date.now(),
};

export function trackGeminiUsage(tokens: number, isError: boolean = false) {
  stats.totalRequests++;
  stats.totalTokens += tokens;
  if (isError) stats.errors++;
  
  // 하루마다 리셋
  if (Date.now() - stats.lastReset > 86400000) {
    console.log('Daily Gemini usage:', stats);
    stats.totalRequests = 0;
    stats.totalTokens = 0;
    stats.errors = 0;
    stats.lastReset = Date.now();
  }
}

export function getUsageStats(): UsageStats {
  return { ...stats };
}
```

## 8. 테스트

### 8.1 단위 테스트 예시

```typescript
// __tests__/gemini.test.ts
import { GeminiClient } from '@/lib/gemini';

describe('GeminiClient', () => {
  const client = new GeminiClient(process.env.GEMINI_API_KEY!);

  test('validates correct HTML', async () => {
    const code = `<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body><h1>Hello</h1></body>
</html>`;

    const result = await client.validateHTMLCode(code);
    expect(result.isValid).toBe(true);
  });

  test('detects errors in HTML', async () => {
    const code = '<html><head><title>Test</title></head><body><h1>Unclosed';

    const result = await client.validateHTMLCode(code);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

## ✅ 체크리스트

- [ ] Gemini API 키 발급
- [ ] GeminiClient 클래스 구현
- [ ] 코드 검증 API 구현
- [ ] Rate limiting 적용
- [ ] 에러 처리 및 Fallback 구현
- [ ] 프롬프트 최적화
- [ ] 응답 캐싱 (선택)
- [ ] 사용량 모니터링
- [ ] 테스트 작성

## 🔧 문제 해결

### API 키 오류
```
Error: Invalid API key
```
- `.env.local`에 `GEMINI_API_KEY` 확인
- Google AI Studio에서 키 재발급

### Rate Limit 초과
```
Error: Resource exhausted
```
- 요청 간 딜레이 추가 (500ms~1s)
- 캐싱 활용
- 배치 작업은 느리게 처리

### 응답 형식 불일치
- 프롬프트를 더 명확하게 작성
- Temperature를 낮게 설정 (0.1~0.3)
- 응답 파싱 로직 개선

## 다음 단계

👉 **[TEMPLATE.md](./TEMPLATE.md)** - 템플릿 시스템 구현

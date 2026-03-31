import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getRateLimitKey(req);
    const { allowed } = checkRateLimit(`validate:${ip}`, 30, 60_000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, validation: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    const { code, participantId } = await req.json();

    if (!code || !participantId) {
      return NextResponse.json(
        { success: false, validation: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API 키가 설정되지 않았습니다.');
    }

    const prompt = `당신은 HTML을 처음 배우는 교사들에게 쉬운 말로 피드백을 주는 조교입니다.
다음 코드를 살펴보고 아래 형식의 JSON만 출력하세요. 한국어 자연어 문장을 사용하고, 영어는 html, css, js 같은 용어만 허용합니다. 절대 코드 블록(\`\`\`)이나 마크다운 기호를 쓰지 마세요.

{
  "summary": "전체 느낌을 한 문장으로 설명",
  "issues": ["문제가 있다면 쉽게 설명"],
  "fixes": ["어떻게 고치면 좋을지 간단히"],
  "encouragement": "응원의 한 문장",
  "corrected_code": "오류를 바로잡은 전체 HTML 코드. 입력과 동일한 구조를 유지하고 꼭 필요한 부분만 고치세요."
}

없거나 잘된 부분은 "좋아요! 계속 이렇게 해요."처럼 긍정적으로 적어주세요.

검토할 코드:
${code}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Gemini API 호출에 실패했습니다.');
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const jsonPayload = extractJsonPayload(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonPayload);
    } catch (error) {
      parsed = {
        summary: jsonPayload || '검증 결과를 불러오지 못했습니다.',
        issues: [],
        fixes: [],
        encouragement: '조금만 더 다듬어 볼까요?',
        corrected_code: code,
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      parsed = {
        summary: typeof parsed === 'string' ? parsed : '검증 결과를 불러오지 못했습니다.',
        issues: [],
        fixes: [],
        encouragement: '조금만 더 다듬어 볼까요?',
        corrected_code: code,
      };
    } else if (
      typeof (parsed as { corrected_code?: string }).corrected_code !== 'string' ||
      !(parsed as { corrected_code?: string }).corrected_code?.trim()
    ) {
      (parsed as { corrected_code: string }).corrected_code = code;
    }

    await supabase.from('td_code_validations').insert({
      participant_id: participantId,
      code,
      validation_result: typeof parsed === 'string' ? parsed : JSON.stringify(parsed),
    });

    return NextResponse.json({ success: true, validation: parsed });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      {
        success: false,
        validation: '코드 검증 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.',
      },
      { status: 500 }
    );
  }
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  const closingIndex = trimmed.lastIndexOf('```');
  if (closingIndex <= 0) return trimmed;

  const withoutFence = trimmed.slice(trimmed.indexOf('```') + 3, closingIndex);
  return withoutFence.replace(/^json\s*/i, '').trim();
}

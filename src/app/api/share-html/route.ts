import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getRateLimitKey(request);
    const { allowed } = checkRateLimit(`share:${ip}`, 20, 60_000);
    if (!allowed) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 });
    }

    const { participantId, code } = await request.json();

    if (!participantId || !code) {
      return NextResponse.json({ success: false, error: 'Missing participantId or code' }, { status: 400 });
    }

    // 코드 사이즈 체크 (2MB 제한)
    const codeSize = Buffer.byteLength(code, 'utf8');
    if (codeSize > 2097152) {
      return NextResponse.json({ success: false, error: 'Code size exceeds limit (2MB)' }, { status: 413 });
    }

    const supabase = await createClient();

    // Save to td_code_works with a special flag for QR sharing
    const timestamp = new Date().toISOString();
    const { data, error } = await supabase
      .from('td_code_works')
      .insert({
        participant_id: participantId,
        title: `QR 공유 - ${new Date().toLocaleString('ko-KR')}`,
        code,
        is_final: false,
      })
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: 'Failed to save code' }, { status: 500 });
    }

    // Generate a shareable URL pointing to a preview route
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const shareUrl = `${baseUrl}/preview/${data.id}`;

    return NextResponse.json({ success: true, url: shareUrl });
  } catch (error) {
    console.error('Error in share-html API:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

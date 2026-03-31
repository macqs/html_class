import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const correctPin = process.env.INSTRUCTOR_PIN;
    if (!correctPin) {
      // PIN 미설정 시 접근 허용 (개발 편의)
      return NextResponse.json({ success: true });
    }

    if (pin === correctPin) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

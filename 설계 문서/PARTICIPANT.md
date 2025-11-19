# 참가자 화면 구현

## 1. 화면 구조

참가자 화면은 다음과 같은 레이아웃으로 구성됩니다:

```
┌─────────────────────────────────────────────────────────┐
│ Header: [닉네임] | [좌석번호] | [마지막 저장: 1분 전]    │
└─────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────────────┐
│                  │                                      │
│  Code Editor     │      Live Preview                    │
│  (Monaco)        │      (iframe)                        │
│  (40%)           │      (60%)                           │
│                  │                                      │
│                  │                                      │
├──────────────────┴──────────────────────────────────────┤
│ [예제 불러오기 ▼] [코드 검증 🤖] [도움 요청 🆘]         │
│                                  [내 작품 저장 💾]       │
└─────────────────────────────────────────────────────────┘
```

## 2. 컴포넌트 생성

### 2.1 코드 에디터 컴포넌트

`components/editor/CodeEditor.tsx`:

```typescript
'use client';

import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

export default function CodeEditor({ code, onChange, readOnly = false }: CodeEditorProps) {
  return (
    <div className="h-full border border-gray-300 rounded-lg overflow-hidden">
      <Editor
        height="100%"
        defaultLanguage="html"
        value={code}
        onChange={onChange}
        theme="vs-light"
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}
```

### 2.2 미리보기 컴포넌트

`components/editor/PreviewFrame.tsx`:

```typescript
'use client';

import React, { useEffect, useRef } from 'react';

interface PreviewFrameProps {
  code: string;
}

export default function PreviewFrame({ code }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const document = iframe.contentDocument;
      
      if (document) {
        document.open();
        document.write(code);
        document.close();
      }
    }
  }, [code]);

  return (
    <div className="h-full border border-gray-300 rounded-lg overflow-hidden bg-white">
      <iframe
        ref={iframeRef}
        title="Preview"
        sandbox="allow-scripts"
        className="w-full h-full"
        style={{ border: 'none' }}
      />
    </div>
  );
}
```

### 2.3 예제 선택 드롭다운

`components/editor/ExampleSelector.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ExampleCode } from '@/types';
import { BookOpen, ChevronDown } from 'lucide-react';

interface ExampleSelectorProps {
  onSelect: (code: string) => void;
}

export default function ExampleSelector({ onSelect }: ExampleSelectorProps) {
  const [examples, setExamples] = useState<ExampleCode[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchExamples();
  }, []);

  async function fetchExamples() {
    const { data } = await supabase
      .from('example_codes')
      .select('*')
      .order('order_index');
    
    if (data) setExamples(data);
  }

  const difficultyColors = {
    basic: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
      >
        <BookOpen size={18} />
        예제 불러오기
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-300 rounded-lg shadow-xl z-20 max-h-96 overflow-auto">
            {examples.map((example) => (
              <button
                key={example.id}
                onClick={() => {
                  onSelect(example.code);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-b-0 transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{example.title}</span>
                  <span className={`text-xs px-2 py-1 rounded ${difficultyColors[example.difficulty]}`}>
                    {example.difficulty}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{example.description}</p>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

## 3. 메인 참가자 페이지

`app/participant/[sessionId]/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Participant } from '@/types';
import CodeEditor from '@/components/editor/CodeEditor';
import PreviewFrame from '@/components/editor/PreviewFrame';
import ExampleSelector from '@/components/editor/ExampleSelector';
import { Save, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';

export default function ParticipantPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [code, setCode] = useState('<!DOCTYPE html>\n<html>\n<head>\n  <title>내 작품</title>\n</head>\n<body>\n  <h1>여기에 코드를 작성하세요</h1>\n</body>\n</html>');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 닉네임과 좌석 정보는 로그인 시 localStorage에 저장되어 있다고 가정
  useEffect(() => {
    const participantId = localStorage.getItem('participantId');
    if (!participantId) {
      router.push(`/login?session=${sessionId}`);
      return;
    }
    
    loadParticipant(participantId);
    setupAutoSave();
  }, []);

  async function loadParticipant(id: string) {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setParticipant(data);
      loadLatestCode(id);
    }
  }

  async function loadLatestCode(participantId: string) {
    const { data } = await supabase
      .from('code_works')
      .select('*')
      .eq('participant_id', participantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setCode(data.code);
    }
  }

  // 3초마다 자동 저장
  function setupAutoSave() {
    const interval = setInterval(() => {
      saveCode(false);
    }, 3000);

    return () => clearInterval(interval);
  }

  const saveCode = useCallback(async (isFinal: boolean = false) => {
    if (!participant) return;

    setIsSaving(true);
    try {
      await supabase.from('code_works').insert({
        participant_id: participant.id,
        title: isFinal ? '최종 작품' : '자동 저장',
        code,
        is_final: isFinal,
      });

      setLastSaved(new Date());
    } catch (error) {
      console.error('저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  }, [participant, code]);

  async function validateCode() {
    if (!participant) return;

    setIsValidating(true);
    setValidationResult('');

    try {
      const response = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          participantId: participant.id,
        }),
      });

      const data = await response.json();
      setValidationResult(data.validation);
    } catch (error) {
      setValidationResult('검증 중 오류가 발생했습니다.');
    } finally {
      setIsValidating(false);
    }
  }

  async function requestHelp() {
    if (!participant) return;

    const message = prompt('어떤 부분이 어려우신가요?');
    if (!message) return;

    await supabase.from('help_requests').insert({
      participant_id: participant.id,
      message,
      code_snapshot: code,
    });

    // 상태를 help_needed로 변경
    await supabase
      .from('participants')
      .update({ status: 'help_needed' })
      .eq('id', participant.id);

    alert('도움 요청이 전송되었습니다! 강사님이 곧 도와드릴 거예요.');
  }

  function downloadCode() {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participant?.nickname}_작품_${new Date().getTime()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!participant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">{participant.nickname}</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {participant.seat_position}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          {lastSaved && `마지막 저장: ${Math.floor((Date.now() - lastSaved.getTime()) / 60000)}분 전`}
          {isSaving && <span className="ml-2">저장 중...</span>}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Code Editor - 40% */}
        <div className="w-2/5 flex flex-col gap-4">
          <CodeEditor
            code={code}
            onChange={(value) => setCode(value || '')}
          />
        </div>

        {/* Preview - 60% */}
        <div className="w-3/5 flex flex-col gap-4">
          <PreviewFrame code={code} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t px-6 py-4 flex items-center justify-between">
        <div className="flex gap-2">
          <ExampleSelector onSelect={setCode} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={validateCode}
            disabled={isValidating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
          >
            {isValidating ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <CheckCircle size={18} />
            )}
            코드 검증
          </button>

          <button
            onClick={requestHelp}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
          >
            <HelpCircle size={18} />
            도움 요청
          </button>

          <button
            onClick={downloadCode}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            <Save size={18} />
            내 작품 저장
          </button>
        </div>
      </div>

      {/* Validation Result Modal */}
      {validationResult && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setValidationResult('')}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">검증 결과</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{validationResult}</p>
            <button
              onClick={() => setValidationResult('')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 4. 로그인 페이지

`app/login/page.tsx`:

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session } from '@/types';
import { User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState<Session | null>(null);
  const [nickname, setNickname] = useState('');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [occupiedSeats, setOccupiedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadSession();
      loadOccupiedSeats();
    }
  }, [sessionId]);

  async function loadSession() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (data) setSession(data);
  }

  async function loadOccupiedSeats() {
    const { data } = await supabase
      .from('participants')
      .select('seat_position')
      .eq('session_id', sessionId);
    
    if (data) {
      setOccupiedSeats(data.map(p => p.seat_position));
    }
  }

  async function handleLogin() {
    if (!nickname || !selectedSeat || !sessionId) {
      alert('닉네임과 좌석을 선택해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      // 참가자 생성
      const { data, error } = await supabase
        .from('participants')
        .insert({
          session_id: sessionId,
          nickname,
          seat_position: selectedSeat,
          status: 'idle',
        })
        .select()
        .single();

      if (error) throw error;

      // localStorage에 참가자 ID 저장
      localStorage.setItem('participantId', data.id);

      // 참가자 화면으로 이동
      router.push(`/participant/${sessionId}`);
    } catch (error: any) {
      if (error.code === '23505') {
        alert('이미 사용 중인 좌석입니다.');
      } else {
        alert('로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">세션을 불러오는 중...</h2>
        </div>
      </div>
    );
  }

  const seatLayout = session.seat_layout as { rows: number; cols: number; labels: string[][] };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{session.title}</h1>
          <p className="text-gray-600">
            닉네임을 입력하고 자리를 선택하세요
          </p>
        </div>

        {/* 닉네임 입력 */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">닉네임</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="홍길동"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 좌석 선택 */}
        <div className="mb-8">
          <label className="block text-sm font-medium mb-4">좌석 선택</label>
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${seatLayout.cols}, 1fr)` }}>
              {seatLayout.labels.flat().map((seat) => {
                const isOccupied = occupiedSeats.includes(seat);
                const isSelected = selectedSeat === seat;

                return (
                  <button
                    key={seat}
                    onClick={() => !isOccupied && setSelectedSeat(seat)}
                    disabled={isOccupied}
                    className={`
                      py-3 rounded-lg font-medium transition
                      ${isSelected ? 'bg-blue-600 text-white' : ''}
                      ${isOccupied ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-blue-50'}
                    `}
                  >
                    {seat}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
              <span>사용 가능</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span>사용 중</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span>선택됨</span>
            </div>
          </div>
        </div>

        {/* 로그인 버튼 */}
        <button
          onClick={handleLogin}
          disabled={!nickname || !selectedSeat || isLoading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isLoading ? '입장 중...' : '입장하기'}
        </button>
      </div>
    </div>
  );
}
```

## 5. API 라우트: 코드 검증

`app/api/validate-code/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { code, participantId } = await req.json();

    // Gemini API 호출
    const prompt = `당신은 초보 교사들의 HTML 코드를 검토하는 친절한 조교입니다.
다음 코드를 검토하고 한국어로 답변하세요:

1. 구문 오류 여부 (있으면 정확한 위치와 해결법)
2. 실행 가능 여부
3. 간단한 개선 제안 1-2개

최대 200자 이내로 답변해주세요.

코드:
${code}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const validation = data.candidates[0].content.parts[0].text;

    // Supabase에 검증 결과 저장
    await supabase.from('code_validations').insert({
      participant_id: participantId,
      code,
      validation_result: validation,
    });

    return NextResponse.json({ success: true, validation });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        validation: '코드 검증 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.' 
      },
      { status: 500 }
    );
  }
}
```

## ✅ 체크리스트

- [ ] CodeEditor 컴포넌트 생성
- [ ] PreviewFrame 컴포넌트 생성
- [ ] ExampleSelector 컴포넌트 생성
- [ ] 참가자 메인 페이지 구현
- [ ] 로그인 페이지 구현
- [ ] 코드 검증 API 구현
- [ ] 자동 저장 기능 동작 확인
- [ ] 예제 불러오기 동작 확인
- [ ] 도움 요청 기능 확인

## 다음 단계

👉 **[INSTRUCTOR.md](./INSTRUCTOR.md)** - 강사 대시보드 구현

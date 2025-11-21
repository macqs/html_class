'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { HelpCircle, Loader2, Save, CheckCircle, Sparkles, Copy, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import type { Participant } from '@/types';
import CodeEditor from '@/components/editor/CodeEditor';
import PreviewFrame from '@/components/editor/PreviewFrame';
import ExampleSelector, { LocalExampleItem } from '@/components/editor/ExampleSelector';
import { useParticipantRealtime } from '@/hooks/useParticipantRealtime';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>내 작품</title>
</head>
<body>
  <h1>여기에 코드를 작성하세요</h1>
</body>
</html>`;

interface ValidationFeedback {
  summary: string;
  issues: string[];
  fixes: string[];
  encouragement: string;
  correctedCode: string;
}

interface ValidationModalProps {
  feedback: ValidationFeedback;
  onClose: () => void;
  onApply: () => void;
}

interface QRModalProps {
  url: string;
  onClose: () => void;
}

function QRModal({ url, onClose }: QRModalProps) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-emerald-600">
          <QrCode size={20} />
          <h3 className="text-base font-semibold">태블릿으로 스캔하세요</h3>
        </div>
        <p className="mt-3 text-sm text-zinc-600">
          아래 QR 코드를 태블릿 카메라로 스캔하면 현재 작성 중인 HTML을 바로 확인할 수 있습니다.
        </p>

        <div className="mt-6 flex justify-center rounded-xl bg-white p-4">
          <QRCodeSVG value={url} size={200} level="H" />
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-xs text-zinc-600">
          <p className="font-semibold">공유 링크:</p>
          <p className="mt-1 break-all font-mono text-zinc-800">{url}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-full bg-emerald-600 py-2 text-sm font-semibold text-white"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

function ValidationModal({ feedback, onClose, onApply }: ValidationModalProps) {
  const [copied, setCopied] = useState(false);

  async function copyCorrectedCode() {
    try {
      await navigator.clipboard.writeText(feedback.correctedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.');
    }
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-blue-600">
          <Sparkles size={20} />
          <h3 className="text-base font-semibold">코드 진단 결과</h3>
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-900">{feedback.summary}</p>

        <dl className="mt-4 space-y-3 text-sm text-zinc-700">
          <div>
            <dt className="text-xs font-semibold text-zinc-500">눈여겨볼 부분</dt>
            <dd className="mt-1 text-zinc-800">
              {feedback.issues.length ? feedback.issues[0] : '특별히 손볼 곳은 없어요.'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-zinc-500">이렇게 고쳐보세요</dt>
            <dd className="mt-1 text-zinc-800">
              {feedback.fixes.length ? feedback.fixes[0] : '지금 모습도 충분히 좋아요.'}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {feedback.encouragement}
        </div>

        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p>아래 버튼을 누르면 수정된 HTML 전체가 복사됩니다.</p>
          <button
            type="button"
            onClick={copyCorrectedCode}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-full border border-zinc-300 py-2 text-sm font-semibold text-zinc-800 hover:bg-white"
          >
            <Copy size={14} /> {copied ? '복사 완료!' : '수정 코드 복사'}
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-sm">
          <button
            type="button"
            onClick={onApply}
            className="rounded-full bg-blue-600 py-2 font-semibold text-white"
          >
            에디터에 붙여넣기
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 py-2 font-semibold text-zinc-700"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParticipantPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const sessionId = params.sessionId;

  const [participant, setParticipant] = useState<Participant | null>(null);
  const [code, setCode] = useState(DEFAULT_HTML);
  const [validationResult, setValidationResult] = useState<ValidationFeedback | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [localExamples, setLocalExamples] = useState<LocalExampleItem[]>([]);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const getLocalExamplesKey = (participantId: string) => `localExamples:${participantId}`;

  const loadLocalExamples = useCallback(
    (participantId: string) => {
      if (typeof window === 'undefined') return;
      const stored = localStorage.getItem(getLocalExamplesKey(participantId));
      if (!stored) {
        setLocalExamples([]);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as LocalExampleItem[];
        setLocalExamples(parsed);
      } catch {
        setLocalExamples([]);
      }
    },
    [],
  );

  const persistLocalExamples = useCallback(
    (participantId: string, items: LocalExampleItem[]) => {
      if (typeof window === 'undefined') return;
      setLocalExamples(items);
      localStorage.setItem(getLocalExamplesKey(participantId), JSON.stringify(items));
    },
    [],
  );

  useEffect(() => {
    const storedId = typeof window !== 'undefined' ? localStorage.getItem('participantId') : null;
    if (!storedId) {
      router.replace(`/login?session=${sessionId}`);
      return;
    }

    supabase
      .from('td_participants')
      .select('*')
      .eq('id', storedId)
      .single()
      .then(({ data }: { data: Participant | null }) => {
        if (data) {
          setParticipant(data);
          subscribeToParticipant(data.id);
          loadLatestCode(data.id);
          loadLocalExamples(data.id);
        }
      });
  }, [loadLocalExamples, router, sessionId]);

  function subscribeToParticipant(participantId: string) {
    const channel = supabase
      .channel(`participant-status:${participantId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'td_participants', filter: `id=eq.${participantId}` },
        (payload) => {
          const updated = payload.new as Participant;
          setParticipant((prev) => {
            if (!prev) return updated;
            return { ...prev, ...updated };
          });
        },
      )
      .subscribe();

    channelRef.current = channel;
  }

  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, []);

  const { announcement, sharedCode, liveExamples, updateStatus, requestHelp } = useParticipantRealtime(
    sessionId,
    participant?.id ?? '',
    participant?.seat_position ?? '',
  );

  useEffect(() => {
    if (sharedCode) setCode(sharedCode);
  }, [sharedCode]);

  const saveCode = useCallback(
    async (isFinal = false) => {
      if (!participant) return;

      setIsSaving(true);
      await supabase.from('td_code_works').insert({
        participant_id: participant.id,
        title: isFinal ? '최종 작품' : '자동 저장',
        code,
        is_final: isFinal,
      });

      setIsSaving(false);
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
    },
    [code, localExamples, participant, persistLocalExamples]
  );

  const handleRemoveLocalExample = useCallback(
    (id: string) => {
      if (!participant) return;
      const next = localExamples.filter((example) => example.id !== id);
      persistLocalExamples(participant.id, next);
    },
    [localExamples, participant, persistLocalExamples],
  );

  useEffect(() => {
    if (!participant) return;

    const interval = setInterval(() => {
      saveCode();
    }, 3000);

    return () => clearInterval(interval);
  }, [participant, code, saveCode]);

  useEffect(() => {
    if (!participant) return;
    if (participant.status !== 'idle') return;

    updateStatus('working')
      .then(() =>
        setParticipant((prev) => (prev ? { ...prev, status: 'working' } : prev)),
      )
      .catch(() => null);
  }, [participant?.status, updateStatus]);

  async function loadLatestCode(id: string) {
    const { data } = await supabase
      .from('td_code_works')
      .select('*')
      .eq('participant_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setCode(data.code);
  }

  async function validateCode() {
    if (!participant) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/validate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, participantId: participant.id }),
      });
      const data = await response.json();
      if (!data.success) {
        setValidationResult(createFallbackFeedback('검증 결과를 불러오지 못했습니다.', code));
      } else {
        const normalized = normalizeFeedback(data.validation, code);
        setValidationResult(normalized);
      }
    } catch (error) {
      setValidationResult(
        createFallbackFeedback('코드 검증 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code),
      );
    } finally {
      setIsValidating(false);
    }
  }

  async function handleRequestHelp() {
    if (!participant) return;
    await requestHelp('도움이 필요합니다.', code);
    setParticipant((prev) => (prev ? { ...prev, status: 'help_needed' } : prev));
    alert('도움 요청이 전송되었습니다!');
  }

  async function handleShareQR() {
    if (!participant) return;

    setIsSharing(true);
    try {
      const response = await fetch('/api/share-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId: participant.id, code }),
      });
      const data = await response.json();

      if (data.success && data.url) {
        setShareUrl(data.url);
        setIsQRModalOpen(true);
      } else {
        alert('QR 코드 생성에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (error) {
      alert('QR 코드 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSharing(false);
    }
  }

  function downloadCode() {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${participant?.nickname ?? 'participant'}_${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!participant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-zinc-900">{participant.nickname}</h1>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
            {participant.seat_position}
          </span>
        </div>
        <div className="text-sm text-zinc-600">
          {lastSaved ? `마지막 저장: ${Math.floor((Date.now() - lastSaved.getTime()) / 60000)}분 전` : '자동 저장 대기 중'}
          {isSaving && <span className="ml-2 text-blue-600">저장 중...</span>}
        </div>
      </header>

      <main className="flex flex-1 gap-4 p-4">
        <section className="flex w-2/5 flex-col">
          <CodeEditor code={code} onChange={(value) => setCode(value ?? '')} />
        </section>
        <section className="flex w-3/5 flex-col">
          <PreviewFrame code={code} />
        </section>
      </main>

      <div className="flex items-center justify-between border-t bg-white px-6 py-4">
        <ExampleSelector
          onSelect={setCode}
          liveExamples={liveExamples}
          localExamples={localExamples}
          onRemoveLocalExample={handleRemoveLocalExample}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={validateCode}
            disabled={isValidating}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:opacity-60"
          >
            {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
            코드 검증
          </button>
          <button
            type="button"
            onClick={() => handleRequestHelp()}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
          >
            <HelpCircle size={16} />
            도움 요청
          </button>
          <button
            type="button"
            onClick={() => saveCode(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700"
          >
            <Save size={16} />
            내 작품 저장
          </button>
          <button
            type="button"
            onClick={handleShareQR}
            disabled={isSharing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
          >
            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode size={16} />}
            QR 공유
          </button>
          <button
            type="button"
            onClick={downloadCode}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 shadow hover:bg-zinc-50"
          >
            다운로드
          </button>
        </div>
      </div>

      {announcement && (
        <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-blue-600 px-6 py-3 text-white shadow-xl">
          📢 {announcement}
        </div>
      )}

      {validationResult && (
        <ValidationModal
          feedback={validationResult}
          onClose={() => setValidationResult(null)}
          onApply={() => setCode(validationResult.correctedCode)}
        />
      )}

      {isQRModalOpen && shareUrl && (
        <QRModal url={shareUrl} onClose={() => setIsQRModalOpen(false)} />
      )}

    </div>
  );
}

function createFallbackFeedback(message: string, currentCode: string): ValidationFeedback {
  return {
    summary: message,
    issues: [],
    fixes: [],
    encouragement: '충분히 잘하고 있어요. 차근차근 수정해봐요!',
    correctedCode: currentCode,
  };
}

function normalizeFeedback(payload: unknown, currentCode: string): ValidationFeedback {
  if (!payload || typeof payload !== 'object') {
    return createFallbackFeedback('검증 결과를 불러오지 못했습니다.', currentCode);
  }

  const shape = payload as {
    summary?: string;
    issues?: unknown;
    fixes?: unknown;
    encouragement?: string;
    corrected_code?: string;
  };

  return {
    summary: shape.summary || '정상적으로 확인되었습니다.',
    issues: Array.isArray(shape.issues) ? (shape.issues.filter((item): item is string => typeof item === 'string')) : [],
    fixes: Array.isArray(shape.fixes) ? (shape.fixes.filter((item): item is string => typeof item === 'string')) : [],
    encouragement: shape.encouragement || '지금처럼만 해도 충분히 좋아요!',
    correctedCode: shape.corrected_code && shape.corrected_code.trim() ? shape.corrected_code : currentCode,
  };
}

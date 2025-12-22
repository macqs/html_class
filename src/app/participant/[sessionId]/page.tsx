'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useParams, useRouter } from 'next/navigation';
import { HelpCircle, Loader2, Save, CheckCircle, Sparkles, Copy, QrCode, MessageSquareText, X, MousePointerClick, Download } from 'lucide-react';
import { ChatGPTIcon, ClaudeIcon, GeminiIcon } from '@/components/icons/AIIcons';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import type { Participant, SessionMode } from '@/types';
import CodeEditor from '@/components/editor/CodeEditor';
import PreviewFrame from '@/components/editor/PreviewFrame';
import ExampleSelector, { LocalExampleItem } from '@/components/editor/ExampleSelector';
import ExtensionToolButton from '@/components/shared/ExtensionToolButton';
import { useParticipantRealtime } from '@/hooks/useParticipantRealtime';
import { ParticipantWordCloud } from '@/components/wordcloud';

const DEFAULT_HTML = ``;

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

interface GuideOverlayProps {
  message: string;
  subMessage?: string;
  onDismiss: () => void;
}

function GuideOverlay({ message, subMessage, onDismiss }: GuideOverlayProps) {
  return (
    <div 
      className="absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center bg-black/70 p-6 text-center text-white backdrop-blur-sm transition-opacity hover:bg-black/60"
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
    >
      <div className="mb-4 rounded-full bg-white/20 p-4">
        <MousePointerClick size={32} className="animate-pulse text-white" />
      </div>
      <h3 className="mb-2 text-xl font-bold md:text-2xl">{message}</h3>
      {subMessage && <p className="text-sm text-zinc-200 md:text-base">{subMessage}</p>}
      <p className="mt-8 text-xs font-medium text-zinc-400">화면을 클릭하면 시작합니다</p>
    </div>
  );
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

const BEGINNER_PROMPT = `너는 특수교육 전문가이자 웹 개발자야.

[장애유형] [학년] 학생을 위한 [도구명]를 만들어줘.

학습 목표: [목표]
학생 특성: [특성]

요구사항:
- 단일 HTML 파일로 제작 (HTML/CSS/JS 한 파일)
- [구체적 요구사항들]
- 한국어 인터페이스
- 큰 버튼과 명확한 안내 문구 포함
- 태블릿/PC에서 모두 잘 보이도록 16:9 가로모드 기준
- 터치 입력 가능(hover 대신 click/touch 사용)`;

const ADVANCED_PROMPT = `아래 조건에 맞는 HTML 학습 콘텐츠를 만들어주세요.

## 필수 조건
- **단일 HTML 파일**: HTML, CSS, JavaScript를 하나의 파일에 모두 포함
- **화면 비율**: 16:9 (가로모드 기준)
- **반응형 대응**: 다양한 화면 크기에서 깨지지 않도록 설계

## 디바이스 정보 (아래에서 선택하여 작성)
- 사용 환경: [PC / 태블릿 / 스마트폰]
- 태블릿 기종 (해당 시): [iPad / 갤럭시탭 / 기타]
- 화면 방향: [가로모드 / 세로모드]

## 콘텐츠 요청
- 주제: [원하는 학습 주제를 입력하세요]
- 대상 학년: [유아 / 초등 저학년 / 초등 고학년 / 중등]
- 상호작용 유형: [드래그앤드롭 / 클릭 / 터치 / 입력]

## 기술 요구사항
- 외부 라이브러리 사용 금지 (순수 HTML/CSS/JS만 사용)
- 이미지는 이모지 또는 CSS로 대체
- 터치 디바이스 호환 (hover 대신 click/touch 이벤트)
- 큰 버튼/터치 영역 (최소 44px 이상)
- 명확한 시각적 피드백 제공

## 접근성
- 고대비 색상 사용
- 큰 글씨 (최소 16px 이상)
- 명확한 지시문 포함`;

interface PromptGuideModalProps {
  onClose: () => void;
}

function PromptGuideModal({ onClose }: PromptGuideModalProps) {
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<'beginner' | 'advanced'>('beginner');
  const activePrompt = mode === 'beginner' ? BEGINNER_PROMPT : ADVANCED_PROMPT;

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(activePrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('복사에 실패했습니다.');
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
        className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-amber-50 px-6 py-4">
          <div className="flex items-center gap-2 text-amber-800">
            <MessageSquareText size={20} />
            <h3 className="text-lg font-bold">추천 프롬프트 가이드</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-zinc-400 hover:bg-white">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="mb-4 flex flex-col gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">프롬프트 모드 선택</p>
              <p className="text-xs text-amber-800">
                초급 모드는 간단 템플릿, 고급 모드는 세부 가이드를 제공합니다.
              </p>
            </div>
            <div className="flex rounded-full border border-amber-200 bg-white p-1 text-xs font-semibold text-amber-800">
              <button
                type="button"
                onClick={() => setMode('beginner')}
                className={`rounded-full px-3 py-1 transition ${mode === 'beginner' ? 'bg-amber-600 text-white' : ''}`}
              >
                초급 모드
              </button>
              <button
                type="button"
                onClick={() => setMode('advanced')}
                className={`rounded-full px-3 py-1 transition ${mode === 'advanced' ? 'bg-amber-600 text-white' : ''}`}
              >
                고급 모드
              </button>
            </div>
          </div>

          <p className="mb-4 text-sm text-zinc-600">
            아래 프롬프트를 복사하여 ChatGPT, Claude, Gemini 등에 붙여넣고,
            <span className="font-semibold text-amber-700"> [대괄호] 부분</span>을 본인 상황에 맞게 수정하세요.
          </p>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <pre className="whitespace-pre-wrap text-sm text-zinc-800">{activePrompt}</pre>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">💡 사용 팁</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-amber-800">
              <li>초급 모드는 구조를 간단히, 고급 모드는 상세 요구사항을 포함합니다.</li>
              <li>디바이스 정보를 정확히 입력하면 반응형이 더 잘 맞음</li>
              <li>주제는 구체적으로 작성할수록 좋은 결과물이 나옴</li>
              <li>생성된 코드를 메모장에 붙여넣고 .html로 저장</li>
              <li>문제가 있으면 &quot;코드 검증&quot; 버튼으로 수정 요청 가능</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 border-t bg-zinc-50 px-6 py-4">
          <button
            type="button"
            onClick={copyPrompt}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
          >
            <Copy size={16} />
            {copied ? '복사 완료!' : '프롬프트 복사하기'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            닫기
          </button>
        </div>
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
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>('html');

  // 쿨다운 상태
  const [validateCooldown, setValidateCooldown] = useState(0);
  const [helpCooldown, setHelpCooldown] = useState(0);

  // 리사이저 상태 (에디터 비율, 기본 40%)
  const [editorRatio, setEditorRatio] = useState(40);
  const [isResizing, setIsResizing] = useState(false);
  const [isMdScreen, setIsMdScreen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // 가이드 오버레이 상태
  const [showEditorGuide, setShowEditorGuide] = useState(false);
  const [showPreviewGuide, setShowPreviewGuide] = useState(false);

  // 가이드 표시 여부 확인 (최초 접속 시)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const editorSeen = localStorage.getItem('guide_editor_seen');
    const previewSeen = localStorage.getItem('guide_preview_seen');

    if (!editorSeen) setShowEditorGuide(true);
    if (!previewSeen) setShowPreviewGuide(true);
  }, []);

  const dismissEditorGuide = () => {
    localStorage.setItem('guide_editor_seen', 'true');
    setShowEditorGuide(false);
  };

  const dismissPreviewGuide = () => {
    localStorage.setItem('guide_preview_seen', 'true');
    setShowPreviewGuide(false);
  };

  // 화면 크기 감지 (md breakpoint = 768px)
  useEffect(() => {
    function checkScreen() {
      setIsMdScreen(window.innerWidth >= 768);
    }
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // 쿨다운 타이머
  useEffect(() => {
    if (validateCooldown <= 0) return;
    const timer = setTimeout(() => setValidateCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [validateCooldown]);

  useEffect(() => {
    if (helpCooldown <= 0) return;
    const timer = setTimeout(() => setHelpCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [helpCooldown]);

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

    // 세션 모드 가져오기
    supabase
      .from('td_sessions')
      .select('mode')
      .eq('id', sessionId)
      .single()
      .then(({ data }) => {
        if (data?.mode) {
          setSessionMode(data.mode as SessionMode);
        }
      });

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

  // 세션 모드 실시간 구독 (별도 useEffect)
  useEffect(() => {
    const sessionChannel = supabase
      .channel(`session-mode-participant-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'td_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.new && 'mode' in payload.new) {
            setSessionMode(payload.new.mode as SessionMode);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId]);

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

  const { announcement, liveExamples, updateStatus, requestHelp } = useParticipantRealtime(
    sessionId,
    participant?.id ?? '',
    participant?.seat_position ?? '',
    { onModeChange: setSessionMode }
  );

  const saveCode = useCallback(
    async (isFinal = false) => {
      if (!participant) return;

      // 코드 사이즈 체크 (1MB 소프트 제한, 2MB 하드 제한)
      const codeSize = new Blob([code]).size;
      const sizeMB = (codeSize / 1024 / 1024).toFixed(2);
      
      if (codeSize > 2097152) { // 2MB 하드 제한
        if (isFinal) {
          alert(`코드가 너무 큽니다 (${sizeMB}MB / 2MB). 이미지는 외부 링크를 사용하거나 크기를 줄여주세요.`);
        }
        return;
      }
      
      if (codeSize > 1048576 && isFinal) { // 1MB 경고
        const confirmSave = confirm(
          `코드 크기가 큽니다 (${sizeMB}MB).\n` +
          `이미지가 포함되어 있다면 외부 링크 사용을 권장합니다.\n\n` +
          `그래도 저장하시겠습니까?`
        );
        if (!confirmSave) return;
      }

      setIsSaving(true);
      try {
        const { error } = await supabase.from('td_code_works').insert({
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
    }, 5000); // 5초 간격 (DB 부하 방지)

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
    if (validateCooldown > 0) {
      alert(`코드 검증은 ${validateCooldown}초 후에 다시 사용할 수 있습니다.`);
      return;
    }

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
      setValidateCooldown(30); // 30초 쿨다운
    }
  }

  async function handleRequestHelp() {
    if (!participant) return;
    if (helpCooldown > 0) {
      alert(`도움 요청은 ${helpCooldown}초 후에 다시 할 수 있습니다.`);
      return;
    }
    
    try {
      await requestHelp('도움이 필요합니다.', code);
      setParticipant((prev) => (prev ? { ...prev, status: 'help_needed' } : prev));
      setHelpCooldown(30); // 30초 쿨다운
      alert('도움 요청이 전송되었습니다!');
    } catch (error) {
      console.error('Help request error:', error);
      alert('도움 요청 전송에 실패했습니다. 다시 시도해주세요.');
    }
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

  // 워드클라우드 모드일 때는 간단한 UI만 표시
  if (sessionMode === 'wordcloud') {
    return (
      <div className="flex h-screen flex-col bg-gradient-to-br from-cyan-50 to-blue-50 overflow-hidden">
        {/* 헤더 */}
        <header className="flex-none flex items-center justify-between border-b bg-white px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-zinc-900 md:text-xl">{participant.nickname}</h1>
            <span className="rounded-full bg-cyan-100 px-3 py-1 text-sm font-semibold text-cyan-800">
              {participant.seat_position}
            </span>
          </div>
        </header>

        {/* 워드클라우드 입력 영역 */}
        <main className="flex-1 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-y-auto">
          <div className="w-full max-w-lg">
            <ParticipantWordCloud sessionId={sessionId} participantId={participant.id} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 overflow-hidden">
      {/* 통합 헤더 (한 줄 레이아웃) */}
      <header className="flex-none flex items-center justify-between bg-white border-b shadow-sm z-10 h-14 md:h-16">
        {/* 좌측: 사용자 정보 (고정) */}
        <div className="flex-none flex items-center gap-2 pl-3 md:pl-6 pr-2 bg-white z-10">
          <h1 className="text-base font-bold text-zinc-900 truncate max-w-[80px] md:max-w-[120px]">
            {participant.nickname}
          </h1>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 shrink-0">
            {participant.seat_position}
          </span>
        </div>

        {/* 우측: 스크롤 가능한 툴바 영역 */}
        <div className="flex-1 flex items-center justify-end gap-3 overflow-x-auto no-scrollbar px-2 pr-3 md:pr-6 h-full mask-linear-fade">
          
          {/* Group 1: 참조 리소스 (AI & 가이드) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* AI 링크 - 아이콘 위주로 컴팩트하게 */}
            <div className="flex items-center gap-1">
              <a
                href="https://chatgpt.com"
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                title="ChatGPT"
              >
                <ChatGPTIcon className="w-5 h-5" />
              </a>
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                title="Claude"
              >
                <ClaudeIcon className="w-5 h-5" />
              </a>
              <a
                href="https://gemini.google.com/"
                target="_blank"
                rel="noreferrer noopener"
                className="flex h-9 w-9 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                title="Gemini"
              >
                <GeminiIcon className="w-5 h-5" />
              </a>
            </div>

            {/* 학습 보조 */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsPromptModalOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                <MessageSquareText size={15} />
                <span className="hidden xl:inline">프롬프트</span>
              </button>
              <div className="h-9">
                <ExampleSelector
                  onSelect={setCode}
                  liveExamples={liveExamples}
                  localExamples={localExamples}
                  onRemoveLocalExample={handleRemoveLocalExample}
                />
              </div>
            </div>
          </div>

          <div className="h-5 w-px bg-zinc-200 shrink-0"></div>

          {/* Group 2: 에디터 액션 (확장/검증/도움) */}
          <div className="flex items-center gap-2 shrink-0">
            <ExtensionToolButton simple />
            
            <button
              type="button"
              onClick={validateCode}
              disabled={isValidating || validateCooldown > 0}
              className="flex h-9 items-center gap-1.5 rounded-md bg-purple-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle size={16} />}
              <span className="hidden sm:inline">{validateCooldown > 0 ? `${validateCooldown}s` : '검증'}</span>
            </button>
            
            <button
              type="button"
              onClick={() => handleRequestHelp()}
              disabled={helpCooldown > 0}
              className="flex h-9 items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 text-sm font-medium text-orange-700 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <HelpCircle size={16} />
              <span className="hidden sm:inline">{helpCooldown > 0 ? `${helpCooldown}s` : '도움'}</span>
            </button>
          </div>

          <div className="h-5 w-px bg-zinc-200 shrink-0"></div>

          {/* Group 3: 파일 및 공유 (저장/다운/QR) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => saveCode(true)}
              className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 transition-colors whitespace-nowrap"
            >
              <Save size={16} />
              <span>저장</span>
            </button>

            <button
              type="button"
              onClick={downloadCode}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors whitespace-nowrap"
              title="HTML 다운로드"
            >
              <Download size={16} />
            </button>

            <button
              type="button"
              onClick={handleShareQR}
              disabled={isSharing}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-50 transition-colors whitespace-nowrap"
              title="QR 코드로 공유"
            >
              {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* 워드클라우드 (활성화 시 표시) */}
      {/* 워드클라우드는 모달이나 별도 영역으로 띄우는 것이 좋을 수 있으나 기존 위치 유지 */}
      <div className="px-2 pt-2 md:px-4 md:pt-4 empty:hidden">
        <ParticipantWordCloud sessionId={sessionId} participantId={participant.id} />
      </div>

      {/* 메인 영역 - 리사이저 포함 */}
      <main
        ref={mainRef}
        className={`flex-1 flex flex-col md:flex-row min-h-0 gap-2 p-2 md:gap-0 md:p-4 ${isResizing ? 'cursor-col-resize select-none' : ''}`}
        onMouseMove={(e) => {
          if (!isResizing || !mainRef.current) return;
          e.preventDefault();
          const rect = mainRef.current.getBoundingClientRect();
          const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
          setEditorRatio(Math.min(Math.max(newRatio, 20), 80));
        }}
        onMouseUp={() => setIsResizing(false)}
        onMouseLeave={() => setIsResizing(false)}
        onTouchMove={(e) => {
          if (!isResizing || !mainRef.current || !e.touches[0]) return;
          const rect = mainRef.current.getBoundingClientRect();
          const newRatio = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
          setEditorRatio(Math.min(Math.max(newRatio, 20), 80));
        }}
        onTouchEnd={() => setIsResizing(false)}
      >
        {/* 코드 에디터 */}
        <section
          className="relative flex h-1/2 flex-col md:h-full min-h-0"
          style={isMdScreen ? { width: `${editorRatio}%` } : undefined}
        >
          {showEditorGuide && (
            <GuideOverlay
              message="이 영역은 윈도우 PC의 메모장과 같습니다"
              subMessage="여기에 코드를 붙여넣고 .html 확장자로 변경하면 웹페이지가 됩니다."
              onDismiss={dismissEditorGuide}
            />
          )}
          <CodeEditor code={code} onChange={(value) => setCode(value ?? '')} />
        </section>

        {/* 리사이저 핸들 - PC/태블릿 가로 모드 전용 */}
        <div
          className="hidden cursor-col-resize items-center justify-center md:flex"
          style={{ width: '12px', margin: '0 4px' }}
          onMouseDown={() => setIsResizing(true)}
          onTouchStart={() => setIsResizing(true)}
        >
          <div className={`h-16 w-1.5 rounded-full transition-colors ${isResizing ? 'bg-blue-500' : 'bg-zinc-300 hover:bg-zinc-400'}`} />
        </div>

      {/* 모바일 세로 모드용 구분선 */}
        <div className="md:hidden h-2 w-full shrink-0"></div>

        {/* 미리보기 */}
        <section className="relative flex h-1/2 flex-1 flex-col md:h-full min-h-0">
          {showPreviewGuide && (
            <GuideOverlay
              message="이 영역은 인터넷 브라우저와 같습니다"
              subMessage="Chrome, Edge, Safari처럼 작성한 코드를 즉시 확인할 수 있습니다."
              onDismiss={dismissPreviewGuide}
            />
          )}
          <PreviewFrame code={code} />
        </section>
      </main>

      {announcement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-500 px-6 py-6 text-center shadow-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-100">전체 공지</p>
            <p className="mt-3 text-2xl font-bold text-white md:text-3xl">📢 {announcement}</p>
            <p className="mt-2 text-sm text-blue-100">잠시 확인 후 닫아주세요.</p>
          </div>
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

      {isPromptModalOpen && (
        <PromptGuideModal onClose={() => setIsPromptModalOpen(false)} />
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

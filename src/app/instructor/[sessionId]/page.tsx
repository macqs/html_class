'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Megaphone, FileText, Award, Power, X, Cloud, Code, QrCode } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { createChannel, broadcastEvent } from '@/lib/realtime';
import type { ExampleCode, Participant, SeatLayout, Session } from '@/types';
import StatsBar from '@/components/dashboard/StatsBar';
import SeatMap from '@/components/dashboard/SeatMap';
import CodePreviewPanel from '@/components/dashboard/CodePreviewPanel';
import ParticipantModal from '@/components/dashboard/ParticipantModal';
import { useInstructorRealtime } from '@/hooks/useInstructorRealtime';
import { WordCloudFullPanel } from '@/components/wordcloud';

interface ActivityLogEntry {
  id: string;
  session_id: string;
  action_type: string;
  content: string;
  created_at: string;
}

export default function InstructorDashboardPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<Session | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [codeSnapshot, setCodeSnapshot] = useState('');
  const [examples, setExamples] = useState<ExampleCode[]>([]);
  const [isExamplePickerOpen, setIsExamplePickerOpen] = useState(false);
  const [isLoadingExamples, setIsLoadingExamples] = useState(false);
  const [exampleSearchText, setExampleSearchText] = useState('');
  const [exampleSubjectFilter, setExampleSubjectFilter] = useState<'all' | '국어' | '사회' | '수학' | '과학'>('all');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingParticipantId, setSharingParticipantId] = useState<string | null>(null);
  const [selectedExampleIds, setSelectedExampleIds] = useState<Set<string>>(new Set());
  const [customCode, setCustomCode] = useState('');
  const [customCodeTitle, setCustomCodeTitle] = useState('');
  const [isSendingMultiple, setIsSendingMultiple] = useState(false);
  const [isWordCloudOpen, setIsWordCloudOpen] = useState(false);
  const [isAccessInfoOpen, setIsAccessInfoOpen] = useState(false);
  const [previewExampleCode, setPreviewExampleCode] = useState<string | null>(null);
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  // 와이파이 정보 로컬스토리지에서 로드
  useEffect(() => {
    const savedWifiName = localStorage.getItem('instructor_wifi_name') || '';
    const savedWifiPassword = localStorage.getItem('instructor_wifi_password') || '';
    // eslint-disable-next-line
    setWifiName(savedWifiName);
    setWifiPassword(savedWifiPassword);
  }, []);

  // 와이파이 정보 저장
  const saveWifiInfo = () => {
    localStorage.setItem('instructor_wifi_name', wifiName);
    localStorage.setItem('instructor_wifi_password', wifiPassword);
  };

  async function loadSession() {
    const { data } = await supabase
      .from('td_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (data) setSession(data as Session);
  }

  useEffect(() => {
    // eslint-disable-next-line
    loadSession();
  }, [sessionId]);

  // 세션 모드 실시간 구독
  useEffect(() => {
    const channel = supabase
      .channel(`session-mode-${sessionId}`)
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
            setSession((prev) => prev ? { ...prev, mode: payload.new.mode } : prev);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // 모드 전환 함수
  async function toggleMode() {
    if (!session) return;
    const newMode = session.mode === 'wordcloud' ? 'html' : 'wordcloud';

    // 워드클라우드 → HTML 전환 시 활성 워드클라우드 종료
    if (session.mode === 'wordcloud' && newMode === 'html') {
      await supabase
        .from('td_wordclouds')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('session_id', sessionId)
        .eq('is_active', true);
    }
    
    const { error } = await supabase
      .from('td_sessions')
      .update({ mode: newMode })
      .eq('id', sessionId);

    if (error) {
      alert('모드 전환에 실패했습니다.');
      return;
    }

    // 브로드캐스트로 참가자들에게 모드 변경 알림
    const channel = createChannel(sessionId, 'broadcast');
    await channel.subscribe();
    await broadcastEvent(channel, {
      type: 'mode_change',
      participantId: '',
      data: { mode: newMode },
    });
    supabase.removeChannel(channel);

    setSession((prev) => prev ? { ...prev, mode: newMode } : prev);
  }

  const {
    participants,
    helpRequests,
    sendAnnouncement,
    distributeExample,
    shareExcellentWork,
    removeParticipant,
    markHelpRequestResolved,
  } = useInstructorRealtime(sessionId);

  async function broadcastAnnouncement() {
    const message = prompt('전체 공지를 입력하세요.');
    if (!message) return;
    await sendAnnouncement(message);
    alert('공지가 전송되었습니다!');
  }

  async function openExamplePicker() {
    setIsExamplePickerOpen(true);
    if (examples.length) return;

    setIsLoadingExamples(true);
    const { data } = await supabase.from('td_example_codes').select('*').order('order_index');
    if (data) setExamples(data as ExampleCode[]);
    setIsLoadingExamples(false);
  }

  function closeExamplePicker() {
    setIsExamplePickerOpen(false);
    setExampleSearchText('');
    setExampleSubjectFilter('all');
    setSelectedExampleIds(new Set());
    setCustomCode('');
    setCustomCodeTitle('');
  }

  async function handleSelectExample(example: ExampleCode) {
    await distributeExample(example.title, example.code);
    alert('예제가 배포되었습니다!');
    closeExamplePicker();
  }

  function toggleExampleSelection(exampleId: string) {
    setSelectedExampleIds((prev) => {
      const next = new Set(prev);
      if (next.has(exampleId)) {
        next.delete(exampleId);
      } else {
        next.add(exampleId);
      }
      return next;
    });
  }

  async function handleSendSelectedExamples() {
    if (selectedExampleIds.size === 0) {
      alert('배포할 예제를 선택해주세요.');
      return;
    }
    setIsSendingMultiple(true);
    const selectedExamples = examples.filter((e) => selectedExampleIds.has(e.id));
    for (const example of selectedExamples) {
      await distributeExample(example.title, example.code);
    }
    setIsSendingMultiple(false);
    alert(`${selectedExamples.length}개 예제가 배포되었습니다!`);
    closeExamplePicker();
  }

  async function handleSendCustomCode() {
    const code = customCode.trim();
    if (!code) {
      alert('배포할 코드를 입력해주세요.');
      return;
    }
    const title = customCodeTitle.trim() || '즉흥 코드';
    await distributeExample(title, code);
    alert('코드가 배포되었습니다!');
    closeExamplePicker();
  }

  function openShareModal() {
    if (!participants.length) {
      alert('참가자가 없습니다.');
      return;
    }
    setIsShareModalOpen(true);
  }

  function closeShareModal() {
    setIsShareModalOpen(false);
    setSharingParticipantId(null);
  }

  const filteredExamples = examples.filter((example) => {
    const query = exampleSearchText.trim().toLowerCase();
    const matchesSearch = !query || example.title.toLowerCase().includes(query) || example.description?.toLowerCase().includes(query);
    
    if (exampleSubjectFilter === 'all') return matchesSearch;
    
    const subjectMatch = example.title.match(/^\[([^\-\]]+)/);
    const subject = subjectMatch?.[1];
    return matchesSearch && subject === exampleSubjectFilter;
  });

  async function handleShareExcellentWork(participant: Participant) {
    setSharingParticipantId(participant.id);
    const { data } = await supabase
      .from('td_code_works')
      .select('*')
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setSharingParticipantId(null);

    if (!data) {
      alert('공유할 코드가 없습니다. 최근 작업을 저장하도록 안내해주세요.');
      return;
    }

    await shareExcellentWork(participant.id, data.code);
    alert(`${participant.nickname}님의 코드를 공유했습니다!`);
    closeShareModal();
  }

  async function endSession() {
    if (!confirm('세션을 종료하시겠습니까?')) return;

    await supabase
      .from('td_sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId);

    alert('세션이 종료되었습니다.');
  }

  async function resolveHelpRequestForParticipant(participantId: string) {
    const pendingRequest = helpRequests.find(
      (request) => request.participant_id === participantId && request.status === 'pending',
    );
    if (!pendingRequest) return;

    await markHelpRequestResolved(pendingRequest.id);
    await supabase.from('td_participants').update({ status: 'working' }).eq('id', participantId);
  }

  async function handleSeatDoubleClick(participant: Participant) {
    const pendingRequest = helpRequests.find(
      (request) => request.participant_id === participant.id && request.status === 'pending',
    );

    if (pendingRequest?.code_snapshot) {
      setCodeSnapshot(pendingRequest.code_snapshot);
    } else {
      const { data } = await supabase
        .from('td_code_works')
        .select('*')
        .eq('participant_id', participant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.code) {
        setCodeSnapshot(data.code);
      } else {
        alert('요청 당시 코드를 찾을 수 없습니다. 참가자에게 최신 코드를 저장하도록 안내해주세요.');
      }
    }

    await resolveHelpRequestForParticipant(participant.id);
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-500">
        강의 세션 정보를 불러오는 중...
      </div>
    );
  }

  const seatLayout = session.seat_layout as SeatLayout;
  const stats = {
    totalSeats: seatLayout.rows * seatLayout.cols,
    connectedCount: participants.length,
    workingCount: participants.filter((p) => p.status === 'working').length,
    helpCount: participants.filter((p) => p.status === 'help_needed').length,
  };

  // 워드클라우드 모드일 때 전용 UI
  if (session.mode === 'wordcloud') {
    return (
      <div className="flex min-h-screen flex-col bg-zinc-50">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b bg-white px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="font-semibold text-zinc-900">{participants.length}</span>명 접속
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* 접속 정보 팝업 버튼 */}
            <button
              type="button"
              onClick={() => setIsAccessInfoOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <QrCode size={18} />
              <span className="hidden sm:inline">접속 안내</span>
            </button>
            {session.session_code && (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700">
                <span className="font-mono text-base text-zinc-900">코드 {session.session_code}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(session.session_code ?? '')
                      .then(() => alert('세션 코드가 클립보드에 복사되었습니다.'));
                  }}
                  className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  복사
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={toggleMode}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Code size={16} />
              HTML 실습 모드로 전환
            </button>
            <button
              type="button"
              onClick={endSession}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              <Power size={16} />
              종료
            </button>
          </div>
        </div>

        {/* 워드클라우드 전체 화면 */}
        <div className="min-h-0 flex-1">
          <WordCloudFullPanel sessionId={sessionId} participants={participants} />
        </div>

        {/* 접속 안내 팝업 */}
        {isAccessInfoOpen && session.session_code && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setIsAccessInfoOpen(false)}
          >
            <div
              className="relative flex h-auto max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 shadow-2xl ring-8 ring-white/10 lg:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsAccessInfoOpen(false)}
                className="absolute right-6 top-6 z-10 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
              >
                <X size={32} />
              </button>
              
              {/* 왼쪽: QR 코드 + 접속 정보 (크게 강조) */}
              <div className="flex flex-1 flex-col items-center justify-center border-b border-white/10 p-10 lg:border-b-0 lg:border-r">
                <div className="mb-6 flex flex-col items-center">
                  <span className="mb-2 rounded-full bg-indigo-500/30 px-4 py-1.5 text-sm font-bold text-indigo-200 ring-1 ring-inset ring-indigo-400/50">STEP 1</span>
                  <h2 className="text-3xl font-bold text-white">QR 코드 스캔</h2>
                </div>

                {/* QR 코드 (초대형) */}
                <div className="mb-10 overflow-hidden rounded-3xl bg-white p-4 shadow-2xl shadow-indigo-900/50 ring-4 ring-white/20">
                  <img
                    src="/qr-access.png"
                    alt="접속 QR코드"
                    className="h-80 w-80 object-contain" // 크기 대폭 확대
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                
                <div className="text-center">
                  <p className="mb-3 text-xl font-medium text-white/60">또는 브라우저 주소창에 입력</p>
                  <div className="rounded-2xl bg-white/10 px-8 py-4 backdrop-blur-md ring-1 ring-white/20">
                    <p className="text-5xl font-black tracking-tight text-white drop-shadow-lg">http://엽.qaa.kr</p>
                  </div>
                </div>
              </div>
              
              {/* 오른쪽: 세션 코드 + 와이파이 정보 */}
              <div className="flex flex-1 flex-col justify-between bg-black/20 p-10">
                <div className="flex h-full flex-col justify-center space-y-12">
                  {/* 세션 코드 (가장 중요) */}
                  <div className="text-center">
                    <span className="mb-4 inline-block rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">STEP 2</span>
                    <p className="mb-4 text-2xl font-bold text-white/80">세션 코드 입력</p>
                    <div className="relative inline-block rounded-[2rem] bg-white px-16 py-8 shadow-[0_0_60px_-15px_rgba(255,255,255,0.3)]">
                      <p className="text-8xl font-black tracking-[0.2em] text-zinc-900">
                        {session.session_code}
                      </p>
                      <div className="absolute -inset-1 -z-10 animate-pulse rounded-[2.2rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 blur-xl"></div>
                    </div>
                  </div>

                  {/* 와이파이 정보 (강조 표시) */}
                  {(wifiName || wifiPassword) && (
                    <div className="overflow-hidden rounded-3xl bg-white/10 text-center backdrop-blur-md ring-1 ring-white/10">
                      <div className="bg-white/5 px-6 py-3">
                        <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-white/90">
                          <span className="text-2xl">📶</span> 강의실 와이파이
                        </h3>
                      </div>
                      <div className="flex flex-col gap-1 p-8">
                        {wifiName && (
                          <div className="mb-4">
                            <p className="mb-1 text-sm text-white/50">ID</p>
                            <p className="text-4xl font-bold text-white drop-shadow-md">{wifiName}</p>
                          </div>
                        )}
                        {wifiPassword && (
                          <div>
                            <p className="mb-1 text-sm text-white/50">PW</p>
                            <p className="font-mono text-5xl font-bold text-yellow-300 drop-shadow-md tracking-wider">{wifiPassword}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 하단: 와이파이 입력 (강사용, 작게) */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-white/30 transition hover:text-white/60">
                      <span className="group-open:rotate-90">▶</span>
                      <span>강사용: 와이파이 정보 설정</span>
                    </summary>
                    <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-black/20 p-4">
                      <div>
                        <label className="mb-1 block text-xs text-white/50">네트워크 이름 (SSID)</label>
                        <input
                          type="text"
                          value={wifiName}
                          onChange={(e) => setWifiName(e.target.value)}
                          onBlur={saveWifiInfo}
                          placeholder="와이파이 이름"
                          className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-white/50">비밀번호</label>
                        <input
                          type="text"
                          value={wifiPassword}
                          onChange={(e) => setWifiPassword(e.target.value)}
                          onBlur={saveWifiInfo}
                          placeholder="비밀번호"
                          className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      {/* 헤더 - 스마트폰/태블릿 반응형 */}
      <div className="border-b bg-white">
        <div className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <StatsBar {...stats} />
          <div className="flex items-center gap-2">
            {/* 접속 정보 팝업 버튼 */}
            <button
              type="button"
              onClick={() => setIsAccessInfoOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <QrCode size={18} />
              <span className="hidden sm:inline">접속 안내</span>
            </button>
            {session.session_code && (
              <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 md:px-4 md:py-2">
                <span className="font-mono text-base text-zinc-900 md:text-lg">코드 {session.session_code}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard
                      .writeText(session.session_code ?? '')
                      .then(() => alert('세션 코드가 클립보드에 복사되었습니다.'))
                      .catch(() => alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.'));
                  }}
                  className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  복사
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 영역 - 스마트폰에서 SeatMap만, PC에서 SeatMap+Preview */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2 md:gap-4 md:p-4">
        <div>
          <SeatMap
            layout={seatLayout}
            participants={participants}
            onSeatClick={setPreviewParticipant}
            onSeatDoubleClick={handleSeatDoubleClick}
            onSeatRemove={(participant) => {
              if (confirm(`${participant.nickname}님을 내보내고 좌석을 비울까요?`)) {
                removeParticipant(participant.id);
              }
            }}
          />
        </div>
        {/* 코드 미리보기 - PC/태블릿 가로모드에서만 표시 */}
        <div className="hidden w-full lg:block">
          <div className="aspect-[16/10]">
            <CodePreviewPanel participant={previewParticipant} />
          </div>
        </div>
      </div>

      {/* 하단 툴바 - 44px 최소 터치 영역 */}
      <div className="flex flex-wrap gap-1.5 border-t bg-white px-2 py-2 md:gap-2 md:px-6 md:py-4">
        <button
          type="button"
          onClick={broadcastAnnouncement}
          className="flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 md:h-auto md:gap-2 md:px-4 md:py-2"
        >
          <Megaphone size={16} />
          <span className="hidden sm:inline">전체 공지</span>
          <span className="sm:hidden">공지</span>
        </button>
        <button
          type="button"
          onClick={openExamplePicker}
          className="flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 md:h-auto md:gap-2 md:px-4 md:py-2"
        >
          <FileText size={16} />
          <span className="hidden sm:inline">예제 배포</span>
          <span className="sm:hidden">예제</span>
        </button>
        <button
          type="button"
          onClick={openShareModal}
          className="flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 text-sm font-semibold text-white hover:bg-purple-700 md:h-auto md:gap-2 md:px-4 md:py-2"
        >
          <Award size={16} />
          <span className="hidden sm:inline">우수작 공유</span>
          <span className="sm:hidden">우수작</span>
        </button>
        <button
          type="button"
          onClick={toggleMode}
          className="flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-3 text-sm font-semibold text-white hover:bg-cyan-700 md:h-auto md:gap-2 md:px-4 md:py-2"
        >
          <Cloud size={16} />
          <span className="hidden sm:inline">워드클라우드 모드로 전환</span>
          <span className="sm:hidden">워드</span>
        </button>
        <button
          type="button"
          onClick={endSession}
          className="ml-auto flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 md:h-auto md:gap-2 md:px-4 md:py-2"
        >
          <Power size={16} />
          <span className="hidden sm:inline">세션 종료</span>
          <span className="sm:hidden">종료</span>
        </button>
      </div>

      {selectedParticipant && (
        <ParticipantModal participant={selectedParticipant} onClose={() => setSelectedParticipant(null)} />
      )}

      {codeSnapshot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setCodeSnapshot('')}
        >
          <div
            className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold">요청 당시 코드</h3>
            <pre className="max-h-[60vh] overflow-auto rounded bg-zinc-100 p-4 text-sm text-zinc-800">
              <code>{codeSnapshot}</code>
            </pre>
            <button
              type="button"
              onClick={() => setCodeSnapshot('')}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {isExamplePickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeExamplePicker}>
          <div
            className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl lg:flex-row"
            onClick={(event) => event.stopPropagation()}
          >
            {/* 왼쪽: 예제 목록 */}
            <div className="flex flex-1 flex-col border-r border-zinc-100 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600">예제 배포</p>
                  <h3 className="text-lg font-bold text-zinc-900">배포할 예제를 선택하세요</h3>
                </div>
                <button type="button" onClick={closeExamplePicker} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 lg:hidden">
                  <X size={20} />
                </button>
              </div>

              {!isLoadingExamples && examples.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                  <select
                    value={exampleSubjectFilter}
                    onChange={(event) => setExampleSubjectFilter(event.target.value as typeof exampleSubjectFilter)}
                    className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700"
                  >
                    <option value="all">전체 과목</option>
                    <option value="국어">국어</option>
                    <option value="사회">사회</option>
                    <option value="수학">수학</option>
                    <option value="과학">과학</option>
                  </select>
                  <input
                    type="search"
                    value={exampleSearchText}
                    onChange={(event) => setExampleSearchText(event.target.value)}
                    placeholder="제목 검색"
                    className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-xs"
                  />
                  {selectedExampleIds.size > 0 && (
                    <button
                      type="button"
                      disabled={isSendingMultiple}
                      onClick={handleSendSelectedExamples}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      {isSendingMultiple ? '배포 중...' : `${selectedExampleIds.size}개 일괄 배포`}
                    </button>
                  )}
                </div>
              )}

              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                {isLoadingExamples ? (
                  <p className="py-8 text-center text-sm text-zinc-500">예제를 불러오는 중입니다...</p>
                ) : examples.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">등록된 예제가 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {filteredExamples.map((example) => {
                      const isSelected = selectedExampleIds.has(example.id);
                      const isPreviewing = previewExampleCode === example.code;
                      return (
                        <div
                          key={example.id}
                          className={`rounded-xl border p-3 transition ${
                            isPreviewing 
                              ? 'border-blue-400 bg-blue-50' 
                              : isSelected 
                                ? 'border-emerald-400 bg-emerald-50' 
                                : 'border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleExampleSelection(example.id)}
                                className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                              />
                              <h4 className="text-sm font-semibold text-zinc-900">{example.title}</h4>
                            </div>
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                              {example.difficulty}
                            </span>
                          </div>
                          {example.description && (
                            <p className="mb-2 text-xs text-zinc-500 line-clamp-2">{example.description}</p>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewExampleCode(example.code)}
                              className="flex-1 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                            >
                              미리보기
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSelectExample(example)}
                              className="flex-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              배포
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 즉흥 코드 */}
                <div className="mt-4 border-t border-zinc-100 pt-4">
                  <p className="mb-2 text-sm font-semibold text-zinc-700">즉흥 코드 직접 배포</p>
                  <input
                    type="text"
                    value={customCodeTitle}
                    onChange={(e) => setCustomCodeTitle(e.target.value)}
                    placeholder="제목 (선택)"
                    className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="HTML 코드를 붙여넣으세요..."
                    rows={3}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSendCustomCode}
                    disabled={!customCode.trim()}
                    className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    즉흥 코드 배포
                  </button>
                </div>
              </div>
            </div>

            {/* 오른쪽: 미리보기 패널 (넓은 비율) */}
            <div className="hidden w-[640px] flex-col bg-zinc-50 p-6 lg:flex">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900">미리보기</h3>
                <button type="button" onClick={closeExamplePicker} className="rounded-full p-2 text-zinc-400 hover:bg-zinc-200">
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-zinc-200 bg-white">
                {previewExampleCode ? (
                  <iframe
                    srcDoc={previewExampleCode}
                    title="예제 미리보기"
                    className="h-full w-full"
                    sandbox="allow-scripts"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                    예제를 선택하면 미리보기가 표시됩니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeShareModal}>
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-600">우수작 공유</p>
                <h3 className="text-lg font-bold text-zinc-900">공유할 참가자를 선택하세요</h3>
              </div>
              <button type="button" onClick={closeShareModal} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-widest text-zinc-400">좌석 {participant.seat_position}</p>
                    <p className="text-base font-semibold text-zinc-900">{participant.nickname}</p>
                    <p className="text-sm text-zinc-500">상태: {participant.status === 'help_needed' ? '도움 필요' : participant.status === 'working' ? '작업 중' : '대기'}</p>
                  </div>
                  <button
                    type="button"
                    disabled={sharingParticipantId === participant.id}
                    onClick={() => handleShareExcellentWork(participant)}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sharingParticipantId === participant.id ? '공유 중...' : '이 참가자 공유'}
                  </button>
                </div>
              ))}
              {!participants.length && (
                <p className="rounded-xl bg-zinc-50 p-6 text-center text-sm text-zinc-500">참가자가 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 워드클라우드 모달 */}
      {isWordCloudOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsWordCloudOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-900">워드클라우드</h2>
              <button
                type="button"
                onClick={() => setIsWordCloudOpen(false)}
                className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100"
              >
                <X size={20} />
              </button>
            </div>
            <WordCloudFullPanel sessionId={sessionId} participants={participants} />
          </div>
        </div>
      )}

      {/* 접속 안내 팝업 */}
      {isAccessInfoOpen && session.session_code && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsAccessInfoOpen(false)}
        >
          <div
            className="relative flex h-auto max-h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 shadow-2xl ring-8 ring-white/10 lg:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsAccessInfoOpen(false)}
              className="absolute right-6 top-6 z-10 rounded-full bg-black/20 p-3 text-white/70 backdrop-blur transition hover:bg-white/20 hover:text-white"
            >
              <X size={32} />
            </button>
            
            {/* 왼쪽: QR 코드 + 접속 정보 (크게 강조) */}
            <div className="flex flex-1 flex-col items-center justify-center border-b border-white/10 p-10 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex flex-col items-center">
                <span className="mb-2 rounded-full bg-indigo-500/30 px-4 py-1.5 text-sm font-bold text-indigo-200 ring-1 ring-inset ring-indigo-400/50">STEP 1</span>
                <h2 className="text-3xl font-bold text-white">QR 코드 스캔</h2>
              </div>

              {/* QR 코드 (초대형) */}
              <div className="mb-10 overflow-hidden rounded-3xl bg-white p-4 shadow-2xl shadow-indigo-900/50 ring-4 ring-white/20">
                <img
                  src="/qr-access.png"
                  alt="접속 QR코드"
                  className="h-80 w-80 object-contain" // 크기 대폭 확대
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
              
              <div className="text-center">
                <p className="mb-3 text-xl font-medium text-white/60">또는 브라우저 주소창에 입력</p>
                <div className="rounded-2xl bg-white/10 px-8 py-4 backdrop-blur-md ring-1 ring-white/20">
                  <p className="text-5xl font-black tracking-tight text-white drop-shadow-lg">http://엽.qaa.kr</p>
                </div>
              </div>
            </div>
            
            {/* 오른쪽: 세션 코드 + 와이파이 정보 */}
            <div className="flex flex-1 flex-col justify-between bg-black/20 p-10">
              <div className="flex h-full flex-col justify-center space-y-12">
                {/* 세션 코드 (가장 중요) */}
                <div className="text-center">
                  <span className="mb-4 inline-block rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">STEP 2</span>
                  <p className="mb-4 text-2xl font-bold text-white/80">세션 코드 입력</p>
                  <div className="relative inline-block rounded-[2rem] bg-white px-16 py-8 shadow-[0_0_60px_-15px_rgba(255,255,255,0.3)]">
                    <p className="text-8xl font-black tracking-[0.2em] text-zinc-900">
                      {session.session_code}
                    </p>
                    <div className="absolute -inset-1 -z-10 animate-pulse rounded-[2.2rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50 blur-xl"></div>
                  </div>
                </div>

                {/* 와이파이 정보 (강조 표시) */}
                {(wifiName || wifiPassword) && (
                  <div className="overflow-hidden rounded-3xl bg-white/10 text-center backdrop-blur-md ring-1 ring-white/10">
                    <div className="bg-white/5 px-6 py-3">
                      <h3 className="flex items-center justify-center gap-2 text-lg font-bold text-white/90">
                        <span className="text-2xl">📶</span> 강의실 와이파이
                      </h3>
                    </div>
                    <div className="flex flex-col gap-1 p-8">
                      {wifiName && (
                        <div className="mb-4">
                          <p className="mb-1 text-sm text-white/50">ID</p>
                          <p className="text-4xl font-bold text-white drop-shadow-md">{wifiName}</p>
                        </div>
                      )}
                      {wifiPassword && (
                        <div>
                          <p className="mb-1 text-sm text-white/50">PW</p>
                          <p className="font-mono text-5xl font-bold text-yellow-300 drop-shadow-md tracking-wider">{wifiPassword}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 하단: 와이파이 입력 (강사용, 작게) */}
              <div className="mt-8 border-t border-white/10 pt-6">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-white/30 transition hover:text-white/60">
                    <span className="group-open:rotate-90">▶</span>
                    <span>강사용: 와이파이 정보 설정</span>
                  </summary>
                  <div className="mt-4 grid grid-cols-2 gap-4 rounded-xl bg-black/20 p-4">
                    <div>
                      <label className="mb-1 block text-xs text-white/50">네트워크 이름 (SSID)</label>
                      <input
                        type="text"
                        value={wifiName}
                        onChange={(e) => setWifiName(e.target.value)}
                        onBlur={saveWifiInfo}
                        placeholder="와이파이 이름"
                        className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-white/50">비밀번호</label>
                      <input
                        type="text"
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        onBlur={saveWifiInfo}
                        placeholder="비밀번호"
                        className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:bg-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
                      />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

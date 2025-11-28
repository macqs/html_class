'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Megaphone, FileText, Award, Power, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ExampleCode, Participant, SeatLayout, Session } from '@/types';
import StatsBar from '@/components/dashboard/StatsBar';
import SeatMap from '@/components/dashboard/SeatMap';
import CodePreviewPanel from '@/components/dashboard/CodePreviewPanel';
import ParticipantModal from '@/components/dashboard/ParticipantModal';
import { useInstructorRealtime } from '@/hooks/useInstructorRealtime';

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

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  async function loadSession() {
    const { data } = await supabase
      .from('td_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (data) setSession(data as Session);
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

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      {/* 헤더 - 스마트폰/태블릿 반응형 */}
      <div className="border-b bg-white">
        <div className="flex flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
          <StatsBar {...stats} />
          {session.session_code && (
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 md:ml-4 md:px-4 md:py-2">
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
            className="max-h-[90vh] w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-600">예제 배포</p>
                <h3 className="text-lg font-bold text-zinc-900">배포할 예제를 선택하세요</h3>
              </div>
              <button type="button" onClick={closeExamplePicker} className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100">
                <X size={16} />
              </button>
            </div>

            {!isLoadingExamples && examples.length > 0 && (
              <div className="mb-4 flex flex-col gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 md:flex-row md:items-center md:justify-between">
                <select
                  value={exampleSubjectFilter}
                  onChange={(event) => setExampleSubjectFilter(event.target.value as typeof exampleSubjectFilter)}
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 shadow-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
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
                  placeholder="제목 또는 설명 검색"
                  className="w-full rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 shadow-sm placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 md:w-64"
                />
              </div>
            )}

            <div className="custom-scrollbar max-h-[60vh] overflow-y-auto">
              {isLoadingExamples ? (
                <p className="py-8 text-center text-sm text-zinc-500">예제를 불러오는 중입니다...</p>
              ) : examples.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">등록된 예제가 없습니다.</p>
              ) : (
                <>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">
                      필터 결과 <span className="font-semibold text-zinc-700">{filteredExamples.length}</span>건 / 전체 {examples.length}건
                      {selectedExampleIds.size > 0 && (
                        <span className="ml-2 font-semibold text-emerald-600">({selectedExampleIds.size}개 선택됨)</span>
                      )}
                    </p>
                    {selectedExampleIds.size > 0 && (
                      <button
                        type="button"
                        disabled={isSendingMultiple}
                        onClick={handleSendSelectedExamples}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {isSendingMultiple ? '배포 중...' : `선택 ${selectedExampleIds.size}개 일괄 배포`}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {filteredExamples.map((example) => {
                      const isSelected = selectedExampleIds.has(example.id);
                      return (
                        <div
                          key={example.id}
                          className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                            isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 hover:border-emerald-300 hover:bg-emerald-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleExampleSelection(example.id)}
                            className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleSelectExample(example)}
                            className="flex-1 text-left"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-zinc-900">{example.title}</h4>
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                                {example.difficulty}
                              </span>
                            </div>
                            {example.description && (
                              <p className="mt-1 text-xs text-zinc-500">{example.description}</p>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="mt-4 border-t border-zinc-100 pt-4">
                <p className="mb-2 text-sm font-semibold text-zinc-700">즉흥 코드 직접 배포</p>
                <input
                  type="text"
                  value={customCodeTitle}
                  onChange={(e) => setCustomCodeTitle(e.target.value)}
                  placeholder="제목 (선택, 기본: 즉흥 코드)"
                  className="mb-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <textarea
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="HTML 코드를 여기에 붙여넣으세요..."
                  rows={4}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-xs placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <button
                  type="button"
                  onClick={handleSendCustomCode}
                  disabled={!customCode.trim()}
                  className="mt-2 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  즉흥 코드 배포
                </button>
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
    </div>
  );
}

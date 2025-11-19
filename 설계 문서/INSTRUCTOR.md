# 강사 대시보드 구현

## 1. 화면 구조

```
┌─────────────────────────────────────────────────────────┐
│ 통계 바: 접속 97/100 | 진행중 89 | 도움요청 3          │
└─────────────────────────────────────────────────────────┘
┌──────────────────┬──────────────────────────────────────┐
│                  │                                      │
│  좌석 배치도      │     도움 요청 큐                     │
│  (실시간 색상)    │     (우선순위 정렬)                  │
│                  │                                      │
├──────────────────┴──────────────────────────────────────┤
│                  활동 로그 스트림                         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ [전체 공지] [예제 배포] [우수작 공유] [세션 종료]       │
└─────────────────────────────────────────────────────────┘
```

## 2. 컴포넌트 생성

### 2.1 통계 바 컴포넌트

`components/dashboard/StatsBar.tsx`:

```typescript
'use client';

import React from 'react';
import { Users, Activity, HelpCircle } from 'lucide-react';

interface StatsBarProps {
  totalSeats: number;
  connectedCount: number;
  workingCount: number;
  helpCount: number;
}

export default function StatsBar({
  totalSeats,
  connectedCount,
  workingCount,
  helpCount,
}: StatsBarProps) {
  return (
    <div className="bg-white border-b px-6 py-4 flex items-center gap-8">
      <div className="flex items-center gap-3">
        <Users className="text-blue-600" size={24} />
        <div>
          <div className="text-sm text-gray-600">접속 인원</div>
          <div className="text-2xl font-bold">
            {connectedCount} / {totalSeats}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Activity className="text-green-600" size={24} />
        <div>
          <div className="text-sm text-gray-600">진행 중</div>
          <div className="text-2xl font-bold text-green-600">{workingCount}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <HelpCircle className="text-orange-600" size={24} />
        <div>
          <div className="text-sm text-gray-600">도움 요청</div>
          <div className="text-2xl font-bold text-orange-600">{helpCount}</div>
        </div>
      </div>

      <div className="ml-auto">
        <div className="text-sm text-gray-600">진행률</div>
        <div className="text-lg font-semibold">
          {Math.round((workingCount / connectedCount) * 100) || 0}%
        </div>
      </div>
    </div>
  );
}
```

### 2.2 좌석 배치도 컴포넌트

`components/dashboard/SeatMap.tsx`:

```typescript
'use client';

import React from 'react';
import { Participant } from '@/types';

interface SeatMapProps {
  layout: { rows: number; cols: number; labels: string[][] };
  participants: Participant[];
  onSeatClick: (participant: Participant) => void;
}

export default function SeatMap({ layout, participants, onSeatClick }: SeatMapProps) {
  const participantsBySeat = participants.reduce((acc, p) => {
    acc[p.seat_position] = p;
    return acc;
  }, {} as Record<string, Participant>);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'working':
        return 'bg-green-500 hover:bg-green-600';
      case 'help_needed':
        return 'bg-red-500 hover:bg-red-600 animate-pulse';
      case 'idle':
        return 'bg-yellow-500 hover:bg-yellow-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-lg font-bold mb-4">좌석 배치도</h3>
      
      <div 
        className="grid gap-2 mb-4"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
      >
        {layout.labels.flat().map((seat) => {
          const participant = participantsBySeat[seat];
          
          return (
            <button
              key={seat}
              onClick={() => participant && onSeatClick(participant)}
              className={`
                relative py-6 rounded-lg font-medium transition text-white
                ${getStatusColor(participant?.status)}
                ${!participant && 'cursor-default'}
              `}
              title={participant ? `${participant.nickname} - ${seat}` : seat}
            >
              <div className="text-xs opacity-80">{seat}</div>
              {participant && (
                <div className="text-sm font-bold mt-1 truncate px-2">
                  {participant.nickname}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <span>미접속</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>대기</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>진행중</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>도움필요</span>
        </div>
      </div>
    </div>
  );
}
```

### 2.3 도움 요청 큐 컴포넌트

`components/dashboard/HelpQueue.tsx`:

```typescript
'use client';

import React from 'react';
import { HelpRequest, Participant } from '@/types';
import { Clock, User, Code } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface HelpQueueProps {
  helpRequests: (HelpRequest & { participant?: Participant })[];
  onResolve: (id: string) => void;
  onViewCode: (request: HelpRequest) => void;
}

export default function HelpQueue({ helpRequests, onResolve, onViewCode }: HelpQueueProps) {
  const pendingRequests = helpRequests.filter(r => r.status === 'pending');

  return (
    <div className="bg-white rounded-lg border p-4 h-full overflow-auto">
      <h3 className="text-lg font-bold mb-4 sticky top-0 bg-white pb-2">
        도움 요청 큐 ({pendingRequests.length})
      </h3>

      {pendingRequests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          현재 도움 요청이 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div
              key={request.id}
              className="border border-orange-300 bg-orange-50 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-orange-600" />
                  <span className="font-bold">
                    {request.participant?.nickname || '알 수 없음'}
                  </span>
                  <span className="text-sm text-gray-600">
                    ({request.participant?.seat_position})
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <Clock size={14} />
                  {timeAgo(request.created_at)}
                </div>
              </div>

              <p className="text-sm text-gray-700 mb-3">{request.message}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => onViewCode(request)}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                >
                  <Code size={14} />
                  코드 보기
                </button>
                <button
                  onClick={() => onResolve(request.id)}
                  className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition"
                >
                  해결 완료
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 2.4 활동 로그 컴포넌트

`components/dashboard/ActivityLog.tsx`:

```typescript
'use client';

import React, { useEffect, useRef } from 'react';
import { timeAgo } from '@/lib/utils';

interface ActivityLogProps {
  logs: Array<{
    id: string;
    action_type: string;
    content: string;
    created_at: string;
  }>;
}

export default function ActivityLog({ logs }: ActivityLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'join':
        return '🟢';
      case 'help_request':
        return '🆘';
      case 'code_validation':
        return '✅';
      case 'save':
        return '💾';
      default:
        return '📝';
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4 h-64 overflow-auto">
      <h3 className="text-lg font-bold mb-4 sticky top-0 bg-white pb-2">
        활동 로그
      </h3>

      <div className="space-y-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="text-sm flex items-start gap-2 p-2 hover:bg-gray-50 rounded"
          >
            <span className="text-lg">{getActionIcon(log.action_type)}</span>
            <div className="flex-1">
              <span className="text-gray-700">{log.content}</span>
              <span className="text-gray-500 ml-2">
                {timeAgo(log.created_at)}
              </span>
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}
```

### 2.5 참가자 상세 모달

`components/dashboard/ParticipantModal.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { Participant } from '@/types';
import { supabase } from '@/lib/supabase';
import { X, Code, CheckCircle, HelpCircle } from 'lucide-react';
import CodeEditor from '@/components/editor/CodeEditor';

interface ParticipantModalProps {
  participant: Participant;
  onClose: () => void;
}

export default function ParticipantModal({ participant, onClose }: ParticipantModalProps) {
  const [latestCode, setLatestCode] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadParticipantData();
  }, [participant.id]);

  async function loadParticipantData() {
    // 최신 코드
    const { data: codeData } = await supabase
      .from('code_works')
      .select('code')
      .eq('participant_id', participant.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeData) setLatestCode(codeData.code);

    // 통계
    const { data: statsData } = await supabase
      .rpc('get_participant_summary', { participant_uuid: participant.id });

    if (statsData) setStats(statsData);
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b p-6 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold">{participant.nickname}</h2>
            <p className="text-gray-600">{participant.seat_position}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-6 border-b bg-gray-50">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <Code className="mx-auto mb-2 text-blue-600" size={24} />
                <div className="text-2xl font-bold">{stats.code_works_count}</div>
                <div className="text-sm text-gray-600">작성한 작품</div>
              </div>
              <div className="text-center">
                <CheckCircle className="mx-auto mb-2 text-green-600" size={24} />
                <div className="text-2xl font-bold">{stats.validations_count}</div>
                <div className="text-sm text-gray-600">코드 검증</div>
              </div>
              <div className="text-center">
                <HelpCircle className="mx-auto mb-2 text-orange-600" size={24} />
                <div className="text-2xl font-bold">{stats.help_requests_count}</div>
                <div className="text-sm text-gray-600">도움 요청</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.total_code_lines || 0}</div>
                <div className="text-sm text-gray-600">작성한 코드 줄</div>
              </div>
            </div>
          </div>
        )}

        {/* Latest Code */}
        <div className="p-6">
          <h3 className="text-lg font-bold mb-4">최근 작성한 코드</h3>
          <div className="h-96">
            <CodeEditor
              code={latestCode || '아직 작성한 코드가 없습니다.'}
              onChange={() => {}}
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 3. 메인 강사 대시보드 페이지

`app/instructor/[sessionId]/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Session, Participant, HelpRequest } from '@/types';
import StatsBar from '@/components/dashboard/StatsBar';
import SeatMap from '@/components/dashboard/SeatMap';
import HelpQueue from '@/components/dashboard/HelpQueue';
import ActivityLog from '@/components/dashboard/ActivityLog';
import ParticipantModal from '@/components/dashboard/ParticipantModal';
import { Megaphone, FileText, Award, Power } from 'lucide-react';

export default function InstructorDashboard() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [codeToView, setCodeToView] = useState<string>('');

  useEffect(() => {
    loadSession();
    loadParticipants();
    loadHelpRequests();
    loadActivityLogs();

    // Realtime 구독 (다음 섹션에서 구현)
    setupRealtimeSubscriptions();
  }, [sessionId]);

  async function loadSession() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (data) setSession(data);
  }

  async function loadParticipants() {
    const { data } = await supabase
      .from('participants')
      .select('*')
      .eq('session_id', sessionId);
    
    if (data) setParticipants(data);
  }

  async function loadHelpRequests() {
    const { data } = await supabase
      .from('help_requests')
      .select('*, participant:participants(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    
    if (data) setHelpRequests(data as any);
  }

  async function loadActivityLogs() {
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setActivityLogs(data);
  }

  function setupRealtimeSubscriptions() {
    // 다음 섹션에서 구현
  }

  async function resolveHelpRequest(id: string) {
    await supabase
      .from('help_requests')
      .update({ 
        status: 'resolved', 
        resolved_at: new Date().toISOString(),
        resolved_by: 'instructor'
      })
      .eq('id', id);

    loadHelpRequests();
  }

  async function broadcastAnnouncement() {
    const message = prompt('전체 공지 내용을 입력하세요:');
    if (!message) return;

    // Realtime으로 전송 (다음 섹션에서 구현)
    alert('공지가 전송되었습니다!');
  }

  async function endSession() {
    if (!confirm('세션을 종료하시겠습니까?')) return;

    await supabase
      .from('sessions')
      .update({ status: 'ended' })
      .eq('id', sessionId);

    alert('세션이 종료되었습니다.');
  }

  if (!session) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  const seatLayout = session.seat_layout as any;
  const stats = {
    totalSeats: seatLayout.rows * seatLayout.cols,
    connectedCount: participants.length,
    workingCount: participants.filter(p => p.status === 'working').length,
    helpCount: helpRequests.length,
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Stats Bar */}
      <StatsBar {...stats} />

      {/* Main Content */}
      <div className="flex-1 p-4 grid grid-cols-3 gap-4 overflow-hidden">
        {/* Left: Seat Map */}
        <div className="col-span-2">
          <SeatMap
            layout={seatLayout}
            participants={participants}
            onSeatClick={setSelectedParticipant}
          />
        </div>

        {/* Right: Help Queue */}
        <div>
          <HelpQueue
            helpRequests={helpRequests}
            onResolve={resolveHelpRequest}
            onViewCode={(req) => setCodeToView(req.code_snapshot)}
          />
        </div>

        {/* Bottom: Activity Log */}
        <div className="col-span-3">
          <ActivityLog logs={activityLogs} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border-t px-6 py-4 flex gap-2">
        <button
          onClick={broadcastAnnouncement}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Megaphone size={18} />
          전체 공지
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <FileText size={18} />
          예제 배포
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Award size={18} />
          우수작 공유
        </button>

        <button
          onClick={endSession}
          className="ml-auto flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          <Power size={18} />
          세션 종료
        </button>
      </div>

      {/* Modals */}
      {selectedParticipant && (
        <ParticipantModal
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}

      {codeToView && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setCodeToView('')}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">요청 시점 코드</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto">
              <code>{codeToView}</code>
            </pre>
            <button
              onClick={() => setCodeToView('')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## ✅ 체크리스트

- [ ] StatsBar 컴포넌트 생성
- [ ] SeatMap 컴포넌트 생성
- [ ] HelpQueue 컴포넌트 생성
- [ ] ActivityLog 컴포넌트 생성
- [ ] ParticipantModal 컴포넌트 생성
- [ ] 강사 대시보드 페이지 구현
- [ ] 도움 요청 해결 기능 확인
- [ ] 참가자 상세 조회 기능 확인

## 다음 단계

👉 **[REALTIME.md](./REALTIME.md)** - 실시간 통신 구현

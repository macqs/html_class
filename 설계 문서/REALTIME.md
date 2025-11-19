# 실시간 통신 구현 (Supabase Realtime)

## 1. Realtime 개요

Supabase Realtime을 사용하여 다음 기능을 실시간으로 동기화합니다:

- 참가자 상태 변경 (idle, working, help_needed)
- 도움 요청 알림
- 전체 공지 브로드캐스트
- 활동 로그 업데이트
- 좌석 점유 상태

## 2. Realtime 클라이언트 설정

### 2.1 Realtime 유틸리티

`lib/realtime.ts`:

```typescript
import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// 채널 타입
export type ChannelType = 
  | 'session'      // 세션 전체
  | 'instructor'   // 강사 전용
  | 'broadcast'    // 공지용
  | `group-${number}`; // 그룹별 (1-10)

// 이벤트 타입
export interface RealtimeEvent {
  type: 'status_change' | 'help_request' | 'announcement' | 'code_update' | 'participant_join';
  participantId?: string;
  data: any;
  timestamp: string;
}

// 채널 생성
export function createChannel(sessionId: string, type: ChannelType): RealtimeChannel {
  const channelName = `${sessionId}:${type}`;
  return supabase.channel(channelName);
}

// 참가자 그룹 계산 (10명씩)
export function getParticipantGroup(seatPosition: string): number {
  const row = seatPosition.charCodeAt(0) - 65; // A=0, B=1, ...
  return Math.floor(row / 2) + 1; // 2줄당 1그룹
}

// 브로드캐스트 이벤트 전송
export async function broadcastEvent(
  channel: RealtimeChannel,
  event: RealtimeEvent
) {
  await channel.send({
    type: 'broadcast',
    event: event.type,
    payload: {
      ...event,
      timestamp: new Date().toISOString(),
    },
  });
}

// 데이터베이스 변경 구독
export function subscribeToTable(
  channel: RealtimeChannel,
  table: string,
  callback: (payload: any) => void
) {
  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      callback
    )
    .subscribe();
}
```

## 3. 참가자 화면에서 Realtime 사용

### 3.1 참가자 Realtime Hook

`hooks/useParticipantRealtime.ts`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createChannel, getParticipantGroup, RealtimeEvent } from '@/lib/realtime';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useParticipantRealtime(
  sessionId: string,
  participantId: string,
  seatPosition: string
) {
  const [announcement, setAnnouncement] = useState<string>('');
  const [sharedCode, setSharedCode] = useState<string>('');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId || !participantId) return;

    // 내 그룹 채널 구독
    const groupNum = getParticipantGroup(seatPosition);
    const groupChannel = createChannel(sessionId, `group-${groupNum}`);

    // 브로드캐스트 채널 구독 (공지용)
    const broadcastChannel = createChannel(sessionId, 'broadcast');

    // 공지 수신
    broadcastChannel.on(
      'broadcast',
      { event: 'announcement' },
      (payload: any) => {
        setAnnouncement(payload.payload.data.message);
        setTimeout(() => setAnnouncement(''), 5000); // 5초 후 사라짐
      }
    );

    // 예제 코드 배포 수신
    broadcastChannel.on(
      'broadcast',
      { event: 'distribute_example' },
      (payload: any) => {
        const shouldApply = window.confirm(
          `강사님이 예제 코드를 배포했습니다: "${payload.payload.data.title}"\n적용하시겠습니까?`
        );
        if (shouldApply) {
          setSharedCode(payload.payload.data.code);
        }
      }
    );

    // 우수작 공유 수신
    broadcastChannel.on(
      'broadcast',
      { event: 'share_excellent_work' },
      (payload: any) => {
        alert(`우수작이 공유되었습니다!\n작성자: ${payload.payload.data.author}`);
        // 모달로 보여주거나 다른 처리
      }
    );

    // 구독 시작
    broadcastChannel.subscribe();
    groupChannel.subscribe();

    setChannel(groupChannel);

    // Cleanup
    return () => {
      broadcastChannel.unsubscribe();
      groupChannel.unsubscribe();
    };
  }, [sessionId, participantId, seatPosition]);

  // 상태 변경 알림
  const updateStatus = async (status: 'idle' | 'working' | 'help_needed') => {
    await supabase
      .from('participants')
      .update({ status })
      .eq('id', participantId);
  };

  // 도움 요청 전송
  const requestHelp = async (message: string, code: string) => {
    await supabase.from('help_requests').insert({
      participant_id: participantId,
      message,
      code_snapshot: code,
    });

    await updateStatus('help_needed');
  };

  return {
    announcement,
    sharedCode,
    updateStatus,
    requestHelp,
  };
}
```

### 3.2 참가자 페이지에 Realtime 적용

`app/participant/[sessionId]/page.tsx`에 추가:

```typescript
import { useParticipantRealtime } from '@/hooks/useParticipantRealtime';

// 컴포넌트 내부에서
const { announcement, sharedCode, updateStatus, requestHelp } = useParticipantRealtime(
  sessionId,
  participant?.id || '',
  participant?.seat_position || ''
);

// sharedCode가 업데이트되면 코드 적용
useEffect(() => {
  if (sharedCode) {
    setCode(sharedCode);
  }
}, [sharedCode]);

// 공지 표시
{announcement && (
  <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-bounce">
    📢 {announcement}
  </div>
)}

// 코드 작성 시 상태 자동 업데이트
useEffect(() => {
  if (code && code !== initialCode) {
    updateStatus('working');
  }
}, [code]);
```

## 4. 강사 대시보드에서 Realtime 사용

### 4.1 강사 Realtime Hook

`hooks/useInstructorRealtime.ts`:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createChannel, broadcastEvent } from '@/lib/realtime';
import { Participant, HelpRequest } from '@/types';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useInstructorRealtime(sessionId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [broadcastChannel, setBroadcastChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    // 브로드캐스트 채널 생성
    const channel = createChannel(sessionId, 'broadcast');
    channel.subscribe();
    setBroadcastChannel(channel);

    // 참가자 변경 구독
    const participantChannel = supabase
      .channel(`${sessionId}:participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('Participant change:', payload);
          loadParticipants();
          
          // 활동 로그 추가
          if (payload.eventType === 'INSERT') {
            logActivity('join', `${payload.new.nickname}님이 입장했습니다.`);
          }
        }
      )
      .subscribe();

    // 도움 요청 구독
    const helpChannel = supabase
      .channel(`${sessionId}:help-requests`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'help_requests',
        },
        (payload) => {
          console.log('Help request:', payload);
          loadHelpRequests();
          
          // 알림 표시
          showNotification('새로운 도움 요청!');
          
          // 활동 로그 추가
          logActivity('help_request', `도움 요청이 등록되었습니다.`);
        }
      )
      .subscribe();

    // 초기 데이터 로드
    loadParticipants();
    loadHelpRequests();

    // Cleanup
    return () => {
      channel.unsubscribe();
      participantChannel.unsubscribe();
      helpChannel.unsubscribe();
    };
  }, [sessionId]);

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

  async function logActivity(type: string, content: string) {
    await supabase.from('activity_logs').insert({
      session_id: sessionId,
      action_type: type,
      content,
    });
  }

  function showNotification(message: string) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('연수 대시보드', { body: message });
    }
  }

  // 전체 공지 전송
  const sendAnnouncement = async (message: string) => {
    if (!broadcastChannel) return;

    await broadcastEvent(broadcastChannel, {
      type: 'announcement',
      data: { message },
      timestamp: new Date().toISOString(),
    });

    await logActivity('announcement', `공지: ${message}`);
  };

  // 예제 코드 배포
  const distributeExample = async (title: string, code: string) => {
    if (!broadcastChannel) return;

    await broadcastEvent(broadcastChannel, {
      type: 'distribute_example',
      data: { title, code },
      timestamp: new Date().toISOString(),
    });

    await logActivity('distribute_example', `예제 배포: ${title}`);
  };

  // 우수작 공유
  const shareExcellentWork = async (participantId: string, code: string) => {
    if (!broadcastChannel) return;

    const participant = participants.find(p => p.id === participantId);
    
    await broadcastEvent(broadcastChannel, {
      type: 'share_excellent_work',
      data: { 
        author: participant?.nickname || '익명',
        code 
      },
      timestamp: new Date().toISOString(),
    });

    await logActivity('share_work', `우수작 공유: ${participant?.nickname}`);
  };

  return {
    participants,
    helpRequests,
    sendAnnouncement,
    distributeExample,
    shareExcellentWork,
  };
}
```

### 4.2 강사 대시보드에 Realtime 적용

`app/instructor/[sessionId]/page.tsx`에 추가:

```typescript
import { useInstructorRealtime } from '@/hooks/useInstructorRealtime';

// 컴포넌트 내부에서
const {
  participants,
  helpRequests,
  sendAnnouncement,
  distributeExample,
  shareExcellentWork,
} = useInstructorRealtime(sessionId);

// 전체 공지 버튼 핸들러
async function broadcastAnnouncement() {
  const message = prompt('전체 공지 내용을 입력하세요:');
  if (!message) return;
  
  await sendAnnouncement(message);
  alert('공지가 전송되었습니다!');
}

// 예제 배포 버튼 핸들러
async function handleDistributeExample() {
  // 예제 목록 불러오기
  const { data: examples } = await supabase
    .from('example_codes')
    .select('*')
    .order('order_index');
  
  // 예제 선택 UI (간단하게 prompt로)
  const exampleId = prompt(`예제 ID를 입력하세요: ${examples?.map(e => `${e.id}: ${e.title}`).join(', ')}`);
  const example = examples?.find(e => e.id === exampleId);
  
  if (example) {
    await distributeExample(example.title, example.code);
    alert('예제가 배포되었습니다!');
  }
}
```

## 5. 100명 규모 최적화

### 5.1 그룹별 채널 분할

`lib/realtime.ts`에 추가:

```typescript
// 강사가 모든 그룹 채널 구독
export function subscribeAllGroups(
  sessionId: string,
  groupCount: number = 10,
  callback: (group: number, event: any) => void
) {
  const channels: RealtimeChannel[] = [];

  for (let i = 1; i <= groupCount; i++) {
    const channel = createChannel(sessionId, `group-${i}`);
    
    channel.on('broadcast', { event: '*' }, (payload) => {
      callback(i, payload);
    });

    channel.subscribe();
    channels.push(channel);
  }

  return () => {
    channels.forEach(ch => ch.unsubscribe());
  };
}
```

### 5.2 강사 대시보드에서 사용

```typescript
useEffect(() => {
  // 모든 그룹 구독
  const unsubscribe = subscribeAllGroups(sessionId, 10, (group, event) => {
    console.log(`Group ${group} event:`, event);
    // 이벤트 처리
  });

  return unsubscribe;
}, [sessionId]);
```

## 6. 브라우저 알림 권한 요청

`app/instructor/[sessionId]/page.tsx`에 추가:

```typescript
useEffect(() => {
  // 알림 권한 요청
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);
```

## 7. Realtime 연결 상태 표시

`components/shared/RealtimeStatus.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Wifi, WifiOff } from 'lucide-react';

export default function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const channel = supabase.channel('connection-test');
    
    channel
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      })
      .subscribe();

    // 연결 상태 확인
    const interval = setInterval(() => {
      setIsConnected(channel.state === 'joined');
    }, 3000);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg ${
          isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span className="text-sm font-medium">
          {isConnected ? '실시간 연결됨' : '연결 끊김'}
        </span>
      </div>
    </div>
  );
}
```

## 8. 성능 모니터링

```typescript
// lib/realtime.ts에 추가
export function monitorChannelPerformance(channel: RealtimeChannel) {
  let messageCount = 0;
  let lastReset = Date.now();

  channel.on('*', {}, () => {
    messageCount++;
    
    const now = Date.now();
    if (now - lastReset > 60000) { // 1분마다
      console.log(`Messages per minute: ${messageCount}`);
      messageCount = 0;
      lastReset = now;
    }
  });
}
```

## ✅ 체크리스트

- [ ] Realtime 유틸리티 함수 작성
- [ ] 참가자 Realtime Hook 구현
- [ ] 강사 Realtime Hook 구현
- [ ] 공지 브로드캐스트 기능 확인
- [ ] 도움 요청 실시간 알림 확인
- [ ] 예제 배포 기능 확인
- [ ] 그룹별 채널 분할 구현
- [ ] 브라우저 알림 설정
- [ ] 연결 상태 표시 구현

## 🔧 문제 해결

### Realtime 연결 안 됨
```
Error: WebSocket connection failed
```
- Supabase 대시보드에서 Realtime 활성화 확인
- 방화벽/프록시 설정 확인
- 브라우저 콘솔에서 WebSocket 로그 확인

### 메시지 수신 안 됨
- 채널 이름이 정확한지 확인
- `subscribe()` 호출 확인
- 이벤트 타입이 일치하는지 확인

### 성능 저하
- 채널 수를 줄이기
- Throttling 적용
- 불필요한 구독 제거

## 다음 단계

👉 **[GEMINI_API.md](./GEMINI_API.md)** - Gemini API 상세 가이드

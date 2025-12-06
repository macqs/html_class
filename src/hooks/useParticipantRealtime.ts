import { useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { broadcastEvent, createChannel, getParticipantGroup } from '@/lib/realtime';
import type { LiveExampleItem } from '@/types';

interface UseParticipantRealtimeOptions {
  onModeChange?: (mode: 'html' | 'wordcloud') => void;
}

export function useParticipantRealtime(
  sessionId: string,
  participantId: string,
  seatPosition: string,
  options?: UseParticipantRealtimeOptions
) {
  const [announcement, setAnnouncement] = useState('');
  const [sharedCode, setSharedCode] = useState('');
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [liveExamples, setLiveExamples] = useState<LiveExampleItem[]>([]);

  // 콜백을 ref로 저장하여 항상 최신 상태 유지
  const onModeChangeRef = useRef(options?.onModeChange);
  useEffect(() => {
    onModeChangeRef.current = options?.onModeChange;
  }, [options?.onModeChange]);

  const generateId = useMemo(
    () =>
      () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      },
    [],
  );

  useEffect(() => {
    if (!sessionId || !participantId) return;

    const group = getParticipantGroup(seatPosition);
    const groupChannel = createChannel(sessionId, `group-${group}`);
    const broadcastChannel = createChannel(sessionId, 'broadcast');

    broadcastChannel.on('broadcast', { event: 'announcement' }, (payload) => {
      setAnnouncement(payload.payload.data?.message ?? '');
      setTimeout(() => setAnnouncement(''), 5000);
    });

    // 모드 변경 이벤트 수신
    broadcastChannel.on('broadcast', { event: 'mode_change' }, (payload) => {
      const mode = payload.payload.data?.mode as 'html' | 'wordcloud';
      if (mode && onModeChangeRef.current) {
        onModeChangeRef.current(mode);
      }
    });

    broadcastChannel.on('broadcast', { event: 'distribute_example' }, (payload) => {
      const code = payload.payload.data?.code as string;
      const title = payload.payload.data?.title as string;
      if (!code) return;

      // 팝업 없이 목록에만 추가

      setLiveExamples((prev) => {
        // 이미 같은 코드가 있으면 추가하지 않음
        if (prev.some((e) => e.code === code)) return prev;

        const entry: LiveExampleItem = {
          id: generateId(),
          title: title ?? '강사 배포 예제',
          description: '방금 배포된 강사 예제입니다.',
          code,
          type: 'broadcast',
          timestamp: new Date().toISOString(),
        };
        return [entry, ...prev].slice(0, 5);
      });
    });

    broadcastChannel.on('broadcast', { event: 'share_excellent_work' }, (payload) => {
      const author = payload.payload.data?.author;
      const code = payload.payload.data?.code as string;
      alert(`우수작이 공유되었습니다! 작성자: ${author}`);
      if (!code) return;
      setLiveExamples((prev) => {
        const entry: LiveExampleItem = {
          id: generateId(),
          title: `${author ?? '익명'}님의 우수작`,
          description: '강사님이 선정한 우수작입니다.',
          code,
          type: 'excellent',
          timestamp: new Date().toISOString(),
        };
        return [entry, ...prev].slice(0, 5);
      });
    });

    broadcastChannel.subscribe();
    groupChannel.subscribe();
    setChannel(groupChannel);

    return () => {
      broadcastChannel.unsubscribe();
      groupChannel.unsubscribe();
    };
  }, [sessionId, participantId, seatPosition]);

  const updateStatus = async (status: 'idle' | 'working' | 'help_needed') => {
    if (!participantId) return;
    await supabase.from('td_participants').update({ status }).eq('id', participantId);
  };

  const requestHelp = async (message: string, code: string) => {
    if (!participantId) return;
    await supabase.from('td_help_requests').insert({
      participant_id: participantId,
      message,
      code_snapshot: code,
    });
    await updateStatus('help_needed');
  };

  const emitCodeUpdate = async (code: string) => {
    if (!channel) return;
    await broadcastEvent(channel, {
      type: 'code_update',
      participantId,
      data: { code },
    });
  };

  return {
    announcement,
    sharedCode,
    liveExamples,
    updateStatus,
    requestHelp,
    emitCodeUpdate,
  };
}

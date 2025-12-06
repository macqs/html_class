import { useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { broadcastEvent, createChannel } from '@/lib/realtime';
import type { HelpRequest, Participant } from '@/types';

interface ActivityLogEntry {
  id: string;
  session_id: string;
  action_type: string;
  content: string;
  created_at: string;
}

export function useInstructorRealtime(sessionId: string) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>([]);
  const [broadcastChannel, setBroadcastChannel] = useState<RealtimeChannel | null>(null);

  async function loadActivityLogs() {
    const { data } = await supabase
      .from('td_activity_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setActivityLogs(data as ActivityLogEntry[]);
  }

  async function loadHelpRequests(seedParticipants?: Participant[]) {
    const baseParticipants = seedParticipants ?? participants;
    if (!baseParticipants.length) {
      setHelpRequests([]);
      return;
    }

    const participantIds = baseParticipants.map((participant) => participant.id);

    const { data, error } = await supabase
      .from('td_help_requests')
      .select('*')
      .in('participant_id', participantIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('도움 요청을 불러오지 못했습니다.', error);
      return;
    }

    if (data) setHelpRequests(data as HelpRequest[]);
  }

  async function loadParticipants() {
    const { data } = await supabase
      .from('td_participants')
      .select('*')
      .eq('session_id', sessionId);

    if (data) {
      const typed = data as Participant[];
      setParticipants(typed);
      await loadHelpRequests(typed);
    }
  }

  useEffect(() => {
    if (!sessionId) return;

    // eslint-disable-next-line
    loadParticipants();
    loadHelpRequests();
    loadActivityLogs();

    const channel = createChannel(sessionId, 'broadcast');
    channel.subscribe();
    setBroadcastChannel(channel);

    const participantChannel = supabase
      .channel(`${sessionId}:participants`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'td_participants', filter: `session_id=eq.${sessionId}` },
        () => {
          loadParticipants();
        },
      )
      .subscribe();

    const helpChannel = supabase
      .channel(`${sessionId}:help_requests`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'td_help_requests', filter: `session_id=eq.${sessionId}` },
        () => {
          loadHelpRequests();
        },
      )
      .subscribe();

    const logChannel = supabase
      .channel(`${sessionId}:activity_logs`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'td_activity_logs', filter: `session_id=eq.${sessionId}` },
        () => {
          loadActivityLogs();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      participantChannel.unsubscribe();
      helpChannel.unsubscribe();
      logChannel.unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => null);
    }
  }, []);

  async function logActivity(action_type: string, content: string) {
    await supabase.from('td_activity_logs').insert({ session_id: sessionId, action_type, content });
  }

  function notify(message: string) {
    if (typeof window === 'undefined') return;
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('연수 대시보드', { body: message });
    }
  }

  const sendAnnouncement = async (message: string) => {
    if (!broadcastChannel) return;
    await broadcastEvent(broadcastChannel, {
      type: 'announcement',
      data: { message },
    });
    await logActivity('announcement', `공지: ${message}`);
  };

  const distributeExample = async (title: string, code: string) => {
    if (!broadcastChannel) return;
    await broadcastEvent(broadcastChannel, {
      type: 'distribute_example',
      data: { title, code },
    });
    await logActivity('distribute_example', `예제 배포: ${title}`);
  };

  const shareExcellentWork = async (participantId: string, code: string) => {
    if (!broadcastChannel) return;
    const participant = participants.find((p) => p.id === participantId);
    await broadcastEvent(broadcastChannel, {
      type: 'share_excellent_work',
      data: { author: participant?.nickname ?? '익명', code },
    });
    await logActivity('share_work', `우수작 공유: ${participant?.nickname ?? '익명'}`);
  };

  const removeParticipant = async (participantId: string) => {
    const participant = participants.find((p) => p.id === participantId);
    await supabase.from('td_participants').delete().eq('id', participantId);
    await supabase.from('td_code_works').delete().eq('participant_id', participantId);
    notify(`${participant?.nickname ?? '참가자'}를 내보냈습니다.`);
    loadParticipants();
  };

  const markHelpRequestResolved = async (id: string) => {
    await supabase
      .from('td_help_requests')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: 'instructor' })
      .eq('id', id);
    notify('도움 요청을 해결했습니다.');
    loadHelpRequests();
  };

  const helpRequestsWithParticipants = useMemo(
    () =>
      helpRequests.map((request) => ({
        ...request,
        participant: participants.find((participant) => participant.id === request.participant_id),
      })),
    [helpRequests, participants],
  );

  return {
    participants,
    helpRequests: helpRequestsWithParticipants,
    activityLogs,
    sendAnnouncement,
    distributeExample,
    shareExcellentWork,
    removeParticipant,
    markHelpRequestResolved,
  };
}

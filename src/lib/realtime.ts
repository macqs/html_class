import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type ChannelType = 'session' | 'instructor' | 'broadcast' | `group-${number}`;

export interface ChannelEvent {
  type:
    | 'status_change'
    | 'help_request'
    | 'announcement'
    | 'distribute_example'
    | 'share_excellent_work'
    | 'participant_join'
    | 'code_update';
  participantId?: string;
  data?: unknown;
  timestamp?: string;
}

export function createChannel(sessionId: string, type: ChannelType): RealtimeChannel {
  return supabase.channel(`${sessionId}:${type}`);
}

export function getParticipantGroup(seatPosition: string): number {
  if (!seatPosition) return 1;
  const rowIndex = seatPosition.charCodeAt(0) - 65; // A = 0
  return Math.max(1, Math.floor(rowIndex / 2) + 1);
}

export async function broadcastEvent(channel: RealtimeChannel, event: ChannelEvent) {
  await channel.send({
    type: 'broadcast',
    event: event.type,
    payload: {
      ...event,
      timestamp: new Date().toISOString(),
    },
  });
}

export function subscribeToTable(
  channel: RealtimeChannel,
  table: string,
  callback: (payload: any) => void,
) {
  channel.on('postgres_changes', { event: '*', schema: 'public', table }, callback).subscribe();
}

export function subscribeAllGroups(
  sessionId: string,
  groupCount: number,
  handler: (group: number, payload: any) => void,
) {
  const channels: RealtimeChannel[] = [];

  for (let i = 1; i <= groupCount; i += 1) {
    const channel = createChannel(sessionId, `group-${i}`);
    channel.on('broadcast', { event: '*' }, (payload) => handler(i, payload));
    channel.subscribe();
    channels.push(channel);
  }

  return () => channels.forEach((channel) => channel.unsubscribe());
}

export function monitorChannelPerformance(channel: RealtimeChannel) {
  let messageCount = 0;
  let lastReset = Date.now();

  channel.on('broadcast', { event: '*' }, () => {
    messageCount += 1;
    const now = Date.now();
    if (now - lastReset > 60_000) {
      console.log(`Realtime messages per minute: ${messageCount}`);
      messageCount = 0;
      lastReset = now;
    }
  });
}

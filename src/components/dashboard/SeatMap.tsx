'use client';

import { useRef } from 'react';
import type { Participant, SeatLayout } from '@/types';

interface SeatMapProps {
  layout: SeatLayout;
  participants: Participant[];
  onSeatClick?: (participant: Participant) => void;
  onSeatDoubleClick?: (participant: Participant) => void;
  onSeatRemove?: (participant: Participant) => void;
}

export default function SeatMap({ layout, participants, onSeatClick, onSeatDoubleClick, onSeatRemove }: SeatMapProps) {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const participantsBySeat = participants.reduce<Record<string, Participant>>((acc, current) => {
    acc[current.seat_position] = current;
    return acc;
  }, {});

  const getStatusColor = (status?: Participant['status']) => {
    switch (status) {
      case 'working':
        return 'bg-emerald-500 hover:bg-emerald-600';
      case 'help_needed':
        return 'bg-rose-500 hover:bg-rose-600 animate-pulse';
      case 'idle':
        return 'bg-amber-500 hover:bg-amber-600';
      default:
        return 'bg-zinc-300 text-zinc-600';
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">좌석 배치도</h3>
      <div className="mb-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))` }}>
        {layout.labels.flat().map((seat) => {
          const participant = participantsBySeat[seat];
          const clickable = Boolean(participant && onSeatClick);

          return (
            <button
              type="button"
              key={seat}
              onClick={(event) => {
                if (!participant) return;
                if (event.shiftKey && onSeatRemove) {
                  event.preventDefault();
                  onSeatRemove(participant);
                  return;
                }
                // Handle single vs double click
                if (clickTimeoutRef.current) {
                  clearTimeout(clickTimeoutRef.current);
                  clickTimeoutRef.current = null;
                  onSeatDoubleClick?.(participant);
                } else {
                  clickTimeoutRef.current = setTimeout(() => {
                    clickTimeoutRef.current = null;
                    onSeatClick?.(participant);
                  }, 250);
                }
              }}
              disabled={!clickable}
              className={`relative rounded-lg py-5 text-sm font-semibold text-white transition ${getStatusColor(
                participant?.status
              )} ${!clickable ? 'cursor-default opacity-80' : ''}`}
              title={participant ? `${participant.nickname} (${seat})` : seat}
            >
              <div className="text-xs opacity-80">{seat}</div>
              {participant && <div className="mt-1 truncate px-1 text-sm">{participant.nickname}</div>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
        <Legend color="bg-zinc-300" label="미접속" />
        <Legend color="bg-amber-500" label="대기" />
        <Legend color="bg-emerald-500" label="진행중" />
        <Legend color="bg-rose-500" label="도움필요" />
        {onSeatRemove && <Legend color="bg-purple-200" label="Shift+클릭: 내보내기" />}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded ${color}`} />
      <span>{label}</span>
    </div>
  );
}

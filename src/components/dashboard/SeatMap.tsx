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

  // 통로 포함 시 열 계산
  const hasAisle = layout.aisleAfterCol !== undefined && layout.aisleAfterCol >= 0 && layout.aisleAfterCol < layout.cols - 1;
  const aisleColIndex = hasAisle ? layout.aisleAfterCol! + 1 : -1;

  // 각 행에 통로 열을 삽입한 좌석 배열 생성
  const renderRow = (rowSeats: string[], rowIndex: number) => {
    const elements: React.ReactNode[] = [];
    
    rowSeats.forEach((seat, colIndex) => {
      const participant = participantsBySeat[seat];
      const clickable = Boolean(participant && onSeatClick);

      elements.push(
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
          className={`relative min-h-[44px] rounded-lg py-2 text-xs font-semibold text-white transition md:py-5 md:text-sm ${getStatusColor(
            participant?.status
          )} ${!clickable ? 'cursor-default opacity-80' : ''}`}
          title={participant ? `${participant.nickname} (${seat})` : seat}
        >
          <div className="text-[10px] opacity-80 md:text-xs">{seat}</div>
          {participant && <div className="mt-0.5 truncate px-0.5 text-[10px] md:mt-1 md:px-1 md:text-sm">{participant.nickname}</div>}
        </button>
      );

      // 통로 삽입 (해당 열 뒤에)
      if (hasAisle && colIndex === layout.aisleAfterCol) {
        elements.push(
          <div key={`aisle-${rowIndex}`} className="min-h-[44px] md:min-h-[60px]" />
        );
      }
    });

    return elements;
  };

  return (
    <div className="rounded-lg border bg-white p-2 md:p-4">
      <h3 className="mb-2 text-base font-semibold text-zinc-900 md:mb-4 md:text-lg">좌석 배치도</h3>
      <div 
        className="mb-2 grid gap-1 md:mb-4 md:gap-2" 
        style={{ 
          gridTemplateColumns: hasAisle 
            ? `repeat(${aisleColIndex}, minmax(0, 1fr)) 16px repeat(${layout.cols - aisleColIndex}, minmax(0, 1fr))`
            : `repeat(${layout.cols}, minmax(0, 1fr))` 
        }}
      >
        {layout.labels.map((rowSeats, rowIndex) => renderRow(rowSeats, rowIndex))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-zinc-600 md:gap-4 md:text-sm">
        <Legend color="bg-zinc-300" label="미접속" />
        <Legend color="bg-amber-500" label="대기" />
        <Legend color="bg-emerald-500" label="진행중" />
        <Legend color="bg-rose-500" label="도움필요" />
        {onSeatRemove && <span className="hidden md:block"><Legend color="bg-purple-200" label="Shift+클릭: 내보내기" /></span>}
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

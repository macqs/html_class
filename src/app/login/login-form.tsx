'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SeatLayout, Session } from '@/types';
import { normalizeSeatLayout } from '@/lib/seatLayout';

interface LoginFormProps {
  session: Session;
  occupiedSeats: string[];
}

export function LoginForm({ session, occupiedSeats: initialOccupiedSeats }: LoginFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState('');
  const [selectedSeat, setSelectedSeat] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 이미 점유된 좌석 정보는 props로 받음
  const occupiedSeats = initialOccupiedSeats;

  async function handleLogin() {
    if (!nickname || !selectedSeat) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from('td_participants')
      .insert({
        session_id: session.id,
        nickname,
        seat_position: selectedSeat,
        status: 'idle',
      })
      .select()
      .single();

    setIsLoading(false);

    if (error) {
      if (error.code === '23505') {
        alert('이미 사용 중인 좌석입니다.');
        return;
      }
      alert('로그인 중 오류가 발생했습니다.');
      return;
    }

    if (!data) return;

    localStorage.setItem('participantId', data.id);
    router.push(`/participant/${session.id}`);
  }

  // 세션에 설정된 원본 레이아웃을 그대로 사용 (minCapacity=0)
  const seatLayout = normalizeSeatLayout(session.seat_layout as SeatLayout | null, 0);

  // 통로 포함 시 열 계산
  const hasAisle = seatLayout.aisleAfterCol !== undefined && seatLayout.aisleAfterCol >= 0 && seatLayout.aisleAfterCol < seatLayout.cols - 1;
  const aisleColIndex = hasAisle ? seatLayout.aisleAfterCol! + 1 : -1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">{session.title}</h1>
          <p className="mt-2 text-zinc-600">닉네임과 좌석을 선택해 연수에 참여하세요.</p>
        </div>

        <div className="mb-8">
          <label className="mb-2 block text-sm font-medium text-zinc-700">닉네임</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="홍길동"
              className="w-full rounded-lg border border-zinc-200 py-3 pl-10 pr-4 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="mb-8">
          <label className="mb-4 block text-sm font-medium text-zinc-700">좌석 선택</label>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div 
              className="grid gap-2" 
              style={{ 
                gridTemplateColumns: hasAisle 
                  ? `repeat(${aisleColIndex}, minmax(0, 1fr)) 16px repeat(${seatLayout.cols - aisleColIndex}, minmax(0, 1fr))`
                  : `repeat(${seatLayout.cols}, minmax(0, 1fr))` 
              }}
            >
              {seatLayout.labels.map((row, rowIndex) => (
                row.map((seat, colIndex) => {
                  const isOccupied = occupiedSeats.includes(seat);
                  const isSelected = seat === selectedSeat;

                  const seatButton = (
                    <button
                      type="button"
                      key={seat}
                      disabled={isOccupied}
                      onClick={() => !isOccupied && setSelectedSeat(seat)}
                      className={`rounded-lg border px-2 py-3 text-sm font-medium transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-600 text-white'
                          : isOccupied
                            ? 'border-zinc-200 bg-zinc-200 text-zinc-500'
                            : 'border-zinc-200 bg-white hover:border-blue-400'
                      }`}
                    >
                      {seat}
                    </button>
                  );

                  if (hasAisle && colIndex === seatLayout.aisleAfterCol) {
                    return [seatButton, <div key={`aisle-${rowIndex}`} />];
                  }

                  return seatButton;
                })
              ))}
            </div>
            <div className="mt-4 flex gap-6 text-sm text-zinc-600">
              <Legend color="bg-white border border-zinc-300" label="사용 가능" />
              <Legend color="bg-zinc-300" label="사용 중" />
              <Legend color="bg-blue-600" label="선택됨" text="text-white" />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={!nickname || !selectedSeat || isLoading}
          className="w-full rounded-lg bg-blue-600 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? '입장 중...' : '입장하기'}
        </button>
      </div>
    </div>
  );
}

function Legend({ color, label, text }: { color: string; label: string; text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-4 w-4 rounded ${color}`} />
      <span className={`text-sm ${text ?? 'text-zinc-600'}`}>{label}</span>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Rows, Columns, Divide } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { generateSeatLabels } from '@/lib/utils';

const MAX_SEATS = 100;

export default function NewSessionPage() {
  const router = useRouter();

  const [title, setTitle] = useState('실습 세션');
  const [instructorId, setInstructorId] = useState('instructor-001');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(8);
  const [hasAisle, setHasAisle] = useState(false);
  const [aislePosition, setAislePosition] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const seatCount = useMemo(() => rows * cols, [rows, cols]);
  const seatOverLimit = seatCount > MAX_SEATS;

  const canSubmit = title && instructorId && date && seatCount > 0 && !seatOverLimit && !isSubmitting;

  async function generateSessionCode(): Promise<string> {
    const candidate = String(Math.floor(100000 + Math.random() * 900000));
    const { data } = await supabase.from('td_sessions').select('id').eq('session_code', candidate).maybeSingle();
    if (data) return generateSessionCode();
    return candidate;
  }

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError('');

    try {
      const seatLayout: { rows: number; cols: number; labels: string[][]; aisleAfterCol?: number } = {
        rows,
        cols,
        labels: generateSeatLabels(rows, cols),
      };

      if (hasAisle && aislePosition !== null) {
        seatLayout.aisleAfterCol = aislePosition;
      }

      const sessionCode = await generateSessionCode();

      const { data, error: insertError } = await supabase
        .from('td_sessions')
        .insert({
          title,
          instructor_id: instructorId,
          date: new Date(date).toISOString(),
          seat_layout: seatLayout,
          status: 'active',
          session_code: sessionCode,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data) {
        throw new Error('세션 생성 결과가 비어 있습니다.');
      }

      router.push(`/instructor/${data.id}`);
    } catch (insertError) {
      setError(insertError instanceof Error ? insertError.message : '세션 생성에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 px-4 py-10">
      <div className="mx-auto w-full max-w-4xl rounded-3xl bg-white p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">새 세션 만들기</h1>
            <p className="mt-2 text-sm text-zinc-500">좌석 배치(가로/세로)를 직접 지정해 최대 100명까지 준비하세요.</p>
          </div>
          <Link href="/" className="text-sm font-semibold text-blue-600 hover:underline">
            홈으로 돌아가기
          </Link>
        </div>

        <form onSubmit={handleCreateSession} className="mt-8 space-y-8">
          <section className="space-y-4">
            <label className="block text-sm font-semibold text-zinc-700" htmlFor="title">
              세션 제목
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: HTML/CSS 기초 실습 2기"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              required
            />
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700" htmlFor="instructorId">
                강사 ID
              </label>
              <input
                id="instructorId"
                type="text"
                value={instructorId}
                onChange={(event) => setInstructorId(event.target.value)}
                placeholder="instructor-001"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-zinc-700" htmlFor="date">
                일정
              </label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  id="date"
                  type="datetime-local"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 pl-11 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-100 bg-zinc-50 p-6">
            <h2 className="text-lg font-semibold text-zinc-900">좌석 배치</h2>
            <p className="mt-1 text-sm text-zinc-500">가로/세로 줄 수를 입력하면 자동으로 좌석 라벨을 생성합니다.</p>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700" htmlFor="rows">
                  <Rows size={16} /> 세로 줄 수
                </label>
                <input
                  id="rows"
                  type="number"
                  min={1}
                  max={15}
                  value={rows}
                  onChange={(event) => setRows(Number(event.target.value))}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-700" htmlFor="cols">
                  <Columns size={16} /> 가로 칸 수
                </label>
                <input
                  id="cols"
                  type="number"
                  min={1}
                  max={15}
                  value={cols}
                  onChange={(event) => setCols(Number(event.target.value))}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  required
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={hasAisle}
                  onChange={(event) => {
                    setHasAisle(event.target.checked);
                    if (event.target.checked && aislePosition === null) {
                      setAislePosition(Math.floor((cols - 1) / 2));
                    }
                  }}
                  className="h-5 w-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                <Divide size={18} className="text-blue-600" />
                <span className="text-sm font-semibold text-zinc-700">중앙 통로 추가</span>
              </label>

              {hasAisle && (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-600" htmlFor="aislePosition">
                    통로 위치 (열 번호 뒤에 통로 배치)
                  </label>
                  <select
                    id="aislePosition"
                    value={aislePosition ?? Math.floor((cols - 1) / 2)}
                    onChange={(event) => setAislePosition(Number(event.target.value))}
                    className="w-full rounded-xl border border-zinc-200 px-4 py-2 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    {Array.from({ length: cols - 1 }, (_, i) => (
                      <option key={i} value={i}>
                        {i + 1}열 뒤 (좌측 {i + 1}칸 / 우측 {cols - i - 1}칸)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-white/70 px-4 py-3 text-sm font-semibold text-zinc-800">
              <Users size={18} className="text-blue-600" />
              <span>
                예상 좌석 수: <strong>{seatCount}</strong> / {MAX_SEATS}
              </span>
              {seatOverLimit && <span className="text-rose-600">좌석 수를 100 이하로 조정해주세요.</span>}
            </div>
          </section>

          {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-2xl bg-blue-600 py-3 text-lg font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '세션 생성 중...' : '세션 생성하기'}
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CalendarDays, Users, LayoutGrid, RefreshCw, Link2, Copy } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import type { SeatLayout, Session } from '@/types';
import { countSeats, normalizeSeatLayout } from '@/lib/seatLayout';

interface SessionWithLayout extends Session {
  seat_layout: SeatLayout;
}

export default function SessionManagerPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionWithLayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setIsLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('td_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('세션 목록을 불러오지 못했습니다. 다시 시도해주세요.');
      setIsLoading(false);
      return;
    }

    setSessions((data as SessionWithLayout[]) ?? []);
    setIsLoading(false);
  }

  function copyParticipantLink(session: SessionWithLayout) {
    const baseUrl = window.location.origin;
    const url = session.session_code ? `${baseUrl}/login?code=${session.session_code}` : `${baseUrl}/login?session=${session.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => alert('참가자 공유 링크가 클립보드에 복사되었습니다.'))
      .catch(() => alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.'));
  }

  function copySessionCode(code?: string) {
    if (!code) return;
    navigator.clipboard
      .writeText(code)
      .then(() => alert('세션 코드가 클립보드에 복사되었습니다.'))
      .catch(() => alert('복사에 실패했습니다. 브라우저 설정을 확인해주세요.'));
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('이 세션을 삭제하면 관련 데이터도 함께 삭제될 수 있습니다. 계속할까요?')) {
      return;
    }

    setDeletingId(sessionId);
    setError('');

    const { error } = await supabase.from('td_sessions').delete().eq('id', sessionId);

    if (error) {
      setError('세션 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
      setDeletingId(null);
      return;
    }

    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50 px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="rounded-3xl bg-white px-8 py-6 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">세션 관리</p>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <h1 className="text-3xl font-bold text-slate-900">생성된 세션 목록</h1>
            <button
              type="button"
              onClick={loadSessions}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> 새로고침
            </button>
            <Link
              href="/instructor/new-session"
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              새 세션 만들기
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            좌석 배치와 세션 상태를 한눈에 확인하고, 대시보드로 바로 이동하거나 참가자 공유 링크를 복사할 수 있습니다.
          </p>
        </header>

        {error && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</p>}

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-slate-500">
            세션 정보를 불러오는 중입니다...
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 text-center">
            <p className="text-lg font-semibold text-slate-700">아직 생성된 세션이 없습니다.</p>
            <p className="mt-2 text-sm text-slate-500">오른쪽 상단 버튼을 눌러 첫 세션을 만들어보세요.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sessions.map((session) => {
              const layout = normalizeSeatLayout(session.seat_layout as SeatLayout | null, 1);
              const seatCount = countSeats(layout);

              return (
                <article key={session.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <header className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">세션</p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-900">{session.title}</h2>
                      <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays size={14} />
                        {new Date(session.date).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'short' })}
                      </p>
                      {session.session_code && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-slate-900">코드 {session.session_code}</span>
                          <button
                            type="button"
                            onClick={() => copySessionCode(session.session_code)}
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                          >
                            <Copy size={12} /> 복사
                          </button>
                        </div>
                      )}
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${session.status === 'ended' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-700'}`}
                    >
                      {session.status === 'ended' ? '종료' : '진행중'}
                    </span>
                  </header>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <LayoutGrid size={16} className="text-blue-600" />
                      <div>
                        <dt className="text-xs text-slate-400">좌석 배치</dt>
                        <dd className="font-semibold text-slate-900">
                          {layout.rows} x {layout.cols}
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <Users size={16} className="text-emerald-600" />
                      <div>
                        <dt className="text-xs text-slate-400">좌석 수</dt>
                        <dd className="font-semibold text-slate-900">{seatCount}석</dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => router.push(`/instructor/${session.id}`)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700"
                    >
                      대시보드 열기
                    </button>
                    <button
                      type="button"
                      onClick={() => copyParticipantLink(session)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
                    >
                      <Link2 size={16} /> 참가자 링크
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSession(session.id)}
                      disabled={deletingId === session.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === session.id ? '삭제 중...' : '세션 삭제'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

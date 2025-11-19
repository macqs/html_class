import Link from 'next/link';

const quickActions = [
  {
    title: '참가자 입장',
    description: '세션 ID를 쿼리로 지정하여 닉네임/좌석 선택 후 입장합니다.',
    href: '/login?session=YOUR_SESSION_ID',
  },
  {
    title: '강사 대시보드',
    description: '실시간 좌석 상태와 도움 요청을 모니터링합니다.',
    href: '/instructor/YOUR_SESSION_ID',
  },
  {
    title: '세션 관리',
    description: '생성된 세션 목록을 보고 링크를 복사합니다.',
    href: '/instructor/sessions',
  },
  {
    title: '세션 만들기',
    description: '좌석 배치(가로/세로)를 지정해 새 세션을 생성합니다.',
    href: '/instructor/new-session',
  },
  {
    title: '설계 문서',
    description: '요구사항과 DB/Realtime/Gemini 사양을 확인하세요.',
    href: '/설계 문서/README.md',
    external: true,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50">
      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-16">
        <section className="rounded-3xl bg-white px-10 py-12 shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">LLM HTML 연수</p>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">실시간 연수 관리 대시보드</h1>
          <p className="mt-6 text-lg text-slate-600">
            특수학교 교사 대상 HTML 코딩 연수를 위한 실시간 참가자/강사 경험을 제공합니다. 아래 빠른 액션을 선택해 바로
            기능을 확인하세요.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/login?session=YOUR_SESSION_ID"
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
            >
              참가자 입장하기
            </Link>
            <Link
              href="/instructor/YOUR_SESSION_ID"
              className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-5 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50"
            >
              강사 대시보드 보기
            </Link>
            <Link
              href="/instructor/sessions"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              세션 관리
            </Link>
            <Link
              href="/instructor/new-session"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              새 세션 만들기
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-slate-900">빠른 액션</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {quickActions.map((action) => {
              const content = (
                <div className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300">
                  <h3 className="text-lg font-bold text-slate-900">{action.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{action.description}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-blue-600">{action.external ? '문서 열기' : '바로 가기'} →</span>
                </div>
              );

              if (action.external) {
                return (
                  <a key={action.title} href={action.href} target="_blank" rel="noreferrer" className="block">
                    {content}
                  </a>
                );
              }

              return (
                <Link key={action.title} href={action.href} className="block">
                  {content}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-600">
          <h3 className="text-base font-semibold text-slate-900">사용 방법</h3>
          <ol className="mt-4 list-decimal space-y-2 pl-5">
            <li>Supabase에서 발급받은 세션 ID를 복사해 URL의 <code>YOUR_SESSION_ID</code> 자리에 넣습니다.</li>
            <li>참가자는 링크 공유 후 각자 닉네임과 좌석을 선택해 입장합니다.</li>
            <li>강사는 대시보드에서 좌석 현황, 도움 요청, 공지/예제 배포 등을 실시간으로 관리합니다.</li>
          </ol>
        </section>
      </main>
    </div>
  );
}

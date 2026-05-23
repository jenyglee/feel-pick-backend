import { api } from '@/lib/api';

// 빌드 시 정적 프리렌더 대신 요청마다 렌더 → 항상 최신 백엔드 데이터 반영.
export const dynamic = 'force-dynamic';

// 서버 컴포넌트: 요청 시점에 백엔드 /picks를 호출한다.
// (Next 16에서 fetch는 기본적으로 캐시되지 않아 매번 최신 데이터를 가져온다)
export default async function Home() {
  const { data, error } = await api.GET('/picks');

  return (
    <main className="mx-auto max-w-2xl p-8 font-sans">
      <h1 className="mb-1 text-2xl font-bold">Feel Pick</h1>
      <p className="mb-6 text-sm text-zinc-500">
        백엔드(:3000)의 픽 목록 — 공유 타입으로 호출
      </p>

      {error || !data ? (
        <p className="rounded border border-red-200 bg-red-50 p-4 text-red-700">
          백엔드에 연결하지 못했어요. <code>npm run dev</code> 로 백엔드가 떠
          있는지 확인하세요.
        </p>
      ) : data.length === 0 ? (
        <p className="text-zinc-500">아직 픽이 없어요.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((pick) => (
            <li key={pick.id} className="rounded-lg border border-zinc-200 p-4">
              <div className="font-semibold">{pick.title}</div>
              {pick.description && (
                <div className="text-sm text-zinc-500">{pick.description}</div>
              )}
              <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                {pick.options.map((option) => (
                  <li key={option.id}>
                    {option.label} — {option.votes}표
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

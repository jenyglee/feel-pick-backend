'use client';

import type { Schemas } from '@feel-pick/api-types';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BottomNav } from './BottomNav';
import { BellIcon, ChevronsRightIcon, RefreshIcon } from './icons';
import { ProfileCard } from './ProfileCard';
import { ProfileDetail } from './ProfileDetail';

type Feed = Schemas['ChoiceFeed'];

// 한 라운드(질문)당 다시 섞기 가능 횟수.
const RESHUFFLE_LIMIT = 3;

export function ChoiceScreen() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reshuffleLeft, setReshuffleLeft] = useState(RESHUFFLE_LIMIT);

  // setState는 모두 await 이후에 (마운트 effect에서 동기 setState 경고 방지).
  // 로딩 표시가 필요한 호출부(버튼)는 직접 setLoading(true) 후 호출한다.
  const loadFeed = useCallback(async (questionId?: string) => {
    const { data, error } = questionId
      ? await api.GET('/choices', { params: { query: { questionId } } })
      : await api.GET('/choices');
    setExpandedId(null);
    if (error || !data) {
      setFailed(true);
    } else {
      setFeed(data);
      setFailed(false);
    }
    setLoading(false);
  }, []);

  // 마운트 시 첫 피드 로드. setState는 await 이후(비동기)라 effect 동기 setState 규칙을 지킨다.
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await api.GET('/choices');
      if (!active) return;
      if (error || !data) {
        setFailed(true);
      } else {
        setFeed(data);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // 카드를 오른쪽으로 날림 → 선택 기록 후 새 질문 + 새 카드.
  const handleSelect = useCallback(
    async (selectedUserId: string) => {
      if (!feed) return;
      setLoading(true);
      setExpandedId(null);
      const { data } = await api.POST('/choices/select', {
        body: { questionId: feed.question.id, selectedUserId },
      });
      if (data) {
        setFeed(data);
        setReshuffleLeft(RESHUFFLE_LIMIT);
        setLoading(false);
      } else {
        void loadFeed();
      }
    },
    [feed, loadFeed],
  );

  // 다시 섞기 → 같은 질문 + 새 카드 4명.
  const handleReshuffle = useCallback(() => {
    if (!feed || reshuffleLeft <= 0) return;
    setLoading(true);
    setReshuffleLeft((n) => n - 1);
    void loadFeed(feed.question.id);
  }, [feed, reshuffleLeft, loadFeed]);

  // 스킵 → 새 질문 + 새 카드 4명.
  const handleSkip = useCallback(() => {
    setLoading(true);
    setReshuffleLeft(RESHUFFLE_LIMIT);
    void loadFeed();
  }, [loadFeed]);

  const expanded =
    feed?.candidates.find((c) => c.id === expandedId) ?? null;

  return (
    <div
      className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col text-white"
      style={{
        backgroundImage:
          'linear-gradient(160deg, var(--color-primary), var(--color-primary-strong))',
      }}
    >
      {/* 헤더: 알림 + 질문 + 진행 표시 */}
      <header className="px-5 pt-6">
        <div className="flex justify-end">
          <BellIcon className="size-6 text-white/90" />
        </div>
        <h1 className="text-title1 mt-1 text-center text-white">
          {feed?.question.text ?? ' '}
        </h1>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <span className="block h-1.5 w-9 overflow-hidden rounded-full bg-white/40">
            <span className="block h-full w-1/2 rounded-full bg-white" />
          </span>
          <span className="grid size-4 place-items-center rounded-full bg-yellow-400 text-[9px] font-bold text-black">
            P
          </span>
        </div>
      </header>

      {/* 본문: 카드 그리드 또는 상세 */}
      <main className="flex-1 px-5 py-4">
        {failed ? (
          <div className="rounded-xl bg-black/30 p-5 text-center text-sm text-white/90">
            백엔드에 연결하지 못했어요.
            <br />
            <code>npm run dev</code> 로 백엔드(:3000)가 떠 있는지, 시드를
            실행했는지 확인하세요.
            <button
              type="button"
              onClick={() => void loadFeed()}
              className="mt-3 block w-full rounded-lg bg-white/15 py-2"
            >
              다시 시도
            </button>
          </div>
        ) : expanded ? (
          <ProfileDetail
            profile={expanded}
            onClose={() => setExpandedId(null)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {(feed?.candidates ?? []).map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                disabled={loading}
                onSelect={() => void handleSelect(profile.id)}
                onExpand={() => setExpandedId(profile.id)}
              />
            ))}
          </div>
        )}
      </main>

      {/* 액션: 다시 섞기 / 스킵 */}
      <div className="flex items-center justify-between px-6 py-3 text-sm text-white/90">
        <button
          type="button"
          onClick={handleReshuffle}
          disabled={reshuffleLeft <= 0 || loading}
          className="flex items-center gap-1.5 disabled:opacity-40"
        >
          <RefreshIcon className="size-4" />
          다시 섞기({reshuffleLeft})
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={loading}
          className="flex items-center gap-1.5 disabled:opacity-40"
        >
          스킵
          <ChevronsRightIcon className="size-4" />
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

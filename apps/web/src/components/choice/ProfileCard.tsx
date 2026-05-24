'use client';

import type { Schemas } from '@feel-pick/api-types';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { InfoIcon } from './icons';

type Profile = Schemas['Profile'];

// 오른쪽으로 이만큼 이상 끌면 "선택"으로 간주.
const SELECT_THRESHOLD = 120;

export function ProfileCard({
  profile,
  disabled,
  onSelect,
  onExpand,
}: {
  profile: Profile;
  disabled?: boolean;
  onSelect: () => void;
  onExpand: () => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-10, 0, 10]);
  const opacity = useTransform(x, [0, 180, 280], [1, 1, 0]);

  return (
    <motion.div
      className="bg-surface relative aspect-[3/4] cursor-grab touch-pan-y overflow-hidden rounded-2xl select-none active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0.1, right: 0.9 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > SELECT_THRESHOLD) {
          // 오른쪽으로 날려보내고 선택 완료.
          void animate(x, 500, { duration: 0.35, ease: 'easeOut' });
          onSelect();
        } else {
          void animate(x, 0, { type: 'spring', stiffness: 300, damping: 30 });
        }
      }}
    >
      {profile.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photoUrl}
          alt={profile.displayName}
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
      <span className="text-title3 absolute bottom-3 left-3 text-white drop-shadow">
        {profile.displayName}
      </span>
      <button
        type="button"
        aria-label="상세 정보"
        onClick={(e) => {
          e.stopPropagation();
          onExpand();
        }}
        className="absolute right-3 bottom-3 grid size-7 place-items-center rounded-full bg-white/90 text-black"
      >
        <InfoIcon className="size-4" />
      </button>
    </motion.div>
  );
}

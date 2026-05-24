'use client';

import type { Schemas } from '@feel-pick/api-types';
import { motion } from 'motion/react';
import { MapPinIcon } from './icons';

type Profile = Schemas['Profile'];

// 카드를 탭했을 때 확대되어 상세 정보를 보여주는 뷰.
export function ProfileDetail({
  profile,
  onClose,
}: {
  profile: Profile;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="bg-surface relative aspect-[3/4] w-full overflow-hidden rounded-2xl"
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onClose}
    >
      {profile.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.photoUrl}
          alt={profile.displayName}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      <span className="absolute top-3 left-3 rounded-full bg-green-500/90 px-2 py-0.5 text-xs font-medium text-black">
        소통중
      </span>
      <span className="absolute top-3 right-3 rounded-full bg-black/40 px-2 py-1 text-xs text-white/80">
        닫기
      </span>

      <div className="absolute inset-x-0 bottom-0 space-y-2 p-4 text-white">
        <div className="flex items-center gap-2">
          <span className="text-title3">{profile.displayName}</span>
          {profile.distanceKm != null && (
            <span className="text-body1 flex items-center gap-0.5 text-white/80">
              <MapPinIcon className="size-4" />
              {profile.distanceKm}km
            </span>
          )}
        </div>

        {profile.bio && (
          <p className="text-body1 text-white/90">{profile.bio}</p>
        )}

        {profile.interests.length > 0 && (
          <div>
            <p className="mb-1.5 text-sm text-white/70">관심사</p>
            <ul className="flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => (
                <li
                  key={interest}
                  className="rounded-full bg-white/15 px-2.5 py-1 text-sm"
                >
                  {interest}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

import { BoltIcon, ChatIcon, HeartIcon, HomeIcon } from './icons';

// 하단 탭바. 현재는 "초이스"만 구현되어 활성, 나머지는 자리표시.
const tabs = [
  { label: '초이스', Icon: HeartIcon, active: true },
  { label: '친구', Icon: BoltIcon, active: false },
  { label: '소통', Icon: ChatIcon, active: false },
  { label: '내 정보', Icon: HomeIcon, active: false },
] as const;

export function BottomNav() {
  return (
    <nav className="flex items-center justify-around border-t border-white/10 bg-black/20 px-2 py-2 backdrop-blur">
      {tabs.map(({ label, Icon, active }) => (
        <span
          key={label}
          className={`flex flex-col items-center gap-0.5 text-[11px] ${
            active ? 'text-red-500' : 'text-white/70'
          }`}
        >
          <Icon className="size-5" />
          {label}
        </span>
      ))}
    </nav>
  );
}

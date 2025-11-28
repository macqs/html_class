'use client';

import { Activity, HelpCircle, Users } from 'lucide-react';

interface StatsBarProps {
  totalSeats: number;
  connectedCount: number;
  workingCount: number;
  helpCount: number;
}

export default function StatsBar({ totalSeats, connectedCount, workingCount, helpCount }: StatsBarProps) {
  const progress = connectedCount ? Math.round((workingCount / connectedCount) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center gap-3 md:gap-8">
      <StatBlock
        icon={<Users className="text-blue-600" size={20} />}
        label="접속"
        value={`${connectedCount}/${totalSeats}`}
      />
      <StatBlock
        icon={<Activity className="text-emerald-600" size={20} />}
        label="진행"
        value={workingCount.toString()}
        valueClassName="text-emerald-600"
      />
      <StatBlock
        icon={<HelpCircle className="text-orange-600" size={20} />}
        label="도움"
        value={helpCount.toString()}
        valueClassName="text-orange-600"
        highlight={helpCount > 0}
      />
      <div className="ml-auto text-right">
        <div className="hidden text-sm text-zinc-500 md:block">진행률</div>
        <div className="text-base font-semibold md:text-lg">{progress}%</div>
      </div>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  valueClassName,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1 md:gap-3 md:px-0 md:py-0 ${highlight ? 'animate-pulse bg-orange-100' : ''}`}>
      <span className="hidden md:block">{icon}</span>
      <div>
        <div className="hidden text-xs text-zinc-500 md:block md:text-sm">{label}</div>
        <div className={`text-lg font-bold md:text-2xl ${valueClassName ?? ''}`}>
          <span className="md:hidden">{label} </span>
          {value}
        </div>
      </div>
    </div>
  );
}

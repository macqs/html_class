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
    <div className="flex items-center gap-8 border-b bg-white px-6 py-4">
      <StatBlock
        icon={<Users className="text-blue-600" size={24} />}
        label="접속 인원"
        value={`${connectedCount} / ${totalSeats}`}
      />
      <StatBlock
        icon={<Activity className="text-emerald-600" size={24} />}
        label="진행 중"
        value={workingCount.toString()}
        valueClassName="text-emerald-600"
      />
      <StatBlock
        icon={<HelpCircle className="text-orange-600" size={24} />}
        label="도움 요청"
        value={helpCount.toString()}
        valueClassName="text-orange-600"
      />
      <div className="ml-auto text-right">
        <div className="text-sm text-zinc-500">진행률</div>
        <div className="text-lg font-semibold">{progress}%</div>
      </div>
    </div>
  );
}

function StatBlock({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div>
        <div className="text-sm text-zinc-500">{label}</div>
        <div className={`text-2xl font-bold ${valueClassName ?? ''}`}>{value}</div>
      </div>
    </div>
  );
}

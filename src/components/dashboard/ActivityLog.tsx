'use client';

import { useEffect, useRef } from 'react';
import { timeAgo } from '@/lib/utils';

interface ActivityLogEntry {
  id: string;
  action_type: string;
  content: string;
  created_at: string;
}

interface ActivityLogProps {
  logs: ActivityLogEntry[];
}

export default function ActivityLog({ logs }: ActivityLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'join':
        return '🟢';
      case 'help_request':
        return '🆘';
      case 'code_validation':
        return '✅';
      case 'save':
        return '💾';
      default:
        return '📝';
    }
  };

  return (
    <div className="h-64 rounded-lg border bg-white p-4">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900">활동 로그</h3>
      <div className="h-full space-y-2 overflow-auto">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-zinc-50">
            <span className="text-lg">{getIcon(log.action_type)}</span>
            <div className="flex-1 text-sm">
              <span className="text-zinc-800">{log.content}</span>
              <span className="ml-2 text-xs text-zinc-500">{timeAgo(log.created_at)}</span>
            </div>
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

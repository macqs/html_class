'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function RealtimeStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const channel = supabase.channel('connection-test');

    channel
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          setIsConnected(true);
        }
      })
      .subscribe();

    const interval = setInterval(() => {
      setIsConnected(channel.state === 'joined');
    }, 3000);

    return () => {
      clearInterval(interval);
      channel.unsubscribe();
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-lg ${
          isConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}
      >
        {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
        <span>{isConnected ? '실시간 연결됨' : '연결 끊김'}</span>
      </div>
    </div>
  );
}

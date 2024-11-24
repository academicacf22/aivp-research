'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function SessionTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="session-timer flex items-center space-x-2 p-2 bg-white rounded-lg shadow">
      <Clock className="h-4 w-4 text-primary" />
      <span className="font-mono text-sm">{formatTime(elapsed)}</span>
    </div>
  );
}
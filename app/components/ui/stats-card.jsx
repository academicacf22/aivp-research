'use client';

import { useEffect, useState } from 'react';
import { db } from '@/app/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Clock, MessageSquare, Calculator } from 'lucide-react';

const iconMap = {
  cases: MessageSquare,
  time: Clock,
  average: Calculator
};

export default function StatsCard({ userId, type, title }) {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      
      try {
        // Query completed sessions for this user
        const sessionsRef = collection(db, 'sessions');
        const sessionsQuery = query(
          sessionsRef,
          where('userId', '==', userId),
          where('status', '==', 'completed')
        );
        const snapshot = await getDocs(sessionsQuery);
        
        const sessions = snapshot.docs.map(doc => {
          const data = doc.data();
          // Safely handle Firestore timestamps
          const startTime = data.startTime ? new Date(data.startTime.seconds * 1000) : null;
          const endTime = data.endTime ? new Date(data.endTime.seconds * 1000) : null;
          return {
            id: doc.id,
            startTime,
            endTime
          };
        }).filter(session => session.startTime && session.endTime);

        switch (type) {
          case 'cases':
            setValue(sessions.length);
            break;
            
          case 'time':
            const totalMinutes = sessions.reduce((acc, session) => {
              return acc + ((session.endTime - session.startTime) / (1000 * 60));
            }, 0);
            setValue(Math.round(totalMinutes));
            break;
            
          case 'average':
            if (sessions.length === 0) {
              setValue(0);
            } else {
              const totalTime = sessions.reduce((acc, session) => {
                return acc + ((session.endTime - session.startTime) / (1000 * 60));
              }, 0);
              setValue(Math.round(totalTime / sessions.length));
            }
            break;
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setValue(0);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId, type]);

  const formatValue = () => {
    if (type === 'time' || type === 'average') {
      if (value === 0) return '0m';
      const hours = Math.floor(value / 60);
      const minutes = value % 60;
      if (hours === 0) return `${minutes}m`;
      return `${hours}h ${minutes}m`;
    }
    return value.toString();
  };

  const Icon = iconMap[type] || MessageSquare;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="p-3 bg-primary/10 rounded-full">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
      <p className="text-3xl font-bold text-primary">
        {loading ? '-' : formatValue()}
      </p>
    </div>
  );
}
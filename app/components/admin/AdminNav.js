'use client';

import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  BarChart2,
  DollarSign
} from 'lucide-react';

export default function AdminNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'transcripts', label: 'Transcripts', icon: FileText },
    { id: 'metrics', label: 'Research Metrics', icon: BarChart2 },
    { id: 'costs', label: 'Costs', icon: DollarSign },
  ];

  return (
    <nav className="bg-white rounded-lg shadow p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  activeTab === item.id
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
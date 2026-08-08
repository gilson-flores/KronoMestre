'use client';

import React from 'react';
import { ScheduleItem } from '@/lib/types';
import { Clock, MapPin, BookOpen } from 'lucide-react';

interface ScheduleViewProps {
  schedule: ScheduleItem[];
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Horários das Aulas</h1>
        <p className="text-sm text-[#bccabb] mt-1">Grade semanal das disciplinas de Sociologia</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schedule.map((item) => (
          <div
            key={item.id}
            className="glass-panel p-6 rounded-3xl border border-white/10 space-y-4 glass-panel-hover"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold bg-[#4ade80]/20 text-[#4ade80] px-3 py-1 rounded-full border border-[#4ade80]/30">
                {item.day}
              </span>
              <span className="text-xs font-bold text-[#c0c1ff] bg-[#171f33] px-3 py-1 rounded-full border border-white/10">
                {item.turma}
              </span>
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">{item.subject}</h3>
            </div>

            <div className="flex items-center gap-6 text-xs text-[#bccabb] pt-2 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#4ade80]" />
                <span>{item.time}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#c0c1ff]" />
                <span>{item.room}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

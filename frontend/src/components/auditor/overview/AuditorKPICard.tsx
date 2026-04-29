import React from 'react';
import { Card } from '../../ui/core';

interface AuditorKPICardProps {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  sublabel?: string;
}

/** Tarjeta de indicador (KPI) para el panel del auditor. */
export function AuditorKPICard({ label, value, color, icon, sublabel }: AuditorKPICardProps) {
  return (
    <Card className={`border-l-4 ${color}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</div>
          <div className="text-3xl font-black text-white">{value}</div>
          {sublabel && <div className="text-xs text-slate-500 mt-1">{sublabel}</div>}
        </div>
        <div className="opacity-20 text-4xl">{icon}</div>
      </div>
    </Card>
  );
}

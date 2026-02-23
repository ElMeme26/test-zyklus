import { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Card } from '../../ui/core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { COLORS } from './constants';

export function DashboardCharts() {
  const { assets, requests, stats } = useData();

  const top8Assets = useMemo(() => {
    return Object.entries(
      requests.reduce((acc, req) => {
        const name = req.assets?.name ?? 'Desconocido';
        const shortName = name.split(' ').slice(0, 2).join(' ');
        acc[shortName] = (acc[shortName] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [requests]);

  const disciplinas = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.requester_disciplina).filter((d): d is string => Boolean(d))));
  }, [requests]);

  const [selectedDisciplina, setSelectedDisciplina] = useState(disciplinas[0] ?? '');

  const disciplinaData = useMemo(() => {
    return Object.entries(
      requests
        .filter(r => r.requester_disciplina === selectedDisciplina)
        .reduce((acc, req) => {
          const name = req.assets?.name ?? 'Desconocido';
          const shortName = name.split(' ').slice(0, 2).join(' ');
          acc[shortName] = (acc[shortName] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    )
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [requests, selectedDisciplina]);

  const categoryData = useMemo(() => {
    return Object.entries(
      stats?.categoryCounts ?? assets.reduce((acc: Record<string, number>, a) => {
        const cat = a.category ?? 'Sin Categoría';
        acc[cat] = (acc[cat] ?? 0) + 1;
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [stats?.categoryCounts, assets]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-bold mb-4 text-sm">Top 8 Activos Más Solicitados</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={top8Assets} margin={{ left: 20 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} barSize={20}>
                  {top8Assets.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-bold text-sm">Top por Disciplina</h3>
            <select
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded p-1.5 focus:outline-none focus:border-primary max-w-[120px]"
              value={selectedDisciplina}
              onChange={e => setSelectedDisciplina(e.target.value)}
            >
              {disciplinas.length > 0 ? (
                disciplinas.map(d => <option key={d} value={d}>{d}</option>)
              ) : (
                <option value="">Sin datos</option>
              )}
            </select>
          </div>
          <div className="h-72">
            {disciplinaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={disciplinaData} margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }} cursor={{ fill: '#1e293b', opacity: 0.4 }} />
                  <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Sin solicitudes para esta disciplina
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-white font-bold mb-4 text-sm">Distribución por Categoría</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                  {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} formatter={v => <span className="text-slate-300">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

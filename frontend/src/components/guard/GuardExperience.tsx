import { useMemo, useState } from 'react';
import { GuardScanner } from './GuardScanner';
import { GuardKioskScreen } from './kiosk/GuardKioskScreen';
import { LayoutGrid, MonitorSmartphone } from 'lucide-react';

type GuardView = 'panel' | 'kiosk';

export function GuardExperience() {
  const [view, setView] = useState<GuardView>('kiosk');

  const tabs = useMemo(
    () => [
      { id: 'kiosk' as const, label: 'Kiosko (Demo)', icon: MonitorSmartphone },
      { id: 'panel' as const, label: 'Panel', icon: LayoutGrid },
    ],
    [],
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-background/80 backdrop-blur shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-black tracking-tight leading-tight">Guardia</p>
              <p className="text-slate-500 text-xs">Selector de experiencia (solo demo)</p>
            </div>

            <div className="flex bg-slate-900 rounded-2xl p-1.5 border border-slate-800">
              {tabs.map(t => {
                const Icon = t.icon;
                const active = view === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setView(t.id)}
                    className={[
                      'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all',
                      active
                        ? 'bg-primary text-black shadow-lg shadow-primary/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50',
                    ].join(' ')}
                  >
                    <Icon size={16} />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'panel' ? <GuardScanner /> : <GuardKioskScreen />}
      </div>
    </div>
  );
}


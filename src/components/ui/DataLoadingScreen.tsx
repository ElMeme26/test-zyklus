import { Loader2 } from 'lucide-react';

interface DataLoadingScreenProps {
  message?: string;
}

export function DataLoadingScreen({ message = 'Cargando datos...' }: DataLoadingScreenProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400">
      <Loader2 className="animate-spin text-primary" size={40} />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card, Button } from '../ui/core';
import { Check, X, RotateCcw, Box, User as UserIcon, LogOut } from 'lucide-react';

export function ManagerInbox() {
  const { requests, approveRequest, rejectRequest, returnRequestWithFeedback } = useData();
  const { logout, user } = useAuth();
  
  // Filtramos solo las pendientes
  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  return (
    <div className="min-h-screen bg-background p-6 font-sans pb-20">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Hola, {user?.name} 👋</h1>
          <p className="text-secondary text-sm">Tienes <span className="text-primary font-bold">{pendingRequests.length}</span> solicitudes pendientes.</p>
        </div>
        <Button variant="ghost" onClick={logout}><LogOut size={18}/></Button>
      </header>

      <div className="grid gap-4 max-w-3xl mx-auto">
        {pendingRequests.length === 0 && (
          <div className="text-center py-20 opacity-50">
            <Box size={48} className="mx-auto mb-4 text-slate-600"/>
            <p className="text-slate-400">Todo al día. No hay solicitudes pendientes.</p>
          </div>
        )}

        {pendingRequests.map(req => (
          <Card key={req.id} className="group hover:border-primary/30 transition-colors">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                  <UserIcon size={24}/>
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{req.requester_name}</h3>
                  <p className="text-primary text-sm font-medium mb-1">Solicita: {req.assets?.name || 'Activo #' + req.asset_id}</p>
                  <p className="text-secondary text-xs line-clamp-2">Motivo: "{req.motive}"</p>
                  <div className="flex gap-3 mt-3 text-xs text-slate-500 font-mono">
                    <span>📅 {req.days_requested} días</span>
                    <span>🏢 {req.requester_dept}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-row md:flex-col gap-2 justify-end">
                <Button 
                  onClick={() => approveRequest(req.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Check size={18} className="mr-2"/> Aprobar
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const reason = prompt("Razón para devolver la solicitud:");
                      if(reason) returnRequestWithFeedback(req.id, reason);
                    }}
                    className="flex-1 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <RotateCcw size={18}/>
                  </Button>
                  <Button 
                    variant="danger" 
                    onClick={() => {
                      if(confirm("¿Rechazar definitivamente?")) rejectRequest(req.id);
                    }}
                    className="flex-1"
                  >
                    <X size={18}/>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
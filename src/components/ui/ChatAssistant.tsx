import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from './core';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function ChatAssistant() {
  const { assets, requests, stats } = useData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  const initialMessage = { role: 'bot' as const, text: 'Hola, soy Zykla 🤖. ¿Qué consulta tienes hoy?' };
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const clearChat = () => setMessages([initialMessage]);

  const renderMessageContent = (text: string) => {
    // Busca si hay datos para graficar, tolerando bloques de código Markdown que a veces añade la IA
    const graphMatch = text.match(/\[GRAPH_DATA:\s*({.*?})\s*\]/s) || text.match(/```json\s*\[GRAPH_DATA:\s*({.*?})\s*\]\s*```/s);
    const cleanText = text.replace(/\[GRAPH_DATA:.*?\]/gs, "").replace(/```json/g, "").replace(/```/g, "").trim();

    if (graphMatch) {
      try {
        const rawData = JSON.parse(graphMatch[1]);
        if (!rawData.data || !Array.isArray(rawData.data)) throw new Error("Formato de gráfica incorrecto");

        return (
          <div className="space-y-2 w-full min-w-[200px]">
            <p className="whitespace-pre-wrap">{cleanText}</p>
            <div className="h-40 w-full bg-slate-900/80 rounded-xl p-2 border border-purple-500/30 shadow-inner mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rawData.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {rawData.data.map((_: any, i: number) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#8b5cf6' : '#06b6d4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      } catch (e) { 
        console.error("Error parseando gráfica:", e);
        return (
          <div>
            <p className="whitespace-pre-wrap">{cleanText}</p>
            <p className="text-rose-400 text-[10px] mt-1">⚠️ Error al generar visualización. Intenta otra pregunta.</p>
          </div>
        ); 
      }
    }
    return <p className="whitespace-pre-wrap">{text}</p>;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    if (!GEMINI_API_KEY) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ API Key de Gemini no configurada.' }]);
      return;
    }

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // 🧠 Construir contexto con datos agrupados reales (Categorías, Estados) para que la IA grafique mejor
      let contextData: any = {};
      
      if (user?.role === 'ADMIN_PATRIMONIAL' || user?.role === 'AUDITOR') {
         const cats = stats?.categoryCounts ?? assets.reduce((acc: Record<string, number>, a) => {
            const c = a.category || 'Otros';
            acc[c] = (acc[c] || 0) + 1; return acc;
         }, {});
         
         const states = stats?.assetCounts ?? assets.reduce((acc: Record<string, number>, a) => {
            acc[a.status] = (acc[a.status] || 0) + 1; return acc;
         }, {});

         contextData = {
           totales: { 
             inventario: stats?.assetCounts?.total ?? assets.length, 
             prestamos_activos: stats?.requestCounts?.active ?? requests.filter(r => r.status === 'ACTIVE').length,
             prestamos_vencidos: stats?.requestCounts?.overdue ?? requests.filter(r => r.status === 'OVERDUE').length
           },
           categorias: Object.entries(cats).map(([name, val]) => ({ name, value: val })),
           estados: Object.entries(states).map(([name, val]) => ({ name, value: val }))
         };
      } else {
         contextData = {
           mis_prestamos: requests.filter(r => r.user_id === user?.id).length,
           activos_disponibles: stats?.assetCounts?.disponible ?? assets.filter(a => a.status === 'Disponible').length
         };
      }

      const systemPrompt = `Eres Zykla AI, asistente experto en el sistema Zyklus Halo. 
      DATOS ACTUALES DEL INVENTARIO: ${JSON.stringify(contextData)}.
      
      REGLAS ESTRICTAS:
      1. Responde de forma muy concisa y amable. No uses rodeos.
      2. Si el usuario te pide estadísticas, comparaciones, resúmenes o gráficas sobre categorías, estados o totales, DEBES añadir OBLIGATORIAMENTE al final de tu respuesta el siguiente formato exacto (sin bloques de código markdown alrededor del JSON):
      
      [GRAPH_DATA: {"data": [{"name": "Etiqueta", "value": 10}, {"name": "Etiqueta 2", "value": 5}]}]
      
      Ejemplo de respuesta si piden ver categorías:
      Aquí tienes la distribución del inventario por categorías:
      [GRAPH_DATA: {"data": [{"name": "Laptops", "value": 15}, {"name": "Radares", "value": 8}]}]
      
      Recuerda: NUNCA pongas \`\`\`json antes del [GRAPH_DATA.`;

      // Usando gemini-2.0-flash (el endpoint oficial más rápido y estable)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: `${systemPrompt}\n\nPregunta: ${userMsg}` }] }],
          generationConfig: { 
            temperature: 0.1, // Mantenlo bajo para que no invente datos
            maxOutputTokens: 800 
          }
        })
      });

      if (!response.ok) throw new Error("Error en la API de Google Gemini");

      const data = await response.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude entender la solicitud.";
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
      
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: "❌ Error de conexión con los servidores de Zykla AI." }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="fixed bottom-24 right-6 z-40 bg-purple-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:scale-110 transition-transform animate-pulse-slow"
          title="Abrir Zykla AI"
        >
          <Sparkles size={24} />
        </button>
      )}
      
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-[340px] md:w-96 animate-in fade-in slide-in-from-bottom-4">
          <Card className="flex flex-col h-[500px] border-purple-500/40 shadow-2xl bg-slate-900/95 backdrop-blur-xl border overflow-hidden p-0">
            <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Bot size={18} /> Zykla AI
                {user && <span className="text-[10px] text-slate-400 font-normal">({user.role})</span>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={clearChat} className="text-slate-500 hover:text-rose-400 transition-colors" title="Borrar chat"><Trash2 size={16} /></button>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[95%] px-4 py-3 shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-purple-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl rounded-tl-sm'
                  }`}>
                    {m.role === 'bot' ? renderMessageContent(m.text) : m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-sm border border-slate-700 px-4 py-3 flex items-center gap-2 text-xs">
                    <Loader2 size={14} className="animate-spin text-purple-400" /> Pensando...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
            
            <div className="p-3 border-t border-slate-700/50 bg-slate-900">
              <div className="flex gap-2">
                <Input 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                  className="bg-slate-950 border-slate-700 text-white text-xs h-10 rounded-full pl-4"
                  placeholder="Ej: Muéstrame la gráfica de estados"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSend} 
                  disabled={isLoading || !input.trim()} 
                  className="bg-purple-600 hover:bg-purple-500 h-10 w-10 p-0 rounded-full shrink-0 flex items-center justify-center border-0 shadow-[0_0_15px_rgba(147,51,234,0.4)]"
                >
                  <Send size={14} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from './core';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell, YAxis } from 'recharts';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function ChatAssistant() {
  const { assets, requests } = useData();
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
    // Regex mejorada para capturar el JSON incluso si la IA pone espacios o saltos de línea
    const graphMatch = text.match(/\[GRAPH_DATA:\s*({.*?})\s*\]/s);
    const cleanText = text.replace(/\[GRAPH_DATA:.*?\]/gs, "").trim();

    if (graphMatch) {
      try {
        const rawData = JSON.parse(graphMatch[1]);
        return (
          <div className="space-y-2 w-full min-w-[200px]">
            <p className="whitespace-pre-wrap">{cleanText}</p>
            <div className="h-32 w-full bg-slate-900/80 rounded-lg p-2 border border-purple-500/30 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rawData.data} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '10px' }}
                    cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {rawData.data.map((_: any, i: number) => (
                      <Cell key={i} fill={i % 2 === 0 ? '#8b5cf6' : '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      } catch (e) { 
        console.error("Error parseando gráfica:", e);
        return <p className="text-red-400">⚠️ Error al generar visualización.</p>; 
      }
    }
    return <p className="whitespace-pre-wrap">{text}</p>;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Contexto minificado
      const contextData = user?.role === 'USUARIO' 
        ? { prestamos: requests.filter(r => r.user_id === user.id).length, disp: assets.filter(a => a.status === 'Disponible').length }
        : { total: assets.length, disp: assets.filter(a => a.status === 'Disponible').length, mant: assets.filter(a => a.status === 'En mantenimiento').length };

      const systemPrompt = `Eres Zykla AI. Datos: ${JSON.stringify(contextData)}.
      REGLAS:
      1. Responde en de forma breve.
      2. Si piden stats, añade AL FINAL: [GRAPH_DATA: {"data": [{"name": "A", "value": 10}]}]
      3. IMPORTANTE: No uses markdown ni bloques de código para el JSON.`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMsg}` }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
        })
      });

      const data = await response.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sin respuesta.";
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
      
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: "❌ Reintenta." }]);
    } finally { setIsLoading(false); }
  };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} className="fixed bottom-24 right-6 z-40 bg-purple-600 text-white p-4 rounded-full shadow-lg">
          <Sparkles size={24} />
        </button>
      )}
      
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-[320px] md:w-80">
          <Card className="flex flex-col h-[480px] border-purple-500/30 shadow-2xl bg-slate-900/95 backdrop-blur-xl border overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/30">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Bot size={18} /> Zykla AI
              </div>
              <div className="flex items-center gap-3">
                <button onClick={clearChat} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white"><X size={18} /></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[11px] scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[95%] rounded-xl px-3 py-2 ${
                    m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                    {m.role === 'bot' ? renderMessageContent(m.text) : m.text}
                  </div>
                </div>
              ))}
              {isLoading && <Loader2 size={12} className="animate-spin text-purple-400 ml-2" />}
              <div ref={scrollRef} />
            </div>
            
            <div className="p-3 border-t border-slate-700/50">
              <div className="flex gap-2">
                <Input 
                  value={input} 
                  onChange={e => setInput(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                  className="bg-slate-800 border-slate-700 text-white text-[11px] h-8"
                  placeholder="Ej: Resumen del inventario"
                />
                <Button onClick={handleSend} disabled={isLoading} className="bg-purple-600 h-8 w-8 p-0 shrink-0">
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
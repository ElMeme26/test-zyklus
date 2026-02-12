import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button, Input, Card } from './core';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function ChatAssistant() {
  const { assets } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'Hola, soy Zykla 🤖. Pregúntame sobre el inventario.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const context = JSON.stringify(assets.map(a => ({ n: a.name, t: a.tag, s: a.status, c: a.category, l: a.location })).slice(0, 50));
      const prompt = `Actúa como Zykla, experto en activos. Datos: ${context}. Pregunta: "${userMsg}"`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error en mi cerebro.";
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
    } catch { setMessages(prev => [...prev, { role: 'bot', text: "Error de conexión." }]); }
    finally { setIsLoading(false); }
  };

  return (
    <>
      {!isOpen && <button onClick={() => setIsOpen(true)} className="fixed bottom-24 right-6 z-40 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform"><Sparkles size={24} /></button>}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm md:w-96">
          <Card className="flex flex-col h-[500px] border-purple-500/30 shadow-2xl bg-slate-900/95 backdrop-blur-xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold"><Bot size={20} /> Zykla AI</div>
              <button onClick={() => setIsOpen(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 p-2 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-200'}`}>{m.text}</div>
                </div>
              ))}
              {isLoading && <Loader2 size={16} className="animate-spin text-purple-400 m-2"/>}
              <div ref={scrollRef} />
            </div>
            <div className="pt-3 mt-2 border-t border-slate-700 flex gap-2">
              <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} className="h-10 text-xs"/>
              <Button onClick={handleSend} size="icon" className="h-10 w-10 bg-purple-600"><Send size={16} /></Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Loader2, Sparkles } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from './core';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export function ChatAssistant() {
  const { assets, requests } = useData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
    { role: 'bot', text: 'Hola, soy Zykla 🤖. Pregúntame sobre el inventario, tus préstamos o cualquier duda.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    scrollRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!GEMINI_API_KEY) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ API Key de Gemini no configurada. Configura VITE_GEMINI_API_KEY en tu .env' }]);
      return;
    }

    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Filtrar contexto según el rol del usuario
      let context = '';
      
      if (user?.role === 'USUARIO') {
        // Usuario solo ve sus préstamos
        const userRequests = requests.filter(r => r.user_id === user.id);
        context = JSON.stringify({
          mis_prestamos: userRequests.map(r => ({
            id: r.id,
            activo: r.assets?.name,
            tag: r.assets?.tag,
            estado: r.status,
            dias: r.days_requested,
            retorno: r.expected_return_date,
            motivo: r.motive
          })),
          activos_disponibles: assets.filter(a => a.status === 'Operativa').map(a => ({
            nombre: a.name,
            tag: a.tag,
            categoria: a.category
          })).slice(0, 20)
        });
      } else if (user?.role === 'ADMIN_PATRIMONIAL' || user?.role === 'AUDITOR') {
        // Admin y Auditor ven todo
        context = JSON.stringify({
          total_activos: assets.length,
          activos: assets.map(a => ({
            nombre: a.name,
            tag: a.tag,
            estado: a.status,
            categoria: a.category,
            ubicacion: a.location,
            marca: a.brand,
            uso: a.usage_count
          })).slice(0, 50),
          solicitudes_recientes: requests.slice(0, 20).map(r => ({
            solicitante: r.requester_name,
            activo: r.assets?.name,
            estado: r.status,
            fecha: r.created_at
          }))
        });
      } else {
        // Otros roles: vista limitada
        context = JSON.stringify({
          activos_categoria: assets.map(a => ({ nombre: a.name, categoria: a.category, estado: a.status })).slice(0, 30)
        });
      }
      
      const systemPrompt = `Eres Zykla, un asistente IA experto en gestión patrimonial para el sistema Zyklus.

ROL DEL USUARIO: ${user?.role || 'DESCONOCIDO'}
NOMBRE: ${user?.name || 'Usuario'}

DATOS DEL SISTEMA:
${context}

INSTRUCCIONES:
- Responde de forma concisa, amigable y profesional
- Si el usuario pregunta por vencimientos, búscalos en los datos
- Si pregunta por renovaciones, explícale cómo hacerlo desde su panel
- Si es USUARIO, solo respondes sobre SUS préstamos y activos disponibles
- Si es ADMIN o AUDITOR, puedes responder sobre TODO el inventario
- Si no tienes la información exacta, sugiere buscar en el sistema
- NUNCA inventes datos, usa solo lo que está en el contexto
- Sé breve: máximo 3-4 líneas por respuesta`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ 
              text: `${systemPrompt}\n\nPREGUNTA DEL USUARIO:\n${userMsg}` 
            }] 
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "No pude procesar tu pregunta. Intenta reformularla.";
      setMessages(prev => [...prev, { role: 'bot', text: botReply }]);
      
    } catch (error) {
      console.error('Gemini API Error:', error);
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: "⚠️ Error de conexión con Zykla IA. Verifica tu API Key o intenta más tarde." 
      }]);
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="fixed bottom-24 right-6 z-40 bg-purple-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform animate-pulse-slow"
          aria-label="Abrir Zykla AI"
        >
          <Sparkles size={24} />
        </button>
      )}
      
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-sm md:w-96">
          <Card className="flex flex-col h-[500px] border-purple-500/30 shadow-2xl bg-slate-900/95 backdrop-blur-xl">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-2">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <Bot size={20} /> Zykla AI
                {user && <span className="text-[10px] text-slate-500 font-normal">({user.role})</span>}
              </div>
              <button onClick={() => setIsOpen(false)}>
                <X size={18} className="text-slate-400 hover:text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 p-2 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl px-3 py-2 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-purple-400" />
                    <span className="text-xs text-slate-400">Pensando...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
            
            <div className="pt-3 mt-2 border-t border-slate-700 flex gap-2">
              <Input 
                value={input} 
                onChange={e => setInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && !isLoading && handleSend()} 
                className="h-10 text-xs"
                placeholder="Pregunta a Zykla..."
                disabled={isLoading}
              />
              <Button 
                onClick={handleSend} 
                size="icon" 
                className="h-10 w-10 bg-purple-600 hover:bg-purple-500"
                disabled={isLoading || !input.trim()}
              >
                <Send size={16} />
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
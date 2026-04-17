/** Asistente de chat con IA (Gemini) para consultas y gráficas del sistema patrimonial. */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Trash2, Download, Bell } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from './core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from 'recharts';
import { apiFetch } from '../../api/client';
import { semanticSearch, generateAutoAlerts, chatWithLanguage } from '../../api/ai';

interface GraphData {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  data: Array<{ name: string; value: number }>;
}

interface Message {
  role: 'user' | 'bot';
  text: string;
  graph?: GraphData;
}

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

/** 
 * Extrae bloques JSON con gráficas del texto
 * Busca: ```json {...}``` o [GRAPH:{...}]
 */
function extractChart(text: string): { clean: string; graph?: GraphData } {
  let match;
  let jsonStr;
  let fullBlock = '';

  // Intenta buscar ```json ... ``` (backticks)
  const jsonBlockRegex = /```json\s*([\s\S]*?)```/i;
  match = jsonBlockRegex.exec(text);

  if (match) {
    const content = match[1].trim();
    const jsonMatch = /\{[\s\S]*\}/.exec(content);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
      fullBlock = match[0];
    }
  }

  // Fallback: buscar [GRAPH: {...}]
  if (!jsonStr) {
    const graphMarker = '[GRAPH:';
    const markerIdx = text.indexOf(graphMarker);
    if (markerIdx !== -1) {
      const jsonStart = text.indexOf('{', markerIdx);
      if (jsonStart !== -1) {
        let depth = 0;
        let jsonEnd = -1;
        for (let i = jsonStart; i < text.length; i++) {
          if (text[i] === '{') depth++;
          else if (text[i] === '}') {
            depth--;
            if (depth === 0) { jsonEnd = i; break; }
          }
        }
        if (jsonEnd !== -1) {
          jsonStr = text.slice(jsonStart, jsonEnd + 1);
          const closingBracket = text.indexOf(']', jsonEnd);
          const blockEnd = closingBracket !== -1 ? closingBracket + 1 : jsonEnd + 1;
          fullBlock = text.slice(markerIdx, blockEnd);
        }
      }
    }
  }

  if (!jsonStr) return { clean: text.trim() };

  try {
    const raw = JSON.parse(jsonStr);
    const chartType = raw.chartType || raw.type || 'bar';
    const isValidChart = ['bar', 'pie', 'line'].includes(chartType) && 
                        Array.isArray(raw.data) && 
                        raw.data.length > 0;

    if (!isValidChart) return { clean: text.trim() };

    const cleanText = fullBlock ? text.replace(fullBlock, '').trim() : text.trim();
    return {
      clean: cleanText,
      graph: {
        type: chartType,
        title: raw.title || '',
        data: raw.data,
      },
    };
  } catch (e) {
    console.warn('[Zykla] JSON parse error:', e);
    return { clean: text.trim() };
  }
}

function ChartWidget({ graph }: { graph: GraphData }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(() => {
    if (!chartRef.current) return;
    const svgEl = chartRef.current.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = svgEl.clientWidth || 400;
    canvas.height = svgEl.clientHeight || 300;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `zykla-grafica-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  }, []);

  const renderChart = () => {
    if (graph.type === 'pie') {
      return (
        <PieChart>
          <Pie data={graph.data} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
            {graph.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} strokeWidth={0} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} formatter={v => <span style={{ color: '#94a3b8' }}>{v}</span>} />
        </PieChart>
      );
    }
    if (graph.type === 'line') {
      return (
        <LineChart data={graph.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '11px', color: '#fff' }} />
          <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} />
        </LineChart>
      );
    }
    return (
      <BarChart data={graph.data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '11px', color: '#fff' }} cursor={{ fill: 'rgba(139,92,246,0.1)' }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {graph.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    );
  };

  return (
    <div className="mt-3 w-full">
      {graph.title && <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2">{graph.title}</p>}
      <div className="bg-slate-900/80 rounded-xl border border-purple-500/20 p-3 shadow-inner" ref={chartRef}>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
      <button
        onClick={handleExport}
        className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-purple-400 transition-colors"
      >
        <Download size={11} /> Exportar gráfica como PNG
      </button>
    </div>
  );
}

/** 
 * Llama al endpoint de chat contextual del backend.
 * El contexto (rol + activos/solicitudes/stats) se inyecta desde el servidor.
 * MEJORA 4: Envía preferencia de idioma al servidor
 */
async function callChatAI(message: string, language: 'es' | 'en' | 'pt' = 'es'): Promise<string> {
  const response = await apiFetch<{ text: string }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, language }),
  });
  return response.text;
}

export function ChatAssistant() {
  const { assets, requests, stats } = useData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  // const [language, setLanguage] = useState<'es' | 'en' | 'pt'>('es');

  const isUserRole = user?.role !== 'ADMIN_PATRIMONIAL' && user?.role !== 'AUDITOR';
  const initialMessage: Message = {
    role: 'bot',
    text: isUserRole
      ? 'Hola, soy Zykla. Puedo ayudarte con tu información de préstamos y recomendarte activos según lo que vayas a hacer. ¿En qué te ayudo?'
      : 'Hola, soy Zykla. Puedo mostrarte estadísticas, gráficas y análisis del sistema. ¿Qué necesitas?',
  };
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const clearChat = () => setMessages([initialMessage]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Detectar si pide recomendaciones de activos y hacer búsqueda semántica automática
      const searchKeywords = ['necesito', 'recomend', 'sugier', 'activo', 'equipo', 'herramienta', 'dispositivo', 
                             'quiero', 'busco', 'need', 'recommend', 'suggest', 'want', 'look for',
                             'preciso', 'recomenda', 'sugira', 'ativo', 'ferramenta'];
      const shouldSearch = searchKeywords.some(kw => userMsg.toLowerCase().includes(kw)) && isUserRole;

      // MEJORA 4: Llamar con preferencia de idioma
      let aiResponse = await callChatAI(userMsg, 'es');

      // Si es usuario y pidió activos, insertar resultados de búsqueda semántica
      if (shouldSearch) {
        const searchResult = await performSemanticSearch(userMsg);
        if (searchResult) {
          aiResponse = `${aiResponse}\n\n${searchResult}`;
        }
      }

      const { clean, graph } = extractChart(aiResponse);
      setMessages(prev => [...prev, { role: 'bot', text: clean || aiResponse, graph }]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Zykla AI error:', msg);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `Error al conectar con Zykla AI: ${msg}. Verifica que el backend esté disponible.`,
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // MEJORA 2 INTEGRADA: Búsqueda Semántica automática en chat
  const performSemanticSearch = async (problem: string): Promise<string | null> => {
    try {
      const recommendations = await semanticSearch(problem, 'es');
      if (recommendations.length === 0) return null;

      const botText = recommendations.map((r, i) =>
        `${i + 1}. **${r.name}** (${r.tag}) - Confianza: ${Math.round(r.confidence * 100)}%\n   _${r.reason}_`
      ).join('\n\n');

      return `🔍 Activos recomendados para tu necesidad:\n\n${botText}`;
    } catch (error) {
      console.error('Semantic search error:', error);
      return null;
    }
  };

  // MEJORA 3: Alertas Automáticas (solo para admins)
  const handleGenerateAlerts = async () => {
    setIsLoading(true);
    try {
      const result = await generateAutoAlerts('es');
      if (result.alerts.length === 0) {
        setMessages(prev => [...prev, {
          role: 'bot',
          text: 'No hay alertas en este momento. Sistema en buen estado.',
        }]);
        return;
      }

      const alertText = result.alerts.map((a, i) =>
        `${i + 1}. [${a.severity}] **${a.title}**\n   _${a.description}_`
      ).join('\n\n');

      setMessages(prev => [...prev, {
        role: 'bot',
        text: `⚠️ Alertas generadas:\n\n${alertText}\n\n_Stats: Total activos: ${result.stats.totalAssets}, Mantenimiento: ${result.stats.maintenanceNeeded}, Vencidos: ${result.stats.overdueRequests}_`,
      }]);
    } catch (error) {
      console.error('Auto-alerts error:', error);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: 'Error al generar alertas. Intenta de nuevo.',
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
          className="fixed bottom-24 right-6 z-40 bg-purple-600 text-white p-4 rounded-full shadow-[0_0_20px_rgba(147,51,234,0.5)] hover:scale-110 transition-transform animate-pulse-slow"
          title="Abrir Zykla AI"
        >
          <Sparkles size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-full max-w-[340px] md:w-96 animate-in fade-in slide-in-from-bottom-4">
          <Card className="flex flex-col h-[520px] border-purple-500/40 shadow-2xl bg-slate-900/95 backdrop-blur-xl border overflow-hidden p-0">
            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-gradient-to-r from-purple-900/50 to-slate-800/50 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                  <Bot size={14} className="text-purple-400" />
                </div>
                Zykla AI
                {user && <span className="text-[10px] text-slate-400 font-normal ml-1">({user.role})</span>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={clearChat} className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-700/50" title="Borrar chat">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[95%] px-4 py-3 shadow-sm ${
                    m.role === 'user'
                      ? 'bg-purple-600 text-white rounded-2xl rounded-tr-sm'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-2xl rounded-tl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                    {m.graph && <ChartWidget graph={m.graph} />}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-tl-sm border border-slate-700 px-4 py-3 flex items-center gap-2 text-xs">
                    <Loader2 size={14} className="animate-spin text-purple-400" /> Analizando datos...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length === 1 && (
              <div className="px-3 pb-2 space-y-2">
                {/* MEJORA 3: Botón de Alertas solo para admins */}
                {!isUserRole && (
                  <button
                    onClick={handleGenerateAlerts}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 text-[10px] px-3 py-2 bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 rounded-lg transition-all disabled:opacity-50"
                    title="Generar alertas del sistema"
                  >
                    <Bell size={12} /> Generar alertas del sistema
                  </button>
                )}
                {/* Quick action suggestions */}
                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                  {(isUserRole
                    ? [
                        '💡 Sugiéreme equipos para pruebas de red',
                        '🔍 ¿Qué activos tengo disponibles?',
                        '📦 ¿Cuántos préstamos tengo?',
                        '📅 Mis fechas de devolución próximas',
                      ]
                    : [
                        '📊 Graficar equipos por estado',
                        '📈 Demanda de equipos este mes',
                        '🎯 Activos más solicitados',
                        '⚠️ Alertas de mantenimiento',
                      ]
                  ).map(s => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); }}
                      className="flex-shrink-0 text-[10px] px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-500/40 rounded-full transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-slate-700/50 bg-slate-900">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  className="bg-slate-950 border-slate-700 text-white text-xs h-10 rounded-full pl-4"
                  placeholder={isUserRole ? 'Ej: ¿Qué préstamos tengo?' : 'Ej: Muéstrame la gráfica de estados'}
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
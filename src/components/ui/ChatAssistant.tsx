// src/components/ui/ChatAssistant.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, X, Loader2, Sparkles, Trash2, Download } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Input, Card } from './core';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from 'recharts';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Usar 2.5 Flash — más inteligente y sigue instrucciones de formato mejor
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── TIPOS ────────────────────────────────────────────────────
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

// ─── COLORES ──────────────────────────────────────────────────
const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

// ─── EXTRACTOR DE GRAPH_DATA (robusto con conteo de llaves) ──────────────────
// El regex {.*?} falla con JSON anidado porque para en el primer "}"
// Esta versión busca "[GRAPH_DATA:" y extrae el JSON contando llaves
function extractGraph(text: string): { clean: string; graph?: GraphData } {
  // 1. Limpiar wrappers de markdown que Gemini a veces añade
  const cleaned = text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '');

  const marker = '[GRAPH_DATA:';
  const markerIdx = cleaned.indexOf(marker);
  if (markerIdx === -1) return { clean: cleaned.trim() };

  // 2. Encontrar el inicio del JSON (primer '{' después del marker)
  const jsonStart = cleaned.indexOf('{', markerIdx + marker.length);
  if (jsonStart === -1) return { clean: cleaned.trim() };

  // 3. Contar llaves para encontrar el cierre correcto del objeto JSON
  let depth = 0;
  let jsonEnd = -1;
  for (let i = jsonStart; i < cleaned.length; i++) {
    if (cleaned[i] === '{') depth++;
    else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) { jsonEnd = i; break; }
    }
  }
  if (jsonEnd === -1) return { clean: cleaned.trim() };

  const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);

  // 4. Calcular el bloque completo "[GRAPH_DATA: {...}]" para removerlo del texto
  const closingBracket = cleaned.indexOf(']', jsonEnd);
  const blockEnd = closingBracket !== -1 ? closingBracket + 1 : jsonEnd + 1;
  const fullBlock = cleaned.slice(markerIdx, blockEnd);
  const cleanText = cleaned.replace(fullBlock, '').trim();

  // 5. Parsear y validar el JSON
  try {
    const raw = JSON.parse(jsonStr) as {
      type?: string;
      title?: string;
      data?: Array<{ name: string; value: number }>;
    };
    const graph: GraphData = {
      type: (raw.type as GraphData['type']) || 'bar',
      title: raw.title || '',
      data: Array.isArray(raw.data) ? raw.data : [],
    };
    if (graph.data.length === 0) return { clean: cleanText };
    return { clean: cleanText, graph };
  } catch (e) {
    console.warn('[Zykla] GRAPH_DATA parse error:', e, '\nJSON extraído:', jsonStr);
    return { clean: cleanText };
  }
}

// ─── COMPONENTE GRÁFICA ───────────────────────────────────────
function ChartWidget({ graph }: { graph: GraphData }) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(() => {
    if (!chartRef.current) return;
    // Crear SVG snapshot via canvas
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
    // default: bar
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

// ─── LLAMADA A GEMINI ─────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('Sin API Key');

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(data.error.message);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Respuesta vacía de Gemini');
  return text;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export function ChatAssistant() {
  const { assets, requests, stats } = useData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const initialMessage: Message = { role: 'bot', text: 'Hola, soy Zykla 🤖. Puedo mostrarte estadísticas, gráficas y análisis del sistema. ¿Qué necesitas?' };
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const clearChat = () => setMessages([initialMessage]);

  // ─── CONSTRUCCIÓN DEL CONTEXTO ────────────────────────────
  const buildContext = useCallback(() => {
    const isAdmin = user?.role === 'ADMIN_PATRIMONIAL' || user?.role === 'AUDITOR';
    if (!isAdmin) {
      return {
        mis_prestamos: requests.filter(r => r.user_id === user?.id).length,
        activos_disponibles: assets.filter(a => a.status === 'Disponible').length,
      };
    }

    // Categorías
    const cats = assets.reduce((acc: Record<string, number>, a) => {
      const c = a.category || 'Sin categoría';
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {});

    // Estados
    const states = assets.reduce((acc: Record<string, number>, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    // Top activos solicitados
    const topAssets = Object.entries(
      requests.reduce((acc: Record<string, number>, r) => {
        const name = r.assets?.name || 'Desconocido';
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));

    // Por disciplina
    const byDisciplina = requests.reduce((acc: Record<string, number>, r) => {
      const d = r.requester_disciplina || 'Sin asignar';
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});

    // Vencidos
    const overdueList = requests
      .filter(r => r.status === 'OVERDUE')
      .slice(0, 5)
      .map(r => ({ activo: r.assets?.name, usuario: r.requester_name }));

    return {
      totales: {
        inventario: assets.length,
        disponibles: assets.filter(a => a.status === 'Disponible').length,
        prestados: assets.filter(a => a.status === 'Prestada').length,
        mantenimiento: assets.filter(a => ['En mantenimiento', 'Requiere Mantenimiento'].includes(a.status)).length,
        prestamos_activos: requests.filter(r => r.status === 'ACTIVE').length,
        prestamos_vencidos: requests.filter(r => r.status === 'OVERDUE').length,
        total_solicitudes: requests.length,
      },
      categorias: Object.entries(cats).map(([name, value]) => ({ name, value })),
      estados: Object.entries(states).map(([name, value]) => ({ name, value })),
      top_activos_solicitados: topAssets,
      solicitudes_por_disciplina: Object.entries(byDisciplina).map(([name, value]) => ({ name, value })),
      prestamos_vencidos_detalle: overdueList,
    };
  }, [assets, requests, user]);

  // ─── SYSTEM PROMPT ────────────────────────────────────────
  const buildSystemPrompt = useCallback((context: object) => {
    return `Eres Zykla AI, asistente experto integrado en Zyklus Halo, un sistema de control patrimonial.

DATOS ACTUALES DEL SISTEMA:
${JSON.stringify(context, null, 2)}

INSTRUCCIONES ESTRICTAS:
1. Responde siempre en español, de forma concisa y directa.
2. Cuando el usuario pida estadísticas, gráficas, comparaciones o visualizaciones, DEBES incluir OBLIGATORIAMENTE al final de tu respuesta un bloque con este formato EXACTO (sin markdown alrededor):

[GRAPH_DATA: {"type": "bar", "title": "Título de la gráfica", "data": [{"name": "Etiqueta", "value": 10}]}]

3. Los tipos de gráfica válidos son: "bar", "pie", "line".
4. Usa "pie" para distribuciones porcentuales (categorías, estados).
5. Usa "bar" para comparaciones y rankings.
6. Usa "line" para tendencias en el tiempo.
7. NUNCA pongas markdown (triple backtick) alrededor del [GRAPH_DATA].
8. Si no hay suficientes datos para una gráfica, explícalo y responde solo con texto.
9. Para preguntas que no requieren gráfica, responde solo con texto claro.
10. Siempre basa tus respuestas en los datos reales proporcionados arriba.`;
  }, []);

  // ─── SEND ─────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!GEMINI_API_KEY) {
      setMessages(prev => [...prev, { role: 'bot', text: '⚠️ API Key de Gemini no configurada en las variables de entorno (VITE_GEMINI_API_KEY).' }]);
      return;
    }

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      // Construir contexto con datos agrupados (stats/backend) para que la IA grafique mejor
      let contextData: Record<string, unknown> = {};
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
            prestamos_vencidos: stats?.requestCounts?.overdue ?? requests.filter(r => r.status === 'OVERDUE').length,
          },
          categorias: Object.entries(cats).map(([name, val]) => ({ name, value: val })),
          estados: Object.entries(states).map(([name, val]) => ({ name, value: val })),
        };
      } else {
        contextData = {
          mis_prestamos: requests.filter(r => r.user_id === user?.id).length,
          activos_disponibles: stats?.assetCounts?.disponible ?? assets.filter(a => a.status === 'Disponible').length,
        };
      }
      const systemPrompt = buildSystemPrompt(contextData);
      const fullPrompt = `${systemPrompt}\n\nUsuario: ${userMsg}`;
      const rawText = await callGemini(fullPrompt);
      const { clean, graph } = extractGraph(rawText);

      setMessages(prev => [...prev, { role: 'bot', text: clean || rawText, graph }]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Zykla AI error:', msg);
      setMessages(prev => [...prev, {
        role: 'bot',
        text: `❌ Error al conectar con Zykla AI: ${msg}. Verifica que VITE_GEMINI_API_KEY esté configurada correctamente.`,
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
            <div className="flex justify-between items-center p-3 border-b border-slate-700/50 bg-slate-800/50">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <Bot size={18} /> Zykla AI
                {user && <span className="text-[10px] text-slate-400 font-normal">({user.role})</span>}
                <span className="text-[9px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded-full">2.5 Flash</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={clearChat} className="text-slate-500 hover:text-rose-400 transition-colors" title="Borrar chat">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
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
              <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {[
                  'Gráfica de estados',
                  'Top activos solicitados',
                  'Distribución por categoría',
                  '¿Cuántos vencidos?',
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="flex-shrink-0 text-[10px] px-2.5 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-purple-300 hover:border-purple-500/40 rounded-full transition-all"
                  >
                    {s}
                  </button>
                ))}
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
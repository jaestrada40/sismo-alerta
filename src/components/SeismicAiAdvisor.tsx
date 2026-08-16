import React, { useState } from 'react';
import { Bot, Send, Sparkles, MessageCircle, AlertCircle, ShieldAlert, BookOpen } from 'lucide-react';

interface SeismicAiAdvisorProps {
  lastEarthquakePlace?: string;
}

const QUICK_QUESTIONS = [
  '¿Por qué tiembla tanto en Guatemala?',
  '¿Qué fallas tectónicas causan los terremotos en Guatemala?',
  '¿Qué debo hacer si estoy en un piso alto durante un sismo?',
  '¿Cómo evaluar si mi casa tiene daño estructural tras un sismo?',
  '¿Qué debe llevar la Mochila de las 72 Horas de CONRED?'
];

export const SeismicAiAdvisor: React.FC<SeismicAiAdvisorProps> = ({ lastEarthquakePlace }) => {
  const [question, setQuestion] = useState<string>('');
  const [messages, setMessages] = useState<
    Array<{ sender: 'user' | 'assistant'; text: string; time: string }>
  >([
    {
      sender: 'assistant',
      text: `Hola, soy el **Asistente Experto en Sismología y Gestión de Riesgos de Guatemala** 🇬🇹.
Puedo responderte dudas sobre prevención sísmica, protocolos de CONRED e INSIVUMEH, fallas geológicas (Motagua, Chixoy-Polochic, Zona de Subducción) y cómo proteger a tu familia. ¿En qué te puedo asesorar?`,
      time: 'Ahora'
    }
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleAsk = async (queryText?: string) => {
    const textToSend = queryText || question;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      sender: 'user' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/seismic-ai-advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          context: {
            country: 'Guatemala',
            lastEvent: lastEarthquakePlace
          }
        })
      });

      const data = await response.json();
      const assistantMsg = {
        sender: 'assistant' as const,
        text: data.response || 'Conserve la calma y atienda los boletines oficiales de CONRED.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Para emergencias directas en Guatemala, comunícate al 119 de CONRED o 122/123 de Bomberos. Mantén la calma y revisa tu Mochila de las 72 Horas.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col h-[560px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-tight">
              Asesor Sísmico Inteligente
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold border border-blue-200">
                IA & CONRED
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Consultas sobre sismología, prevención y gestión de riesgos en Guatemala
            </p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 custom-scrollbar">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-xl p-3.5 text-xs leading-relaxed shadow-sm ${
                m.sender === 'user'
                  ? 'bg-blue-900 text-white font-medium rounded-tr-none'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none space-y-1'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              <span
                className={`text-[9px] block text-right mt-1 font-medium ${
                  m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                }`}
              >
                {m.time}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 rounded-tl-none flex items-center space-x-2 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-blue-900 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-blue-900 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 rounded-full bg-blue-900 animate-bounce [animation-delay:0.4s]"></div>
              <span className="text-[11px] text-slate-500 font-medium ml-1">Analizando respuesta sísmica...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="pt-2 pb-2 border-t border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-700 whitespace-nowrap transition flex-shrink-0 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <div className="pt-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Escribe tu consulta sobre sismos o seguridad..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-900 shadow-sm"
        />
        <button
          id="btn-ask-seismic-ai"
          onClick={() => handleAsk()}
          disabled={isLoading || !question.trim()}
          className="p-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 disabled:opacity-40 text-white font-bold transition flex items-center justify-center shadow-sm cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

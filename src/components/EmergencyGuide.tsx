import React, { useState, useEffect } from 'react';
import { BackpackItem, EmergencyContact } from '../types';
import { INITIAL_BACKPACK_ITEMS, EMERGENCY_CONTACTS } from '../data/guatemalaData';
import { ShieldCheck, PhoneCall, CheckSquare, Square, Package, AlertTriangle, Heart, Flame, Shield, HelpCircle } from 'lucide-react';

export const EmergencyGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mochila' | 'protocolos' | 'telefonos'>('mochila');
  const [backpackItems, setBackpackItems] = useState<BackpackItem[]>(() => {
    try {
      const saved = localStorage.getItem('seismic_gt_backpack');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_BACKPACK_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('seismic_gt_backpack', JSON.stringify(backpackItems));
    } catch (e) {}
  }, [backpackItems]);

  const toggleItem = (id: string) => {
    setBackpackItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const checkedCount = backpackItems.filter((i) => i.checked).length;
  const progressPercent = Math.round((checkedCount / backpackItems.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <ShieldCheck className="w-5 h-5 text-blue-900" />
            Guía y Protocolos de Emergencia Sísmica en Guatemala
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Recomendaciones oficiales de CONRED e INSIVUMEH para la prevención y respuesta ante terremotos.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
          <button
            id="tab-mochila"
            onClick={() => setActiveTab('mochila')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'mochila'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            Mochila 72h ({checkedCount}/{backpackItems.length})
          </button>
          <button
            id="tab-protocolos"
            onClick={() => setActiveTab('protocolos')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'protocolos'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            Protocolos Qué Hacer
          </button>
          <button
            id="tab-telefonos"
            onClick={() => setActiveTab('telefonos')}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              activeTab === 'telefonos'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-blue-900'
            }`}
          >
            Directorio Telefónico
          </button>
        </div>
      </div>

      {/* Tab 1: Mochila de las 72 Horas */}
      {activeTab === 'mochila' && (
        <div className="mt-5 space-y-4 animate-in fade-in">
          {/* Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-900" />
                Progreso de preparación de tu Mochila de las 72 Horas:
              </span>
              <span className="text-blue-900 font-bold font-mono">{progressPercent}% completado</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-900 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Según CONRED, cada familia guatemalteca debe contar con suministros esenciales para sobrevivir al menos 3 días de forma autónoma.
            </p>
          </div>

          {/* Items Checklist Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {backpackItems.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start space-x-3 shadow-sm ${
                  item.checked
                    ? 'bg-green-50 border-green-300 text-slate-800'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                }`}
              >
                <button
                  type="button"
                  className="mt-0.5 text-blue-900 flex-shrink-0 focus:outline-none cursor-pointer"
                >
                  {item.checked ? (
                    <CheckSquare className="w-5 h-5 text-green-700" />
                  ) : (
                    <Square className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-xs font-bold ${
                        item.checked ? 'text-green-900 line-through' : 'text-slate-900'
                      }`}
                    >
                      {item.name}
                    </span>
                    {item.important && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 flex-shrink-0 uppercase">
                        VITAL
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Protocolos Qué Hacer */}
      {activeTab === 'protocolos' && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in">
          {/* ANTES */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-black flex items-center justify-center text-[10px]">1</span>
              ANTES DEL SISMO
            </div>
            <ul className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-blue-900 font-bold">•</span>
                <span><strong>Diseñe su Plan Familiar de Respuesta</strong> de CONRED y acuerde puntos de reunión seguros.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-900 font-bold">•</span>
                <span><strong>Identifique y asegure</strong> objetos pesados, cuadros, espejos y estanterías que puedan caer.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-900 font-bold">•</span>
                <span><strong>Revise instalaciones</strong> de gas y electricidad y aprenda a cerrarlas rápidamente.</span>
              </li>
            </ul>
          </div>

          {/* DURANTE */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-yellow-700 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
              <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-800 font-black flex items-center justify-center text-[10px]">2</span>
              DURANTE EL SISMO
            </div>
            <ul className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-yellow-700 font-bold">•</span>
                <span><strong>¡Agáchate, Cúbrete y Sujétate!</strong> Bajo una mesa resistente o estructura firme.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-700 font-bold">•</span>
                <span><strong>Mantenga la calma:</strong> No corra ni empuje al salir. Evite salir despavorido a la calle.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-700 font-bold">•</span>
                <span><strong>No utilice elevadores</strong> ni escaleras mientras dura la sacudida sísmica.</span>
              </li>
            </ul>
          </div>

          {/* DESPUÉS */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-200">
              <span className="w-5 h-5 rounded-full bg-red-100 text-red-800 font-black flex items-center justify-center text-[10px]">3</span>
              DESPUÉS DEL SISMO
            </div>
            <ul className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold">•</span>
                <span><strong>Prepárese para réplicas:</strong> Las réplicas pueden ser fuertes y debilitar estructuras ya dañadas.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold">•</span>
                <span><strong>Cierre el paso de gas</strong> y desactive las llaves eléctricas antes de inspeccionar.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-700 font-bold">•</span>
                <span><strong>Use mensajes de texto</strong> para no saturar las líneas telefónicas y de auxilio.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 3: Directorio Telefónico de Emergencias de Guatemala */}
      {activeTab === 'telefonos' && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-in fade-in">
          {EMERGENCY_CONTACTS.map((contact, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {contact.acronym}
                  </span>
                  <span className="text-xl font-black text-red-600 font-mono">{contact.number}</span>
                </div>
                <h3 className="text-xs font-bold text-slate-900 mt-2">{contact.institution}</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug font-medium">{contact.description}</p>
              </div>

              <a
                href={`tel:${contact.number}`}
                className="mt-4 w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Llamar al {contact.number}</span>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

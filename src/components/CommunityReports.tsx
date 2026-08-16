import React, { useState } from 'react';
import { CommunityReport } from '../types';
import { GUATEMALA_DEPARTMENTS } from '../data/guatemalaData';
import { Users, Send, CheckCircle2, MessageSquare, Building2, MapPin, Sparkles } from 'lucide-react';
import { formatGuatemalaTime, getRelativeTimeSpanish } from '../utils/seismicCalculations';
import { submitReport } from '../services/reportsService';

interface CommunityReportsProps {
  reports: CommunityReport[];
  onReportAdded: (report: CommunityReport) => void;
}

export const CommunityReports: React.FC<CommunityReportsProps> = ({
  reports,
  onReportAdded
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('Guatemala (Capital)');
  const [municipality, setMunicipality] = useState<string>('Zona 10');
  const [feltIntensity, setFeltIntensity] = useState<CommunityReport['feltIntensity']>('Moderado');
  const [buildingType, setBuildingType] = useState<CommunityReport['buildingType']>('Casa de 1 nivel');
  const [comments, setComments] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let mercalli = 'IV';
    if (feltIntensity === 'No sentido') mercalli = 'I';
    if (feltIntensity === 'Débil') mercalli = 'II';
    if (feltIntensity === 'Leve') mercalli = 'III';
    if (feltIntensity === 'Moderado') mercalli = 'IV';
    if (feltIntensity === 'Fuerte') mercalli = 'VI';
    if (feltIntensity === 'Muy Fuerte / Pánico') mercalli = 'VIII';

    const newReport = await submitReport({
      department: selectedDept,
      municipality: municipality || 'Cabecera',
      feltIntensity,
      buildingType,
      comments: comments.trim() || undefined,
      timestamp: Date.now(),
      mercalliEstimated: `Mercalli ${mercalli}`,
    });

    onReportAdded(newReport);
    setSubmitted(true);
    setComments('');
    setTimeout(() => setSubmitted(false), 4000);
  };

  const getIntensityBadge = (intensity: CommunityReport['feltIntensity']) => {
    switch (intensity) {
      case 'Muy Fuerte / Pánico':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Fuerte':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Moderado':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Leve':
      case 'Débil':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tight">
            <Users className="w-5 h-5 text-blue-900" />
            ¿Lo Sentiste? • Reporte Sísmico Comunitario
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registra tu percepción sísmica en Guatemala para mapear la intensidad comunitaria en tiempo real.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-5 bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200">
          <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider mb-3 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-900" />
            Enviar Reporte de Percepción
          </h3>

          {submitted ? (
            <div className="p-6 text-center bg-green-50 border border-green-200 rounded-xl space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
              <h4 className="text-sm font-bold text-green-950">¡Gracias por tu reporte!</h4>
              <p className="text-xs text-green-800">
                Tu reporte ciudadano contribuye a evaluar la intensidad y alcance del evento en Guatemala.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Department */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Departamento:
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-900 shadow-sm"
                >
                  {GUATEMALA_DEPARTMENTS.map((dept) => (
                    <option key={dept.name} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Municipality / Zone */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Municipio / Zona / Colonia:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Zona 10, Mixco, Villa Nueva, San Lucas..."
                  value={municipality}
                  onChange={(e) => setMunicipality(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-900 shadow-sm"
                  required
                />
              </div>

              {/* Felt Intensity */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  ¿Con qué intensidad lo sentiste?
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      'No sentido',
                      'Débil',
                      'Leve',
                      'Moderado',
                      'Fuerte',
                      'Muy Fuerte / Pánico'
                    ] as CommunityReport['feltIntensity'][]
                  ).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFeltIntensity(lvl)}
                      className={`p-2 rounded-lg text-xs font-bold border text-left transition ${
                        feltIntensity === lvl
                          ? 'bg-blue-900 text-white border-blue-900 shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Building Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  ¿Dónde te encontrabas?
                </label>
                <select
                  value={buildingType}
                  onChange={(e) => setBuildingType(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-900 shadow-sm"
                >
                  <option value="Casa de 1 nivel">Casa de 1 nivel (mampostería/block)</option>
                  <option value="Edificio de apartamentos / oficinas">Edificio de apartamentos / oficinas</option>
                  <option value="Construcción de adobe / bajareque">Vivienda de adobe o teja</option>
                  <option value="Vehículo">En un vehículo en movimiento</option>
                  <option value="Exterior">En la calle / al aire libre</option>
                </select>
              </div>

              {/* Comments */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observaciones (opcional):
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Se cayeron adornos de la repisa, se escuchó un fuerte retumbo..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-900 shadow-sm"
                />
              </div>

              <button
                id="btn-submit-community-report"
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Registrar Reporte</span>
              </button>
            </form>
          )}
        </div>

        {/* Live Community Feed Column */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs uppercase font-bold text-slate-700 tracking-wider">
              Reportes Comunitarios Recientes ({reports.length})
            </h3>
            <span className="text-[11px] text-green-700 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              En Vivo
            </span>
          </div>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {rep.department} • <span className="text-slate-600 font-medium">{rep.municipality}</span>
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {rep.buildingType}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getIntensityBadge(
                      rep.feltIntensity
                    )}`}
                  >
                    {rep.feltIntensity}
                  </span>
                </div>

                {rep.comments && (
                  <p className="mt-2 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic leading-relaxed">
                    "{rep.comments}"
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100 font-medium">
                  <span>{rep.mercalliEstimated}</span>
                  <span>{getRelativeTimeSpanish(rep.timestamp)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

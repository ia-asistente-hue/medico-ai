import React from 'react';

interface ModeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  planTier: string;
  recordingsUsed: number;
  recordingLimit: number;
  patientName: string;
  onSelectVoice: () => void;
  onSelectManual: () => void;
  isLimitReached: boolean;
}

export const ModeSelectorModal: React.FC<ModeSelectorModalProps> = ({
  isOpen,
  onClose,
  planTier,
  recordingsUsed,
  recordingLimit,
  patientName,
  onSelectVoice,
  onSelectManual,
  isLimitReached,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 border border-slate-100">
        <div>
          {planTier !== 'free_pro' && (
            <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#0052FF] mb-2">
              Plan {planTier.toUpperCase()} - {recordingsUsed} / {recordingLimit} usadas
            </span>
          )}
          <h3 className="text-base font-bold text-slate-900">¿Cómo deseas realizar esta consulta?</h3>
          <p className="text-xs text-slate-500 mt-1">
            Selecciona el método de captura para la nota SOAP y la receta médica de <span className="font-semibold text-slate-700">{patientName}</span>.
          </p>
        </div>

        <div className="space-y-3">
          {/* Opción 1: Nota de Voz */}
          <button
            type="button"
            disabled={isLimitReached}
            onClick={onSelectVoice}
            className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 group ${isLimitReached
                ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                : 'border-blue-100 bg-blue-50/40 hover:bg-blue-50/80 hover:border-blue-300 cursor-pointer'
              }`}
          >
            <div className="h-9 w-9 rounded-xl bg-blue-100 text-[#0052FF] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              🎙️
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                Nota de Voz Asistida por IA
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-[#0052FF]">
                  Consume 1 crédito
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Graba la consulta médica y MedikAI generará automáticamente el SOAP y la receta.
              </p>
            </div>
          </button>

          {/* Opción 2: Registro Manual */}
          <button
            type="button"
            onClick={onSelectManual}
            className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
              ✏️
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                Registro Manual
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Ilimitado / Gratis
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Redacta la nota SOAP y la receta manualmente sin consumir tus créditos de voz.
              </p>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
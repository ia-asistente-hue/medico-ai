// components/consultation/AudioRecorder.tsx
'use client';

interface AudioRecorderProps {
  isRecording: boolean;
  loading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  patientName?: string;
  patientDob?: string;
}

export default function AudioRecorder({
  isRecording,
  loading,
  onStartRecording,
  onStopRecording,
  patientName,
  patientDob,
}: AudioRecorderProps) {
  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      {/* Tarjeta de Resumen del Paciente Activo */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-[#0052FF] font-bold text-sm">
            {patientName ? patientName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'P'}
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Paciente Activo</span>
            <strong className="text-base font-bold text-slate-800">
              {patientName || 'Sin paciente seleccionado'}
            </strong>
          </div>
        </div>
        {patientDob && (
          <div className="text-right text-xs">
            <span className="text-slate-400 block">F. Nacimiento</span>
            <span className="font-medium text-slate-700">{patientDob}</span>
          </div>
        )}
      </div>

      {/* Módulo de Grabación Scribe AI */}
      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center space-y-6">
        {!loading && (
          <div className="flex flex-col items-center justify-center gap-4">
            {!isRecording ? (
              <>
                <button
                  onClick={onStartRecording}
                  className="group relative flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition-all hover:scale-105 hover:bg-rose-600 active:scale-95"
                >
                  <span className="absolute -inset-1 animate-ping rounded-full bg-rose-400 opacity-25"></span>
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 016 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Haz clic para iniciar la escucha de voz</h3>
                  <p className="text-xs text-slate-500 mt-1">Dicta la anamnesis, exploración y tratamiento en lenguaje natural</p>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={onStopRecording}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl transition-all hover:bg-slate-800 animate-pulse"
                >
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 mb-2">
                    <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
                    Tomando Notas de la Consulta Médica...
                  </div>
                  <p className="text-xs text-slate-500">Haz clic en el botón negro para finalizar y estructurar la nota SOAP</p>
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="py-8 space-y-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-[#0052FF]">
              <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Procesando audio con MedikAI...</h4>
              <p className="text-xs text-slate-500">Estructurando borrador clínico conforme a la NOM-004-SSA3-2012</p>
              <p className="text-xs text-slate-500">- Valide la información</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
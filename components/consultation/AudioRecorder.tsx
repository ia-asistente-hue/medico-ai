// components/consultation/AudioRecorder.tsx
'use client';

import { useState } from 'react';

interface AudioRecorderProps {
  isRecording: boolean;
  loading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  patientName?: string;
  patientDob?: string;
}

export default function AudioRecorder({
  isRecording,
  loading,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  patientName,
  patientDob,
}: AudioRecorderProps) {
  const [isPaused, setIsPaused] = useState(false);

  const handlePauseToggle = () => {
    if (isPaused) {
      setIsPaused(false);
      if (onResumeRecording) onResumeRecording();
    } else {
      setIsPaused(true);
      if (onPauseRecording) onPauseRecording();
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      {/* Tarjeta de Resumen del Paciente Activo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-100 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#0052FF] font-bold text-sm">
            {patientName ? patientName.split(' ').map(n => n[0]).join('').slice(0, 2) : 'P'}
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Paciente Activo</span>
            <strong className="text-sm sm:text-base font-bold text-slate-800">
              {patientName || 'Sin paciente seleccionado'}
            </strong>
          </div>
        </div>
        {patientDob && (
          <div className="text-left sm:text-right text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
            <span className="text-slate-400 block">F. Nacimiento</span>
            <span className="font-medium text-slate-700">{patientDob}</span>
          </div>
        )}
      </div>

      {/* Módulo de Toma de Notas Médicas AI con feedback visual activo */}
      <div className={`rounded-2xl border-2 p-6 sm:p-8 text-center space-y-6 transition-all duration-300 ${
        isRecording && !isPaused 
          ? 'border-emerald-400 bg-emerald-50/40 shadow-lg shadow-emerald-500/5' 
          : 'border-dashed border-slate-200 bg-slate-50/50'
      }`}>
        {!loading && (
          <div className="flex flex-col items-center justify-center gap-5">
            {!isRecording ? (
              <>
                <button
                  onClick={() => {
                    setIsPaused(false);
                    onStartRecording();
                  }}
                  className="group relative flex h-24 w-24 items-center justify-center rounded-full bg-[#0052FF] text-white shadow-xl shadow-blue-500/30 transition-all hover:scale-105 hover:bg-[#0043D6] active:scale-95"
                >
                  <span className="absolute -inset-2 animate-ping rounded-full bg-blue-400 opacity-20"></span>
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 016 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Iniciar Toma de Notas Médicas</h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                    Dicta la anamnesis, exploración física y tratamiento en lenguaje natural.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* SIMULADOR DE ONDAS DE AUDIO ACTIVAS (Garantiza tranquilidad visual) */}
                {!isPaused && (
                  <div className="flex items-center gap-1.5 h-10 px-4 bg-emerald-100/80 rounded-full border border-emerald-200 mb-1">
                    <span className="w-1 h-3 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1 h-7 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1 h-5 bg-emerald-600 rounded-full animate-bounce"></span>
                    <span className="w-1 h-8 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.2s]"></span>
                    <span className="w-1 h-4 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.4s]"></span>
                    <span className="w-1 h-6 bg-emerald-600 rounded-full animate-bounce [animation-delay:-0.1s]"></span>
                    <span className="text-[11px] font-bold text-emerald-800 ml-2 tracking-wide uppercase">Grabando Audio</span>
                  </div>
                )}

                {/* Controles de Pausa y Finalización */}
                <div className="flex items-center justify-center gap-6 mt-1">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={handlePauseToggle}
                      className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md transition-all ${
                        isPaused ? 'bg-amber-500 hover:bg-amber-600 scale-105' : 'bg-slate-700 hover:bg-slate-800'
                      }`}
                      title={isPaused ? 'Reanudar' : 'Pausar'}
                    >
                      {isPaused ? (
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      ) : (
                        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                      )}
                    </button>
                    <span className="text-[10px] font-semibold text-slate-500 mt-1">{isPaused ? 'Reanudar' : 'Pausar'}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <button
                      onClick={onStopRecording}
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-500 text-white shadow-xl shadow-rose-500/30 transition-all hover:bg-rose-600 hover:scale-105 active:scale-95"
                      title="Finalizar y estructurar nota"
                    >
                      <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </svg>
                    </button>
                    <span className="text-[10px] font-bold text-rose-600 mt-1">Finalizar Nota</span>
                  </div>
                </div>

                <div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold mb-1 ${
                    isPaused ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-emerald-600 animate-ping'}`}></span>
                    {isPaused ? 'Toma de Notas Pausada' : 'Escuchando consulta médica en vivo...'}
                  </div>
                  <p className="text-xs text-slate-500">
                    {isPaused 
                      ? 'El sistema está en pausa. Puedes conversar en privado.' 
                      : 'Habla con naturalidad. MedikAI está capturando los hallazgos.'}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {loading && (
          <div className="py-8 space-y-4">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
              <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">Procesando nota clínica con MedikAI...</h4>
              <p className="text-xs text-slate-500">Estructurando borrador clínico conforme a la NOM-004-SSA3-2012</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
//components/consultation/AudioRecorder.tsx

'use client';

interface AudioRecorderProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingSeconds: number;
  maxSeconds: number;
  loading: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  patientName?: string;
  patientDob?: string;
}

export default function AudioRecorder({
  isRecording,
  isPaused,
  recordingSeconds,
  maxSeconds,
  loading,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  patientName = 'Maria Lopez Perez',
  patientDob = '1980-04-12',
}: AudioRecorderProps) {
  // Iniciales del paciente (ej: Maria Lopez Perez -> ML)
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Formato MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100 font-sans">
      
      {/* TARJETA DEL PACIENTE (Tu diseño original) */}
      <div className="flex items-center justify-between rounded-2xl bg-[#F8FAFC] p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DCE8FF] text-[#0052FF] font-bold text-sm">
            {getInitials(patientName)}
          </div>
          <div>
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block">
              PACIENTE ACTIVO
            </span>
            <h2 className="text-base font-bold text-slate-900">{patientName}</h2>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-medium text-slate-400 block">F. Nacimiento</span>
          <span className="text-xs font-semibold text-slate-800">{patientDob}</span>
        </div>
      </div>

      {/* ESTADO 1: CARGANDO / PROCESANDO CON IA */}
      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-[#0052FF] border-t-transparent"></div>
          <h3 className="text-base font-bold text-slate-800">Procesando nota médica...</h3>
          <p className="text-xs text-slate-400">MedikAI está estructurando la consulta en formato SOAP.</p>
        </div>
      ) : !isRecording ? (
        
        /* ESTADO 2: INICIAL / LISTO PARA GRABAR (Tu 1ra imagen) */
        <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          
          <div className="relative mb-6 flex items-center justify-center">
            {/* Círculo tenue exterior */}
            <div className="h-32 w-32 rounded-full bg-[#EEF4FF] flex items-center justify-center">
              {/* Botón azul central */}
              <button
                onClick={onStartRecording}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0052FF] text-white shadow-lg shadow-blue-500/20 hover:scale-105 transition-all"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">Iniciar Toma de Notas Médicas</h3>
          <p className="text-xs text-slate-400 max-w-sm mb-3">
            Dicta la anamnesis, exploración física y tratamiento en lenguaje natural.
          </p>
          
          <span className="text-[11px] text-slate-400 font-medium bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
            Límite máximo recomendado: 10:00 min
          </span>
        </div>
      ) : (
        
        /* ESTADO 3: GRABANDO AUDIO (Tu 2da imagen + Tiempo imperceptible) */
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50/10 p-10 text-center flex flex-col items-center justify-center space-y-6">
          
          {/* Badge verde elegante con tiempo sutil */}
          <div className="inline-flex items-center gap-2.5 bg-[#D1FADF]/70 text-[#027A48] px-4 py-2 rounded-full text-xs font-semibold">
            {/* Icono animado de micrófono/onda */}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            </svg>
            <span>{isPaused ? 'GRABACIÓN PAUSADA' : 'GRABANDO AUDIO'}</span>
            <span className="border-l border-[#027A48]/20 pl-2.5 font-mono text-xs">
              {formatTime(recordingSeconds)} / {formatTime(maxSeconds)}
            </span>
          </div>

          {/* Botones circulares exactos (Pausar y Finalizar) */}
          <div className="flex items-center justify-center gap-8 py-2">
            
            {/* Botón Pausar */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={isPaused ? onResumeRecording : onPauseRecording}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#334155] text-white shadow-md hover:bg-[#1E293B] transition-all"
              >
                {isPaused ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                )}
              </button>
              <span className="text-xs font-medium text-slate-500">
                {isPaused ? 'Reanudar' : 'Pausar'}
              </span>
            </div>

            {/* Botón Finalizar Nota */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={onStopRecording}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FF2E55] text-white shadow-lg shadow-red-500/25 hover:bg-[#E02447] transition-all"
              >
                <div className="h-6 w-6 rounded-xs bg-white"></div>
              </button>
              <span className="text-xs font-bold text-[#FF2E55]">Finalizar Nota</span>
            </div>

          </div>

          {/* Mensaje inferior suave */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-[#ECFDF3] text-[#027A48] px-3.5 py-1 rounded-full text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-[#12B76A] animate-ping" />
              Escuchando consulta médica en vivo...
            </div>
            <p className="text-xs text-slate-400">
              Habla con naturalidad. MedikAI está capturando los hallazgos.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
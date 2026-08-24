// app/consulta/nueva/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

// Importación de componentes modulares
import AudioRecorder from '@/components/consultation/AudioRecorder';
import SoapEditor from '@/components/consultation/SoapEditor';
import PrescriptionBuilder from '@/components/prescription/PrescriptionBuilder';

// Configuración de límites de grabación
const MAX_RECORDING_SECONDS = 600; // 10 minutos máximo por grabación

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
}

interface Medicamento {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
}

interface SoapFormState {
  subjetivo: string;
  objetivo: string;
  analisis: string;
  plan: string;
}

const formatSection = (content: any): string => {
  if (!content) return 'No reportado.';
  if (typeof content === 'string') {
    try {
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        return formatSection(JSON.parse(content));
      }
    } catch (e) {
      return content;
    }
    return content;
  }
  if (Array.isArray(content)) return content.map((item) => formatSection(item)).join(', ');
  if (typeof content === 'object') {
    return Object.entries(content)
      .map(([key, val]) => `• ${key.replace(/_/g, ' ')}: ${formatSection(val)}`)
      .join('\n');
  }
  return String(content);
};

function NuevaConsultaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const patientIdFromUrl = searchParams.get('patient_id');
  const autoStart = searchParams.get('auto_start') === 'true';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  
  // Estados para el buscador interactivo de pacientes
  const [patientQuery, setPatientQuery] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [editableSoap, setEditableSoap] = useState<SoapFormState | null>(null);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [instruccionesReceta, setInstruccionesReceta] = useState('');
  const [nuevoMed, setNuevoMed] = useState<Medicamento>({
    medicamento: '',
    dosis: '',
    frecuencia: '',
    duracion: '',
    indicaciones: '',
  });

  // Filtrar pacientes en tiempo real según lo que escriba el médico
  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    return fullName.includes(patientQuery.toLowerCase());
  });

  // Cerrar el dropdown del buscador al hacer clic fuera
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    async function initData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (doctor) {
        setDoctorId(doctor.id);
        await cargarPacientes(doctor.id, patientIdFromUrl);
      }
    }
    initData();
  }, [patientIdFromUrl]);

  // Manejo del cronómetro de grabación y auto-detención al límite (10 min)
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording(); 
            setErrorMessage('Se alcanzó el límite máximo de 10 minutos por grabación para garantizar el procesamiento rápido.');
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording, isPaused]);

  // AUTO-INICIAR CONSULTA SI VIENE DESDE EL EXPEDIENTE DEL PACIENTE
  useEffect(() => {
    async function autoIniciar() {
      if (autoStart && selectedPatient && doctorId && !encounterId) {
        setErrorMessage(null);
        const { data: encounter, error } = await supabase
          .from('encounters')
          .insert([{ doctor_id: doctorId, patient_id: selectedPatient.id, status: 'in_progress' }])
          .select()
          .single();

        if (error) {
          setErrorMessage('Error al iniciar la consulta automáticamente: ' + error.message);
        } else {
          setEncounterId(encounter.id);
        }
      }
    }
    autoIniciar();
  }, [autoStart, selectedPatient, doctorId, encounterId]);

  const cargarPacientes = async (docId: string, autoSelectId?: string | null) => {
    const { data: patientList } = await supabase
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, gender, blood_type, allergies, chronic_conditions')
      .eq('doctor_id', docId)
      .order('created_at', { ascending: false });

    if (patientList) {
      setPatients(patientList);
      if (autoSelectId) {
        const found = patientList.find((p) => p.id === autoSelectId);
        if (found) {
          setSelectedPatient(found);
          setPatientQuery(`${found.first_name} ${found.last_name}`);
        }
      }
    }
  };

  const iniciarEncuentro = async () => {
    if (!selectedPatient || !doctorId) {
      setErrorMessage('Por favor selecciona o registra un paciente.');
      return;
    }
    setErrorMessage(null);

    const { data: encounter, error } = await supabase
      .from('encounters')
      .insert([{ doctor_id: doctorId, patient_id: selectedPatient.id, status: 'in_progress' }])
      .select()
      .single();

    if (error) setErrorMessage('Error al iniciar la consulta: ' + error.message);
    else setEncounterId(encounter.id);
  };

  const startRecording = async () => {
    try {
      setRecordingSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => audioChunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        
        if (audioBlob.size > 20 * 1024 * 1024) {
          setErrorMessage('El audio grabado supera los 20MB. Intente hacer grabaciones más cortas o pausadas.');
          return;
        }

        await procesarAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsPaused(false);
    } catch (err) {
      setErrorMessage('No se pudo acceder al micrófono.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const procesarAudio = async (audioBlob: Blob) => {
    if (!encounterId) return;
    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');
    formData.append('encounter_id', encounterId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/transcribir', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error procesando la transcripción');

      setEditableSoap({
        subjetivo: formatSection(data.soap.subjetivo),
        objetivo: formatSection(data.soap.objetivo),
        analisis: formatSection(data.soap.analisis),
        plan: formatSection(data.soap.plan),
      });

      const medsResponded = data.prescription?.medications || data.prescription?.medication_list || [];
      const instResponded = data.prescription?.instructions || '';

      setMedicamentos(medsResponded);
      setInstruccionesReceta(instResponded);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarNota = async () => {
    if (!encounterId || !editableSoap || !doctorId || !selectedPatient) return;
    setSaving(true);
    setErrorMessage(null);

    try {
      const { error: soapError } = await supabase.from('soap_notes').upsert(
        [
          {
            encounter_id: encounterId,
            subjective: editableSoap.subjetivo,
            objective: editableSoap.objetivo,
            assessment: editableSoap.analisis,
            plan: editableSoap.plan,
          },
        ],
        { onConflict: 'encounter_id' }
      );

      if (soapError) throw soapError;

      if (medicamentos.length > 0) {
        const { data: existingRx } = await supabase
          .from('prescriptions')
          .select('id')
          .eq('encounter_id', encounterId)
          .maybeSingle();

        if (existingRx) {
          const { error: rxUpdateError } = await supabase
            .from('prescriptions')
            .update({
              medications: medicamentos,
              instructions: instruccionesReceta || null,
            })
            .eq('id', existingRx.id);

          if (rxUpdateError) throw rxUpdateError;
        } else {
          const { error: rxInsertError } = await supabase.from('prescriptions').insert([
            {
              encounter_id: encounterId,
              doctor_id: doctorId,
              patient_id: selectedPatient.id,
              medications: medicamentos,
              instructions: instruccionesReceta || null,
              prescription_code: `RX-${Math.floor(100000 + Math.random() * 900000)}`,
            },
          ]);
          if (rxInsertError) throw rxInsertError;
        }
      }

      const { error: encounterError } = await supabase
        .from('encounters')
        .update({ status: 'completed' })
        .eq('id', encounterId);

      if (encounterError) throw encounterError;

      router.push(`/consulta/${encounterId}`);
    } catch (err: any) {
      setErrorMessage('Error al guardar la nota y receta: ' + err.message);
      setSaving(false);
    }
  };

  const currentStep = !encounterId ? 1 : !editableSoap ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur-md px-4 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MedikAI Logo" className="h-8 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/perfil"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-[#0052FF] transition-all"
            >
              Mi Perfil
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div className={`p-2.5 rounded-xl transition-all ${currentStep === 1 ? 'bg-blue-50 text-[#0052FF]' : 'text-slate-400'}`}>
              <span className="block sm:inline">1. </span>Paciente
            </div>
            <div className={`p-2.5 rounded-xl transition-all ${currentStep === 2 ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-400'}`}>
              <span className="block sm:inline">2. </span>Toma de Notas
            </div>
            <div className={`p-2.5 rounded-xl transition-all ${currentStep === 3 ? 'bg-blue-50 text-[#0052FF]' : 'text-slate-400'}`}>
              <span className="block sm:inline">3. </span>SOAP y Receta
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
            <strong>Atención: </strong>
            {errorMessage}
          </div>
        )}

        {/* PASO 1 - SELECTOR CON BÚSQUEDA Y "VER EXPEDIENTE" */}
        {!encounterId && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Seleccionar Paciente de la Consulta</h2>
                <p className="text-xs text-slate-500 mt-0.5">Identifica el paciente para vincular el expediente clínico.</p>
              </div>
              <Link
                href="/pacientes/nuevo"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-[#0052FF] hover:bg-blue-100 transition-colors"
              >
                + Nuevo Paciente
              </Link>
            </div>

            <div className="space-y-4">
              <div className="relative" ref={patientDropdownRef}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Buscar o seleccionar paciente registrado
                  </label>
                  {selectedPatient ? (
                    <Link
                      href={`/pacientes/${selectedPatient.id}`}
                      className="text-xs font-semibold text-[#0052FF] hover:underline flex items-center gap-1 transition-all"
                    >
                      Ver Expediente ↗
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400 select-none">Ver Expediente</span>
                  )}
                </div>

                <div 
                  onClick={() => setIsPatientDropdownOpen(true)}
                  className={`flex items-center justify-between w-full rounded-xl border bg-slate-50/50 px-4 py-3 text-sm text-[#1A202C] cursor-pointer transition-all ${
                    selectedPatient 
                      ? 'border-blue-300 bg-blue-50/30 ring-2 ring-[#0052FF]/10' 
                      : 'border-slate-200 focus-within:border-[#0052FF] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0052FF]/10'
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    {selectedPatient && (
                      <span className="flex h-2 w-2 rounded-full bg-[#0052FF]"></span>
                    )}
                    <input
                      type="text"
                      value={patientQuery}
                      onChange={(e) => {
                        setPatientQuery(e.target.value);
                        setIsPatientDropdownOpen(true);
                        if (selectedPatient) setSelectedPatient(null);
                      }}
                      placeholder="-- Escribe para buscar o selecciona de la lista --"
                      className="w-full bg-transparent outline-none placeholder-slate-400 text-slate-700 font-medium cursor-text"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedPatient && (
                      <span className="text-xs font-semibold text-[#0052FF] bg-blue-100/70 px-2 py-0.5 rounded-md">
                        Seleccionado
                      </span>
                    )}
                    <svg className={`h-4 w-4 text-slate-400 transition-transform ${isPatientDropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Dropdown flotante con los resultados filtrados */}
                {isPatientDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 p-1">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient) => {
                        const fullName = `${patient.first_name} ${patient.last_name}`;
                        return (
                          <div
                            key={patient.id}
                            onClick={() => {
                              setSelectedPatient(patient);
                              setPatientQuery(fullName);
                              setIsPatientDropdownOpen(false);
                            }}
                            className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0052FF] rounded-lg cursor-pointer transition-colors"
                          >
                            <span className="font-medium">{fullName}</span>
                            {selectedPatient?.id === patient.id && (
                              <svg className="h-4 w-4 text-[#0052FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="px-4 py-3 text-xs text-slate-400 text-center">
                        No se encontraron pacientes con ese nombre
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedPatient}
                onClick={iniciarEncuentro}
                className="w-full rounded-xl bg-[#0052FF] text-white py-3 text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-600 disabled:bg-slate-300 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Iniciar Consulta Médica →
              </button>
            </div>
          </div>
        )}

        {/* PASO 2 */}
        {encounterId && !editableSoap && (
          <AudioRecorder
            isRecording={isRecording}
            isPaused={isPaused}
            recordingSeconds={recordingSeconds}
            maxSeconds={MAX_RECORDING_SECONDS}
            loading={loading}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onPauseRecording={pauseRecording}
            onResumeRecording={resumeRecording}
            patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : undefined}
            patientDob={selectedPatient?.date_of_birth}
          />
        )}

        {/* PASO 3 */}
        {editableSoap && (
          <div className="space-y-6">
            <SoapEditor
              editableSoap={editableSoap}
              onUpdateSoap={(field, val) => setEditableSoap({ ...editableSoap, [field]: val })}
            />
            <PrescriptionBuilder
              medicamentos={medicamentos}
              nuevoMed={nuevoMed}
              instruccionesReceta={instruccionesReceta}
              onUpdateNuevoMed={(field, val) => setNuevoMed({ ...nuevoMed, [field]: val })}
              onAgregarMedicamento={() => {
                if (!nuevoMed.medicamento.trim() || !nuevoMed.dosis.trim()) return;
                setMedicamentos([...medicamentos, nuevoMed]);
                setNuevoMed({ medicamento: '', dosis: '', frecuencia: '', duracion: '', indicaciones: '' });
              }}
              onEliminarMedicamento={(idx) => setMedicamentos(medicamentos.filter((_, i) => i !== idx))}
              onUpdateInstrucciones={setInstruccionesReceta}
              onGuardarNota={handleGuardarNota}
              saving={saving}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default function NuevaConsultaPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-slate-500">Cargando consulta...</div>}>
      <NuevaConsultaContent />
    </Suspense>
  );
}
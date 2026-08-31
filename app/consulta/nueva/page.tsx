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
import { getDecryptedPatientListAction } from '@/app/actions/patients';
import { guardarRecetaSeguraAction } from '@/app/actions/prescriptions';

// Configuración de límites de grabación
const MAX_RECORDING_SECONDS = 600; // 10 minutos máximo por grabación

interface Patient {
  id: string;
  chart_number?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: 'masculino' | 'femenino' | 'otro' | null;
  blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  allergies?: string;
  chronic_conditions?: string;
  emergency_name?: string;
  emergency_phone?: string;
  emergency_relationship?: string;
  phone?: string | null;
  email?: string | null;
  street_address?: string | null;
  curp?: string | null;
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

  // Estados para el Modal de Registro de Paciente
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'masculino' as 'masculino' | 'femenino' | 'otro',
    phone: '',
    email: '',
    curp: '',
    blood_type: '' as '' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-',
    street_address: '',
  });

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

  // Filtrar pacientes en tiempo real por nombre completo, CURP o Folio (chart_number)
  const filteredPatients = patients.filter((patient) => {
    const fullName = `${patient.first_name} ${patient.last_name}`.toLowerCase();
    const chart = (patient.chart_number || '').toLowerCase();
    const curp = (patient.curp || '').toLowerCase();
    const query = patientQuery.toLowerCase();
    return fullName.includes(query) || chart.includes(query) || curp.includes(query);
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

  // Cronómetro de grabación
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording(); 
            setErrorMessage('Se alcanzó el límite máximo de 10 minutos por grabación.');
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

  // Auto-iniciar consulta si viene redirigido desde el expediente
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
    try {
      const patientList = await getDecryptedPatientListAction(docId);

      if (patientList) {
        setPatients(patientList);
        if (autoSelectId) {
          const found = patientList.find((p: Patient) => p.id === autoSelectId);
          if (found) {
            setSelectedPatient(found);
            setPatientQuery(`${found.first_name} ${found.last_name}`);
          }
        }
      }
    } catch (err: any) {
      setErrorMessage('Error al obtener lista de pacientes: ' + err.message);
    }
  };

  const handleCrearPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !newPatientData.first_name.trim() || !newPatientData.last_name.trim() || !newPatientData.date_of_birth) return;

    setCreatingPatient(true);
    setErrorMessage(null);

    try {
      const payload: Record<string, any> = {
        doctor_id: doctorId,
        first_name: newPatientData.first_name.trim(),
        last_name: newPatientData.last_name.trim(),
        date_of_birth: newPatientData.date_of_birth,
        gender: newPatientData.gender,
        chart_number: '',
        phone: newPatientData.phone.trim() || null,
        email: newPatientData.email.trim() || null,
        curp: newPatientData.curp.trim().toUpperCase() || '',
        street_address: newPatientData.street_address.trim() || '',
      };

      if (newPatientData.blood_type) {
        payload.blood_type = newPatientData.blood_type;
      }

      const { data: newPatient, error } = await supabase
        .from('patients')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      await cargarPacientes(doctorId, newPatient.id);
      setIsNewPatientModalOpen(false);
      
      setNewPatientData({
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: 'masculino',
        phone: '',
        email: '',
        curp: '',
        blood_type: '',
        street_address: '',
      });
    } catch (err: any) {
      setErrorMessage('Error al registrar paciente: ' + err.message);
    } finally {
      setCreatingPatient(false);
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
          setErrorMessage('El audio grabado supera los 20MB. Intente hacer grabaciones más cortas.');
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
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/transcribir', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token || ''}` },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error procesando la transcripción');

      if (data.soap) {
        setEditableSoap({
          subjetivo: formatSection(data.soap.subjetivo),
          objetivo: formatSection(data.soap.objetivo),
          analisis: formatSection(data.soap.analisis),
          plan: formatSection(data.soap.plan),
        });
      }

      const rawMeds = data.prescription?.medications || data.prescription?.medication_list || data.medications || [];
      
      const medicamentosPlanos = rawMeds.map((med: any) => ({
        medicamento: typeof med === 'string' ? med : (med.medicamento || med.nombre || med.name || ''),
        dosis: med.dosis || med.dosage || '',
        frecuencia: med.frecuencia || med.frequency || '',
        duracion: med.duracion || med.duration || '',
        indicaciones: med.indicaciones || med.instructions || '',
      }));

      setMedicamentos(medicamentosPlanos);
      setInstruccionesReceta(data.prescription?.instructions || data.instructions || '');

    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

// Estados para manejar las confirmaciones personalizadas sin usar window.confirm
const [pendingMed, setPendingMed] = useState<any>(null);
const [showEmptyRecipeModal, setShowEmptyRecipeModal] = useState(false);
const [showFinalReviewModal, setShowFinalReviewModal] = useState(false);
const [medicamentosPendientesFinales, setMedicamentosPendientesFinales] = useState<any[]>([]);



const handleGuardarNota = async () => {
    if (!encounterId || !editableSoap || !doctorId || !selectedPatient) return;

    let medicamentosFinales = [...medicamentos];

    // 🛡️ PASO 1: Validar si dejó texto a medias en los inputs
    if (nuevoMed.medicamento.trim() || nuevoMed.dosis.trim()) {
      setPendingMed(nuevoMed);
      return; // Detenemos y abrimos el modal del Paso 1
    }

    continuarValidacionReceta(medicamentosFinales);
  };

  // Función auxiliar para continuar tras el paso 1
  const continuarValidacionReceta = (medicamentosFinales: any[]) => {
    setMedicamentosPendientesFinales(medicamentosFinales);

    // 🛡️ PASO 2: Validar si la receta va completamente vacía
    if (medicamentosFinales.length === 0) {
      setShowEmptyRecipeModal(true);
      return;
    }

    // 🛡️ PASO 3: Confirmación obligatoria de revisión de IA
    setShowFinalReviewModal(true);
  };

  // Función final que ejecuta el guardado en Supabase
  const ejecutarGuardadoDefinitivo = async (medicamentosFinales: any[]) => {
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

      if (medicamentosFinales.length > 0) {
        await guardarRecetaSeguraAction({
          encounterId,
          doctorId,
          patientId: selectedPatient.id,
          medicamentos: medicamentosFinales,
          instruccionesReceta,
        });
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
      {/* HEADER MEJORADO CON LOGO ENLAZADO */}
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-2xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0052FF] group-hover:bg-blue-100 transition-colors p-1">
              <img src="/logo.png" alt="MedikAI Logo" className="h-full w-auto object-contain" />
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-sm sm:text-base">
              Medik<span className="text-[#0052FF]">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/perfil"
              className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-[#0052FF] transition-all shadow-2xs"
            >
              Mi Perfil
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/login');
              }}
              className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-2xs cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* BARRA DE PROGRESO / STEPPER MODERNO */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between max-w-2xl mx-auto relative">
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 z-0"></div>

            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-2xs ${
                currentStep > 1 
                  ? 'bg-emerald-500 text-white' 
                  : currentStep === 1 
                  ? 'bg-[#0052FF] text-white ring-4 ring-blue-50' 
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {currentStep > 1 ? '✓' : '1'}
              </div>
              <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-[#0052FF]' : currentStep > 1 ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}>
                Paciente
              </span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-2xs ${
                currentStep > 2 
                  ? 'bg-emerald-500 text-white' 
                  : currentStep === 2 
                  ? 'bg-[#0052FF] text-white ring-4 ring-blue-50' 
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {currentStep > 2 ? '✓' : '2'}
              </div>
              <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-[#0052FF]' : currentStep > 2 ? 'text-emerald-700 font-medium' : 'text-slate-700'}`}>
                Toma de Notas
              </span>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-2 bg-white px-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-2xs ${
                currentStep === 3 
                  ? 'bg-[#0052FF] text-white ring-4 ring-blue-50' 
                  : 'bg-slate-100 text-slate-700'
              }`}>
                3
              </div>
              <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-[#0052FF]' : 'text-slate-700'}`}>
                SOAP y Receta
              </span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
            <strong>Atención: </strong>
            {errorMessage}
          </div>
        )}

        {/* PASO 1 - BÚSQUEDA Y SELECCIÓN */}
        {!encounterId && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Seleccionar Paciente de la Consulta</h2>
                <p className="text-xs text-slate-500 mt-0.5">Identifica el paciente para vincular el expediente clínico.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPatientModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-[#0052FF] hover:bg-blue-100 transition-colors cursor-pointer"
              >
                + Nuevo Paciente
              </button>
            </div>

            <div className="space-y-4">
              {selectedPatient ? (
                /* TARJETA DE PACIENTE SELECCIONADO OPTIMIZADA (UX MÉDICA) */
                <div className="space-y-4">
                  <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Paciente listo para consulta
                        </span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setPatientQuery('');
                          setIsPatientDropdownOpen(true);
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                      >
                        Cambiar paciente ✕
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <h4 className="text-base font-bold text-slate-800">
                            {selectedPatient.first_name} {selectedPatient.last_name}
                          </h4>
                          {selectedPatient.chart_number && (
                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                              {selectedPatient.chart_number}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {selectedPatient.curp ? `CURP: ${selectedPatient.curp}` : 'Expediente clínico sincronizado'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/pacientes/${selectedPatient.id}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-[#0052FF] hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          Ver Expediente ↗
                        </Link>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={iniciarEncuentro}
                    className="w-full rounded-xl bg-[#0052FF] text-white py-3.5 text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all cursor-pointer"
                  >
                    Iniciar Consulta Médica con {selectedPatient.first_name} →
                  </button>
                </div>
              ) : (
                /* BUSCADOR INTERACTIVO (CUANDO NO HAY PACIENTE SELECCIONADO) */
                <div className="space-y-4">
                  <div className="relative" ref={patientDropdownRef}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                      Buscar o seleccionar paciente registrado
                    </label>

                    <div 
                      onClick={() => setIsPatientDropdownOpen(true)}
                      className="flex items-center gap-2.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-[#1A202C] cursor-pointer focus-within:border-[#0052FF] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0052FF]/10 transition-all"
                    >
                      <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={patientQuery}
                        onChange={(e) => {
                          setPatientQuery(e.target.value);
                          setIsPatientDropdownOpen(true);
                        }}
                        placeholder="Escribe el nombre, CURP o folio del paciente..."
                        className="w-full bg-transparent outline-none placeholder-slate-400 text-slate-700 font-medium cursor-text"
                      />
                    </div>

                    {/* Dropdown flotante de resultados */}
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
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{fullName}</span>
                                  {patient.chart_number && (
                                    <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {patient.chart_number}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-3 text-xs text-slate-400 text-center">
                            No se encontraron pacientes
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
              )}
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

      {/* MODAL DE NUEVO PACIENTE */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-800 mb-0.5">Registrar Nuevo Paciente</h3>
            <p className="text-xs text-slate-500 mb-4">Los campos marcados con (*) son obligatorios. El folio se auto-generará.</p>

            <form onSubmit={handleCrearPaciente} className="space-y-3 text-left">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre(s) *</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.first_name}
                    onChange={(e) => setNewPatientData({ ...newPatientData, first_name: e.target.value })}
                    placeholder="Ej. María Carmen"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Apellido(s) *</label>
                  <input
                    type="text"
                    required
                    value={newPatientData.last_name}
                    onChange={(e) => setNewPatientData({ ...newPatientData, last_name: e.target.value })}
                    placeholder="Ej. López Hernández"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">F. Nacimiento *</label>
                  <input
                    type="date"
                    required
                    value={newPatientData.date_of_birth}
                    onChange={(e) => setNewPatientData({ ...newPatientData, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Género</label>
                  <select
                    value={newPatientData.gender}
                    onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:border-[#0052FF] focus:outline-none bg-white"
                  >
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Grupo Sanguíneo</label>
                  <select
                    value={newPatientData.blood_type}
                    onChange={(e) => setNewPatientData({ ...newPatientData, blood_type: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs focus:border-[#0052FF] focus:outline-none bg-white"
                  >
                    <option value="">Desconocido</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={newPatientData.phone}
                    onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                    placeholder="Ej. 5512345678"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={newPatientData.email}
                    onChange={(e) => setNewPatientData({ ...newPatientData, email: e.target.value })}
                    placeholder="paciente@correo.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">CURP</label>
                  <input
                    type="text"
                    maxLength={18}
                    value={newPatientData.curp}
                    onChange={(e) => setNewPatientData({ ...newPatientData, curp: e.target.value })}
                    placeholder="18 caracteres"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono uppercase focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Domicilio</label>
                  <input
                    type="text"
                    value={newPatientData.street_address}
                    onChange={(e) => setNewPatientData({ ...newPatientData, street_address: e.target.value })}
                    placeholder="Calle, Número, Colonia"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-[#0052FF] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewPatientModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingPatient}
                  className="rounded-xl bg-[#0052FF] text-white px-4 py-2 text-xs font-semibold hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {creatingPatient ? 'Guardando...' : 'Guardar y Seleccionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* MODAL DE NUEVO PACIENTE */}
      {isNewPatientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          {/* ... contenido del modal de paciente ... */}
        </div>
      )}

      {/* 🛡️ PEGA LOS TRES MODALES DE CONFIRMACIÓN AQUÍ */}
      {pendingMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">MedikAI — Medicamento sin añadir</h3>
            <p className="text-xs text-slate-600">
              Tienes información escrita en los campos de "Agregar Medicamento" (<span className="font-semibold">{pendingMed.medicamento}</span>), pero no la has añadido a la receta. ¿Deseas agregarla automáticamente antes de continuar?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingMed(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancelar y revisar
              </button>
              <button
                type="button"
                onClick={() => {
                  const actualizados = [...medicamentos, pendingMed];
                  setMedicamentos(actualizados);
                  setPendingMed(null);
                  continuarValidacionReceta(actualizados);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Sí, agregar y continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmptyRecipeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">MedikAI — Sin medicamentos</h3>
            <p className="text-xs text-slate-600">
              Estás a punto de finalizar la consulta sin ningún medicamento en la receta. ¿Deseas continuar únicamente con la Nota SOAP?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmptyRecipeModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Regresar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmptyRecipeModal(false);
                  setShowFinalReviewModal(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Continuar sin receta
              </button>
            </div>
          </div>
        </div>
      )}

      {showFinalReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">MedikAI — Validación Final</h3>
            <p className="text-xs text-slate-600">
              Por favor, asegúrate de haber revisado y actualizado la Nota SOAP y la receta generada por la IA en caso de ser necesario. ¿Los datos son correctos y deseas finalizar y guardar la consulta?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinalReviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Hacer ajustes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFinalReviewModal(false);
                  ejecutarGuardadoDefinitivo(medicamentosPendientesFinales);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
              >
                Sí, Guardar Consulta
              </button>
            </div>
          </div>
        </div>
      )}

    </div> // <--- ESTE ES EL ULTIMO DIV DE LA PAGINA (min-h-screen)
  );
}

export default function NuevaConsultaPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-slate-500">Cargando consulta...</div>}>
      <NuevaConsultaContent />
    </Suspense>
  );
}
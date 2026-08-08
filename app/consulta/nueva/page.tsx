'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// Importación de componentes modulares
import PatientSelector from '@/components/consultation/PatientSelector';
import AudioRecorder from '@/components/consultation/AudioRecorder';
import SoapEditor from '@/components/consultation/SoapEditor';
import PrescriptionBuilder from '@/components/prescription/PrescriptionBuilder';

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

export default function NuevaConsultaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const patientIdFromUrl = searchParams.get('patient_id');
  const autoStart = searchParams.get('auto_start') === 'true';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        if (found) setSelectedPatient(found);
      }
    }
  };

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatient(patients.find((item) => item.id === patientId) || null);
  };

  const handleCreatePatient = async (newPatientData: any) => {
    if (!doctorId) return;
    setErrorMessage(null);

    const { data: createdPatient, error } = await supabase
      .from('patients')
      .insert([{ doctor_id: doctorId, ...newPatientData }])
      .select()
      .single();

    if (error) {
      setErrorMessage('Error al registrar paciente: ' + error.message);
      return;
    }

    await cargarPacientes(doctorId);
    setSelectedPatient(createdPatient);
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => audioChunks.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await procesarAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      setErrorMessage('No se pudo acceder al micrófono.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
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
      // 1. Guardar la nota SOAP
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

      // 2. Guardar Receta
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

      // 3. Finalizar Encuentro
      const { error: encounterError } = await supabase
        .from('encounters')
        .update({ status: 'completed' })
        .eq('id', encounterId);

      if (encounterError) throw encounterError;

      // REDIRECCIÓN TRAS COMPLETAR LA CONSULTA
      router.push(`/consulta/${encounterId}`);
    } catch (err: any) {
      setErrorMessage('Error al guardar la nota y receta: ' + err.message);
      setSaving(false);
    }
  };

  const currentStep = !encounterId ? 1 : !editableSoap ? 2 : 3;

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-12">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-[#1A202C]">
            Medik<span className="text-[#0052FF]">AI</span>
          </span>
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
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Barra de Progreso */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <div className={`p-2 rounded-xl ${currentStep === 1 ? 'bg-blue-50 text-[#0052FF]' : 'text-slate-400'}`}>
              1. Selección Paciente
            </div>
            <div className={`p-2 rounded-xl ${currentStep === 2 ? 'bg-blue-50 text-[#0052FF]' : 'text-slate-400'}`}>
              2. Dictado Scribe
            </div>
            <div className={`p-2 rounded-xl ${currentStep === 3 ? 'bg-blue-50 text-[#0052FF]' : 'text-slate-400'}`}>
              3. SOAP y Receta
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
            <strong>Atención: </strong>
            {errorMessage}
          </div>
        )}

        {/* PASO 1 */}
        {!encounterId && (
          <PatientSelector
            patients={patients}
            selectedPatient={selectedPatient}
            onSelectPatient={handleSelectPatient}
            onCreatePatient={handleCreatePatient}
            onStartEncounter={iniciarEncuentro}
          />
        )}

        {/* PASO 2 */}
        {encounterId && !editableSoap && (
          <AudioRecorder
            isRecording={isRecording}
            loading={loading}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            patientName={`${selectedPatient?.first_name} ${selectedPatient?.last_name}`}
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
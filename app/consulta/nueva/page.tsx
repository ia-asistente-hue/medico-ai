'use client';

import { useState, useEffect, Suspense } from 'react';
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

// Componente interno que maneja la lógica y usa useSearchParams()
function NuevaConsultaContent() {
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

  // AQUÍ CONTINÚA EL RESTO DE TU RENDER / JSX ACTUAL...
  return (
    <div>
      {/* Tu JSX actual */}
    </div>
  );
}

// Componente principal exportado envuelto en Suspense
export default function NuevaConsultaPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Cargando consulta...</div>}>
      <NuevaConsultaContent />
    </Suspense>
  );
}
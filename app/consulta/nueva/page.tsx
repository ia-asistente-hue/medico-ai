'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
}

interface SoapFormState {
  subjetivo: string;
  objetivo: string;
  analisis: string;
  plan: string;
}

// Helper para transformar estructuras complejas del LLM en texto editable limpio
const formatSection = (content: any): string => {
  if (!content) return 'No reportado.';
  
  if (typeof content === 'string') {
    if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        return formatSection(JSON.parse(content));
      } catch (e) {
        return content;
      }
    }
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((item) => formatSection(item)).join(', ');
  }

  if (typeof content === 'object') {
    return Object.entries(content)
      .map(([key, val]) => {
        const formattedKey = key
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/^\w/, (c) => c.toUpperCase());
        
        const formattedValue = formatSection(val);
        return `• ${formattedKey}: ${formattedValue}`;
      })
      .join('\n');
  }

  return String(content);
};

export default function NuevaConsultaPage() {
  const router = useRouter();
  const supabase = createClient();

  // Estados generales
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  // Estado para la creación rápida de paciente
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'other',
  });

  // Estados de grabación y UI
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado borrador editable del SOAP para validación del médico
  const [editableSoap, setEditableSoap] = useState<SoapFormState | null>(null);

  // 1. Cargar el médico actual y la lista de sus pacientes
  useEffect(() => {
    async function initData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: doctor } = await supabase
        .from('doctors')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (doctor) {
        setDoctorId(doctor.id);
        cargarPacientes(doctor.id);
      }
    }
    initData();
  }, []);

  const cargarPacientes = async (docId: string) => {
    const { data: patientList } = await supabase
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, gender')
      .eq('doctor_id', docId)
      .order('created_at', { ascending: false });

    if (patientList) setPatients(patientList);
  };

  const handleSelectPatient = (patientId: string) => {
    const p = patients.find((item) => item.id === patientId) || null;
    setSelectedPatient(p);
  };

  // 2. Crear un nuevo paciente
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return;

    setErrorMessage(null);

    const { data: createdPatient, error } = await supabase
      .from('patients')
      .insert([
        {
          doctor_id: doctorId,
          first_name: newPatient.first_name,
          last_name: newPatient.last_name,
          date_of_birth: newPatient.date_of_birth,
          gender: newPatient.gender,
        },
      ])
      .select()
      .single();

    if (error) {
      setErrorMessage('Error al registrar paciente: ' + error.message);
      return;
    }

    await cargarPacientes(doctorId);
    setSelectedPatient(createdPatient);
    setIsCreatingPatient(false);
    setNewPatient({ first_name: '', last_name: '', date_of_birth: '', gender: 'other' });
  };

  // 3. Crear el Encounter
  const iniciarEncuentro = async () => {
    if (!selectedPatient || !doctorId) {
      setErrorMessage('Por favor selecciona o registra un paciente.');
      return;
    }
    setErrorMessage(null);

    const { data: encounter, error } = await supabase
      .from('encounters')
      .insert([
        {
          doctor_id: doctorId,
          patient_id: selectedPatient.id,
          status: 'in_progress',
        },
      ])
      .select()
      .single();

    if (error) {
      setErrorMessage('Error al iniciar la consulta: ' + error.message);
    } else {
      setEncounterId(encounter.id);
    }
  };

  // 4. Lógica de Grabación
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

  // 5. Enviar Audio a la API y formatear borrador editable
  const procesarAudio = async (audioBlob: Blob) => {
    if (!encounterId) return;

    setLoading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'grabacion.webm');
    formData.append('encounter_id', encounterId);

    try {
      const response = await fetch('/api/transcribir', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando la transcripción');
      }

      setEditableSoap({
        subjetivo: formatSection(data.soap.subjetivo),
        objetivo: formatSection(data.soap.objetivo),
        analisis: formatSection(data.soap.analisis),
        plan: formatSection(data.soap.plan),
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. Validar y Guardar Nota SOAP Definitiva en Supabase + Redirección
  const handleGuardarNota = async () => {
    if (!encounterId || !editableSoap) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      // Guardar o actualizar en soap_notes
      const { error: soapError } = await supabase
        .from('soap_notes')
        .upsert(
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

      // Finalizar la consulta
      const { error: encounterError } = await supabase
        .from('encounters')
        .update({ status: 'completed' })
        .eq('id', encounterId);

      if (encounterError) throw encounterError;

      // Redirigir al historial/detalle de la consulta creada
      router.push(`/consulta/${encounterId}`);
    } catch (err: any) {
      setErrorMessage('Error al guardar la nota: ' + err.message);
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Nueva Consulta Médica (Scribe)</h1>

      {/* MENSAJES DE ERROR */}
      {errorMessage && (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* PASO 1: SELECCIONAR O CREAR PACIENTE */}
      {!encounterId ? (
        <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {isCreatingPatient ? 'Registrar Nuevo Paciente' : '1. Selecciona al Paciente'}
            </h2>
            <button
              type="button"
              onClick={() => setIsCreatingPatient(!isCreatingPatient)}
              className="text-sm text-blue-600 underline font-medium"
            >
              {isCreatingPatient ? '← Volver a Selección' : '+ Nuevo Paciente'}
            </button>
          </div>

          {isCreatingPatient ? (
            <form onSubmit={handleCreatePatient} className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nombre(s)"
                  required
                  className="p-2 border rounded-md"
                  value={newPatient.first_name}
                  onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Apellidos"
                  required
                  className="p-2 border rounded-md"
                  value={newPatient.last_name}
                  onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  required
                  className="p-2 border rounded-md"
                  value={newPatient.date_of_birth}
                  onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                />
                <select
                  className="p-2 border rounded-md"
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                >
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700"
              >
                Guardar Paciente y Seleccionar
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <select
                className="w-full p-2 border rounded-md"
                value={selectedPatient?.id || ''}
                onChange={(e) => handleSelectPatient(e.target.value)}
              >
                <option value="">-- Seleccionar Paciente --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </option>
                ))}
              </select>

              <button
                onClick={iniciarEncuentro}
                disabled={!selectedPatient}
                className="w-full py-2 bg-blue-600 text-white rounded-md disabled:bg-gray-300 font-medium"
              >
                Iniciar Consulta Médica
              </button>
            </div>
          )}
        </div>
      ) : (
        /* PASO 2: GRABADORA Y ENCABEZADO DEL PACIENTE */
        <div className="p-6 border rounded-lg bg-white shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3 text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Paciente: </span>
              <strong className="text-gray-900 text-base">
                {selectedPatient?.first_name} {selectedPatient?.last_name}
              </strong>
            </div>
            {selectedPatient?.date_of_birth && (
              <div>
                <span className="text-gray-500">F. Nacimiento: </span>
                <span>{selectedPatient.date_of_birth}</span>
              </div>
            )}
          </div>

          <div className="text-center space-y-4 pt-2">
            {!loading && (
              <div>
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition"
                  >
                    🔴 Iniciar Grabación
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-6 py-3 bg-gray-800 text-white font-medium rounded-full hover:bg-gray-900 transition animate-pulse"
                  >
                    ⏹ Detener y Generar Nota SOAP
                  </button>
                )}
              </div>
            )}

            {loading && (
              <div className="py-8 space-y-2">
                <div className="text-blue-600 font-medium animate-bounce">
                  Procesando audio y estructurando borrador SOAP con IA...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASO 3: REVISIÓN, EDICIÓN Y VALIDACIÓN MÉDICA */}
      {editableSoap && (
        <div className="p-6 border rounded-lg bg-gray-50 space-y-6">
          <div className="flex justify-between items-center border-b pb-2">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Revisión y Validación de la Nota</h2>
              <p className="text-xs text-gray-500">Modifica cualquier sección antes de autorizar y guardar.</p>
            </div>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              NOM-004 / NOM-024
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block font-semibold text-blue-800 text-sm mb-1">
                Subjetivo (S)
              </label>
              <textarea
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={editableSoap.subjetivo}
                onChange={(e) => setEditableSoap({ ...editableSoap, subjetivo: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-semibold text-blue-800 text-sm mb-1">
                Objetivo (O)
              </label>
              <textarea
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={editableSoap.objetivo}
                onChange={(e) => setEditableSoap({ ...editableSoap, objetivo: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-semibold text-blue-800 text-sm mb-1">
                Análisis / Diagnóstico (A)
              </label>
              <textarea
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={editableSoap.analisis}
                onChange={(e) => setEditableSoap({ ...editableSoap, analisis: e.target.value })}
              />
            </div>

            <div>
              <label className="block font-semibold text-blue-800 text-sm mb-1">
                Plan / Tratamiento (P)
              </label>
              <textarea
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md text-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={editableSoap.plan}
                onChange={(e) => setEditableSoap({ ...editableSoap, plan: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleGuardarNota}
              disabled={saving}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {saving ? 'Guardando en expediente...' : '✅ Autorizar y Guardar Nota Médica'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
// app/pacientes/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { 
  getDecryptedPatientAction, 
  getPatientEncountersHistoryAction
} from '@/app/actions/patients';

interface Patient {
  id: string;
  chart_number?: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone?: string | null;
  email?: string | null;
  gender: string;
  blood_type: string;
  allergies: string;
  chronic_conditions: string;
  emergency_name: string;
  emergency_phone: string;
  emergency_relationship: string;
}

interface EncounterWithDetails {
  id: string;
  created_at: string;
  status: string;
  soap_notes: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    summary: string;
  } | null;
  prescriptions: {
    id: string;
    medications: any[];
    instructions: string;
    prescription_code: string;
  } | null;
}

export default function ExpedienteClinicoPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<EncounterWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'historial' | 'fichar' | 'recetas'>('historial');
  const [loading, setLoading] = useState(true);
  const [expandedEncounter, setExpandedEncounter] = useState<string | null>(null);

  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    blood_type: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_relationship: '',
    allergiesText: '',
    chronicText: '',
  });
  const [savingPatient, setSavingPatient] = useState(false);

  useEffect(() => {
    if (patientId) {
      fetchExpedienteData();
    }
  }, [patientId]);

  const fetchExpedienteData = async () => {
    setLoading(true);
    try {
      const patientData = await getDecryptedPatientAction(patientId);
      setPatient(patientData);

      if (patientData) {
        setEditForm({
          first_name: patientData.first_name || '',
          last_name: patientData.last_name || '',
          phone: patientData.phone || '',
          email: patientData.email || '',
          date_of_birth: patientData.date_of_birth || '',
          gender: patientData.gender || '',
          blood_type: patientData.blood_type || '',
          emergency_name: patientData.emergency_name || '',
          emergency_phone: patientData.emergency_phone || '',
          emergency_relationship: patientData.emergency_relationship?.relationship || '',
          allergiesText: patientData.allergies || '',
          chronicText: patientData.chronic_conditions || '',
        });
      }

      const encountersData = await getPatientEncountersHistoryAction(patientId);
      const formattedEncounters = (encountersData || []).map((e: any) => ({
        id: e.id,
        created_at: e.created_at,
        status: e.status,
        soap_notes: Array.isArray(e.soap_notes) ? e.soap_notes[0] : e.soap_notes,
        prescriptions: Array.isArray(e.prescriptions) ? e.prescriptions[0] : e.prescriptions,
      }));

      setEncounters(formattedEncounters);
      if (formattedEncounters.length > 0) {
        setExpandedEncounter(formattedEncounters[0].id);
      }
    } catch (err) {
      console.error('Error al cargar expediente:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleSavePatientInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPatient(true);
    try {

      // Estructura de datos a enviar al servidor / base de datos
      const payload = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        phone: editForm.phone || null,
        email: editForm.email || null,
        date_of_birth: editForm.date_of_birth || null,
        gender: editForm.gender,
        blood_type: editForm.blood_type,
        allergies: editForm.allergiesText || null,
        chronic_conditions: editForm.chronicText || null,
        emergency_name: editForm.emergency_name || null,
        emergency_phone: editForm.emergency_phone || null,
        emergency_relationship: editForm.emergency_relationship || null,
      };

      // 🚀 Instanciamos el cliente de Supabase aquí
      const supabase = createClient();

      // 🚀 LLAMADA REAL A LA BASE DE DATOS (Supabase)
      console.log('ACTUALIZANDO PACIENTE CON PAYLOAD:', payload);
      
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          first_name: payload.first_name,
          last_name: payload.last_name,
          phone: payload.phone,
          email: payload.email,
          date_of_birth: payload.date_of_birth,
          gender: payload.gender,
          blood_type: payload.blood_type,
          allergies: payload.allergies,
          chronic_conditions: payload.chronic_conditions,
          emergency_name: payload.emergency_name,
          emergency_phone: payload.emergency_phone,
          emergency_relationship: payload.emergency_relationship,
          updated_at: new Date().toISOString()
        })
        .eq('id', patientId);

      if (updateError) {
        throw updateError;
      }

      setIsEditingPatient(false);
      // Opcional: recargar datos frescos de la BD
      await fetchExpedienteData();
    } catch (err) {
      console.error('Error al actualizar paciente en la BD:', err);
      alert('Hubo un error al guardar los cambios en la base de datos.');
    } finally {
      setSavingPatient(false);
    }
  };
  
  
  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const monthDiff = now.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-slate-500 text-sm">
        Cargando expediente clínico...
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 text-center text-slate-600 text-sm">
        No se encontró el paciente solicitado.
      </div>
    );
  }

  const displayChartNumber = patient.chart_number || 'S/N';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* BOTÓN VOLVER & ENCABEZADO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2 block"
          >
            ← Volver a Pacientes
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <span className="px-2.5 py-0.5 bg-blue-50 text-[#0052FF] font-mono font-semibold text-xs rounded-lg border border-blue-200">
              Exp: {displayChartNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {calculateAge(patient.date_of_birth)} años • Sexo: {patient.gender || 'No especificado'} • Tipo de Sangre: <span className="font-semibold text-rose-600">{patient.blood_type || 'N/A'}</span>
          </p>
        </div>

        <button
          onClick={() => router.push(`/consulta/nueva?patient_id=${patient.id}&auto_start=true`)}
          className="px-4 py-2 bg-[#0052FF] hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
        >
          + Nueva Consulta
        </button>
      </div>

      {/* ALERTAS CRÍTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
    <span className="font-bold text-amber-900 block mb-1">⚠️ Alergias Registradas:</span>
    {patient.allergies ? (
      <div className="flex flex-wrap gap-1">
        {patient.allergies.split(',').map((alg, i) => (
          alg.trim() ? (
            <span key={i} className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-semibold rounded-md text-[11px]">
              {alg.trim()}
            </span>
          ) : null
        ))}
      </div>
    ) : (
      <span className="text-amber-700 italic">Sin alergias conocidas</span>
    )}
  </div>

  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
    <span className="font-bold text-slate-800 block mb-1">🩺 Condiciones Crónicas:</span>
    {patient.chronic_conditions ? (
      <div className="flex flex-wrap gap-1">
        {patient.chronic_conditions.split(',').map((cond, i) => (
          cond.trim() ? (
            <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-800 font-medium rounded-md text-[11px]">
              {cond.trim()}
            </span>
          ) : null
        ))}
      </div>
    ) : (
      <span className="text-slate-500 italic">Sin condiciones registradas</span>
    )}
  </div>
</div>

      {/* PESTAÑAS NAVEGACIÓN */}
      <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600 gap-6">
        <button
          onClick={() => setActiveTab('historial')}
          className={`pb-2 transition-all ${
            activeTab === 'historial'
              ? 'border-b-2 border-[#0052FF] text-[#0052FF]'
              : 'hover:text-slate-900'
          }`}
        >
          Historial de Consultas ({encounters.length})
        </button>
        <button
          onClick={() => setActiveTab('recetas')}
          className={`pb-2 transition-all ${
            activeTab === 'recetas'
              ? 'border-b-2 border-[#0052FF] text-[#0052FF]'
              : 'hover:text-slate-900'
          }`}
        >
          Recetas Emitidas
        </button>
        <button
          onClick={() => setActiveTab('fichar')}
          className={`pb-2 transition-all ${
            activeTab === 'fichar'
              ? 'border-b-2 border-[#0052FF] text-[#0052FF]'
              : 'hover:text-slate-900'
          }`}
        >
          Información del Paciente
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: HISTORIAL DE CONSULTAS */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          {encounters.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 italic">
              Este paciente aún no registra consultas médicas previas.
            </div>
          ) : (
            encounters.map((enc) => {
              const isExpanded = expandedEncounter === enc.id;
              const dateStr = new Date(enc.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={enc.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedEncounter(isExpanded ? null : enc.id)}
                    className="p-4 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer flex items-center justify-between border-b border-slate-100"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Consulta Médica — {dateStr}
                      </span>
                      {enc.soap_notes?.assessment && (
                        <p className="text-xs text-[#0052FF] font-semibold mt-0.5">
                          Diagnóstico: {enc.soap_notes.assessment}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                        {enc.status}
                      </span>
                      <span className="text-slate-400 text-xs">
                        {isExpanded ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 space-y-4 text-xs">
                      {enc.soap_notes ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700 block">S - Subjetivo (Motivo / Síntomas):</span>
                            <p className="text-slate-600 whitespace-pre-line">
                              {enc.soap_notes.subjective || 'Sin registro'}
                            </p>
                          </div>

                          <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700 block">O - Objetivo (Exploración / Signos):</span>
                            <p className="text-slate-600 whitespace-pre-line">
                              {enc.soap_notes.objective || 'Sin registro'}
                            </p>
                          </div>

                          <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700 block">A - Evaluación / Diagnóstico:</span>
                            <p className="text-slate-600 whitespace-pre-line">
                              {enc.soap_notes.assessment || 'Sin registro'}
                            </p>
                          </div>

                          <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                            <span className="font-bold text-slate-700 block">P - Plan y Tratamiento:</span>
                            <p className="text-slate-600 whitespace-pre-line">
                              {enc.soap_notes.plan || 'Sin registro'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">Nota SOAP no disponible para esta consulta.</p>
                      )}

                      {enc.prescriptions && (
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800">Receta Prescrita: </span>
                            <span className="text-slate-500 font-mono">#{enc.prescriptions.prescription_code}</span>
                            <span className="text-slate-500 ml-2">
                              ({(enc.prescriptions.medications || []).length} medicamentos)
                            </span>
                          </div>

                          <button
                            onClick={() => router.push(`/recetas/${enc.prescriptions?.id}`)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors text-[11px]"
                          >
                            📄 Ver Receta
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: RECETAS */}
      {activeTab === 'recetas' && (
        <div className="space-y-3">
          {encounters.filter((e) => e.prescriptions).length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 italic">
              No hay recetas registradas para este paciente.
            </div>
          ) : (
            encounters
              .filter((e) => e.prescriptions)
              .map((enc) => {
                const rx = enc.prescriptions!;
                return (
                  <div
                    key={rx.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        Receta Código: <span className="font-mono text-[#0052FF]">{rx.prescription_code}</span>
                      </p>
                      <p className="text-slate-500 mt-0.5">
                        Emisión: {new Date(enc.created_at).toLocaleDateString('es-ES')}
                      </p>
                      <div className="mt-2 text-slate-600">
                        <span className="font-semibold">Fármacos: </span>
                        {(rx.medications || []).map((m: any) => m.medicamento || m.nombre).join(', ')}
                      </div>
                    </div>

                    <button
                      onClick={() => router.push(`/recetas/${rx.id}`)}
                      className="px-3 py-1.5 bg-blue-50 text-[#0052FF] hover:bg-blue-100 font-semibold rounded-lg transition-colors text-[11px]"
                    >
                      📄 Ver Receta
                    </button>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: INFORMACIÓN PACIENTE */}
      {activeTab === 'fichar' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 text-xs">
          <div className="flex items-center justify-between border-b pb-4 border-slate-100">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Ficha Demográfica y Contacto
              </h3>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Información personal, clínica y canales de comunicación del paciente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingPatient(!isEditingPatient)}
              className="px-3.5 py-1.5 bg-blue-50 text-[#0052FF] hover:bg-blue-100 font-semibold rounded-xl transition-all"
            >
              {isEditingPatient ? '✕ Cancelar Edición' : '✏️ Editar Información'}
            </button>
          </div>

          {!isEditingPatient ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] text-blue-600">
                  1. Identificación y Datos Personales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">No. de Expediente:</span>
                    <span className="font-mono font-semibold text-[#0052FF]">{displayChartNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nombre(s):</span>
                    <span className="font-semibold text-slate-800">{patient.first_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Apellidos:</span>
                    <span className="font-semibold text-slate-800">{patient.last_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Fecha de Nacimiento:</span>
                    <span className="font-semibold text-slate-800">{patient.date_of_birth || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Sexo:</span>
                    <span className="font-semibold text-slate-800">{patient.gender || 'No registrado'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tipo de Sangre:</span>
                    <span className="font-semibold text-slate-800">{patient.blood_type || 'No registrado'}</span>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: COMUNICACIÓN Y URGENCIAS */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] text-blue-600">
                  2. Comunicación y Urgencias
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Teléfono:</span>
                    {patient.phone ? (
                      <a href={`tel:${patient.phone}`} className="font-semibold text-[#0052FF] hover:underline">
                        📞 {patient.phone}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No registrado</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-400 block">Correo Electrónico:</span>
                    {patient.email ? (
                      <a href={`mailto:${patient.email}`} className="font-semibold text-[#0052FF] hover:underline">
                        ✉️ {patient.email}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No registrado</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block mb-1">Contacto de Emergencia:</span>
                    <span className="font-semibold text-slate-800">
                      {patient.emergency_name ? (
                        <>
                          {patient.emergency_name} ({patient.emergency_relationship || 'Contacto'}) — {patient.emergency_phone || 'Sin número'}
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No registrado</span>
                      )}
                    </span>
                  </div>
                </div>
                </div>
              </div>

              {/* BLOQUE 3: ANTECEDENTES CLÍNICOS */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] text-blue-600">
                  3. Antecedentes Clínicos del Paciente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
  <div>
    <span className="text-slate-400 block mb-1">Alergias:</span>
    <div className="flex flex-wrap gap-1">
      {patient.allergies ? (
        patient.allergies.split(',').map((alg, i) => (
          alg.trim() ? (
            <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-medium text-[11px]">
              {alg.trim()}
            </span>
          ) : null
        ))
      ) : (
        <span className="text-slate-400 italic">Sin alergias registradas</span>
      )}
    </div>
  </div>
  <div>
    <span className="text-slate-400 block mb-1">Condiciones Crónicas:</span>
    <div className="flex flex-wrap gap-1">
      {patient.chronic_conditions ? (
        patient.chronic_conditions.split(',').map((cond, i) => (
          cond.trim() ? (
            <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium text-[11px]">
              {cond.trim()}
            </span>
          ) : null
        ))
      ) : (
        <span className="text-slate-400 italic">Sin condiciones crónicas</span>
      )}
    </div>
  </div>
</div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSavePatientInfo} className="space-y-6">
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] text-blue-600">
                  1. Identificación y Datos Personales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 block">No. de Expediente (chart_number)</label>
                    <div className="w-full p-2 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-[#0052FF] flex items-center">
                      {displayChartNumber}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Nombre(s)</label>
                    <input
                      type="text"
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Apellidos</label>
                    <input
                      type="text"
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={editForm.date_of_birth}
                      onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Sexo</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="femenino">Femenino</option>
                      <option value="masculino">Masculino</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Tipo de Sangre</label>
                    <select
                      value={editForm.blood_type}
                      onChange={(e) => setEditForm({ ...editForm, blood_type: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">N/A</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2 EDITABLE */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] text-blue-600">
                  2. Comunicación y Urgencias
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Teléfono</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Correo Electrónico</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Emergencia (Nombre)</label>
                    <input
                      type="text"
                      placeholder="Nombre del contacto"
                      value={editForm.emergency_name}
                      onChange={(e) => setEditForm({ ...editForm, emergency_name: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Emergencia (Teléfono)</label>
                    <input
                      type="text"
                      placeholder="Teléfono del contacto"
                      value={editForm.emergency_phone}
                      onChange={(e) => setEditForm({ ...editForm, emergency_phone: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Emergencia (Parentesco)</label>
                    <input
                      type="text"
                      placeholder="Ej. Esposo, Madre"
                      value={editForm.emergency_relationship}
                      onChange={(e) => setEditForm({ ...editForm, emergency_relationship: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* BLOQUE 3 EDITABLE */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] text-blue-600">
                  3. Antecedentes Clínicos del Paciente
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Alergias (separadas por coma)</label>
                    <input
                      type="text"
                      placeholder="Ej. Penicilina, Polen"
                      value={editForm.allergiesText}
                      onChange={(e) => setEditForm({ ...editForm, allergiesText: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-600">Condiciones Crónicas (separadas por coma)</label>
                    <input
                      type="text"
                      placeholder="Ej. Hipertensión, Diabetes"
                      value={editForm.chronicText}
                      onChange={(e) => setEditForm({ ...editForm, chronicText: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingPatient(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPatient}
                  className="px-5 py-2 bg-[#0052FF] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all"
                >
                  {savingPatient ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
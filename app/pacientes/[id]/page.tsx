'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  blood_type: string;
  allergies: string[];
  chronic_conditions: string[];
  emergency_contact: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
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
  const supabase = createClient();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounters, setEncounters] = useState<EncounterWithDetails[]>([]);
  const [activeTab, setActiveTab] = useState<'historial' | 'fichar' | 'recetas'>('historial');
  const [loading, setLoading] = useState(true);
  const [expandedEncounter, setExpandedEncounter] = useState<string | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchExpedienteData();
    }
  }, [patientId]);

  const fetchExpedienteData = async () => {
    setLoading(true);
    try {
      // 1. Obtener datos del Paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // 2. Obtener Historial de Consultas (Encounters + SOAP Notes + Prescriptions)
      const { data: encountersData, error: encountersError } = await supabase
        .from('encounters')
        .select(`
          id,
          created_at,
          status,
          soap_notes (
            subjective,
            objective,
            assessment,
            plan,
            summary
          ),
          prescriptions (
            id,
            medications,
            instructions,
            prescription_code
          )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (encountersError) throw encountersError;
      
      // Mapear respuesta
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

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* BOTÓN VOLVER & ENCABEZADO */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <button
            onClick={() => router.back()}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2 block"
          >
            ← Volver a Pacientes
          </button>
          <h1 className="text-xl font-bold text-slate-900">
            {patient.first_name} {patient.last_name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {calculateAge(patient.date_of_birth)} años • Sexo: {patient.gender || 'No especificado'} • Tipo de Sangre: <span className="font-semibold text-rose-600">{patient.blood_type || 'N/A'}</span>
          </p>
        </div>

        <button
         /* onClick={() => router.push(`/consulta/nueva?patient_id=${patient.id}`)}*/
          
         onClick={() => router.push(`/consulta/nueva?patient_id=${patient.id}&auto_start=true`)}
 
         className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all"
        >
          + Nueva Consulta
        </button>
      </div>

      {/* ALERTAS CRÍTICAS (ALERGIAS / ENFERMEDADES CRÓNICAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl">
          <span className="font-bold text-amber-900 block mb-1">⚠️ Alergias Registradas:</span>
          {patient.allergies && patient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {patient.allergies.map((alg, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-200/80 text-amber-900 font-semibold rounded-md text-[11px]">
                  {alg}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-amber-700 italic">Sin alergias conocidas</span>
          )}
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="font-bold text-slate-800 block mb-1">🩺 Condiciones Crónicas:</span>
          {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {patient.chronic_conditions.map((cond, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-800 font-medium rounded-md text-[11px]">
                  {cond}
                </span>
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
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'hover:text-slate-900'
          }`}
        >
          Historial de Consultas ({encounters.length})
        </button>
        <button
          onClick={() => setActiveTab('recetas')}
          className={`pb-2 transition-all ${
            activeTab === 'recetas'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'hover:text-slate-900'
          }`}
        >
          Recetas Emitidas
        </button>
        <button
          onClick={() => setActiveTab('fichar')}
          className={`pb-2 transition-all ${
            activeTab === 'fichar'
              ? 'border-b-2 border-blue-600 text-blue-600'
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
                  {/* CABECERA CONSULTA */}
                  <div
                    onClick={() => setExpandedEncounter(isExpanded ? null : enc.id)}
                    className="p-4 bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer flex items-center justify-between border-b border-slate-100"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Consulta Médica — {dateStr}
                      </span>
                      {enc.soap_notes?.assessment && (
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">
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

                  {/* CUERPO CONSULTA (EXPANDIBLE) */}
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

                      {/* DETALLE RECETA */}
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
                            📄 Ver / Descargar PDF Receta
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
                        Receta Código: <span className="font-mono text-blue-600">{rx.prescription_code}</span>
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
                      className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold rounded-lg transition-colors text-[11px]"
                    >
                      Ver PDF
                    </button>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 3: INFORMACIÓN PACIENTE */}
      {activeTab === 'fichar' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 text-xs">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2 border-slate-100">
            Ficha Demográfica y Contacto de Emergencia
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 block">Fecha de Nacimiento:</span>
              <span className="font-semibold text-slate-800">{patient.date_of_birth}</span>
            </div>

            <div>
              <span className="text-slate-500 block">Sexo:</span>
              <span className="font-semibold text-slate-800">{patient.gender || 'No registrado'}</span>
            </div>

            <div>
              <span className="text-slate-500 block">Tipo de Sangre:</span>
              <span className="font-semibold text-slate-800">{patient.blood_type || 'No registrado'}</span>
            </div>

            <div>
              <span className="text-slate-500 block">Contacto de Emergencia:</span>
              <span className="font-semibold text-slate-800">
                {patient.emergency_contact?.name ? (
                  <>
                    {patient.emergency_contact.name} ({patient.emergency_contact.relationship || 'Contacto'}) — {patient.emergency_contact.phone || 'Sin número'}
                  </>
                ) : (
                  'No registrado'
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
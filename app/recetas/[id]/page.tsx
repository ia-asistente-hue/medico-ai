//app/consulta/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Medicamento {
  medicamento?: string;
  nombre?: string;
  name?: string;

  dosis?: string;
  dosage?: string;

  frecuencia?: string;
  frequency?: string;

  duracion?: string;
  duration?: string;

  indicaciones?: string;
  instructions?: string;
}

interface PrescriptionDetail {
  id: string;
  created_at: string;
  prescription_code: string;
  medications: Medicamento[];
  instructions: string | null;
  patient: {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
  };
  doctor: {
    medical_license: string;
    specialty: string;
    digital_signature_url: string | null;
    profile: {
      first_name: string;
      last_name: string;
    } | null;
  };
}

export default function VerRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const prescriptionId = resolvedParams.id;

  const supabase = createClient();
  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrescriptionData() {
      try {
        setLoading(true);
        setErrorMessage(null);

        // Consultar la receta por su ID e incluir la relación con la consulta, el paciente y el doctor
        const { data, error } = await supabase
          .from('prescriptions')
          .select(`
            id,
            created_at,
            prescription_code,
            medications,
            instructions,
            encounters (
              id,
              patients (
                first_name,
                last_name,
                date_of_birth,
                gender
              ),
              doctors (
                medical_license,
                specialty,
                digital_signature_url,
                profiles (
                  first_name,
                  last_name
                )
              )
            )
          `)
          .eq('id', prescriptionId)
          .single();

        if (error) throw error;

        const encounterData = Array.isArray(data.encounters) ? data.encounters[0] : data.encounters;
        const patientData = encounterData && Array.isArray(encounterData.patients) ? encounterData.patients[0] : encounterData?.patients;
        const doctorData = encounterData && Array.isArray(encounterData.doctors) ? encounterData.doctors[0] : encounterData?.doctors;
        const profileData = doctorData && Array.isArray(doctorData.profiles) ? doctorData.profiles[0] : doctorData?.profiles;

        // Parsear medicamentos si vienen como string JSON
        let medicamentosParsed: Medicamento[] = [];
        if (typeof data.medications === 'string') {
          try {
            medicamentosParsed = JSON.parse(data.medications);
          } catch {
            medicamentosParsed = [];
          }
        } else if (Array.isArray(data.medications)) {
          medicamentosParsed = data.medications;
        }

        setPrescription({
          id: data.id,
          created_at: data.created_at,
          prescription_code: data.prescription_code,
          medications: medicamentosParsed,
          instructions: data.instructions,
          patient: patientData,
          doctor: {
            medical_license: doctorData?.medical_license || '',
            specialty: doctorData?.specialty || '',
            digital_signature_url: doctorData?.digital_signature_url || null,
            profile: Array.isArray(profileData) ? profileData[0] || null : profileData || null,
          },
        });
      } catch (err: any) {
        setErrorMessage('No se pudo cargar la receta médica: ' + (err.message || 'Error desconocido'));
      } finally {
        setLoading(false);
      }
    }

    if (prescriptionId) {
      fetchPrescriptionData();
    }
  }, [prescriptionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <svg className="h-5 w-5 animate-spin text-[#0052FF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Cargando receta médica...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !prescription) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-slate-700">{errorMessage || 'Receta no encontrada.'}</p>
          <div>
            <Link
              href="/consulta/nueva"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0052FF] px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#0043D6] transition-all"
            >
              ← Volver a inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const doctorNombre = prescription.doctor?.profile 
    ? `Dr(a). ${prescription.doctor.profile.first_name} ${prescription.doctor.profile.last_name}`
    : 'Dr(a). Tratante';

  const formatGender = (gender?: string) => {
    if (!gender) return 'No registrado';
    const g = gender.toLowerCase();
    if (g === 'femenino') return 'Femenino';
    if (g === 'masculino') return 'Masculino';
    return 'Otro';
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-12 print:bg-white print:p-0 print:pb-0">
      
      {/* Estilos CSS para limpiar la impresión en PDF */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 10mm 15mm;
            size: auto;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
      
      {/* BARRA SUPERIOR (OCULTA EN IMPRESIÓN) */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/consulta/nueva"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0052FF] transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 active:scale-[0.98] transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Imprimir Receta Médica (PDF)</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        
        {/* HOJA DE RECETA */}
        <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-8 print:shadow-none print:border-none print:p-0 print:space-y-6">
          
          {/* ENCABEZADO INSTITUCIONAL Y MÉDICO */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="space-y-1 max-w-xs sm:max-w-md">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-7 w-auto text-[#0052FF]" viewBox="0 0 120 60" fill="none">
                  <path d="M10 30H25L35 10L45 50L55 20L65 40L75 30H85" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M85 30C85 30 90 20 100 20C110 20 110 32 100 38C95 41 90 45 90 52" stroke="#00D09C" strokeWidth="6" strokeLinecap="round" />
                  <circle cx="90" cy="54" r="4" fill="#00D09C" />
                </svg>
                <span className="text-lg font-bold tracking-tight text-[#1A202C]">
                  Medik<span className="text-[#0052FF]">AI</span>
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                RECETA MÉDICA
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Documento Oficial conforme a la <span className="font-semibold text-slate-700">NOM-004-SSA3-2012</span>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-600 space-y-1 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto shrink-0">
              <div>
                <span className="text-slate-400">Médico: </span>
                <span className="font-bold text-slate-800">{doctorNombre}</span>
              </div>
              <div>
                <span className="text-slate-400">Cédula Prof: </span>
                <span className="font-semibold text-slate-800">{prescription.doctor?.medical_license || 'En trámite'}</span>
              </div>
              <div>
                <span className="text-slate-400">Especialidad: </span>
                <span className="font-medium text-slate-700">{prescription.doctor?.specialty || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-400">Fecha: </span>
                <span className="font-medium text-slate-700">
                  {new Date(prescription.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* FICHA DE IDENTIFICACIÓN DEL PACIENTE */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm print:bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#0052FF] font-bold text-sm print:hidden">
                {prescription.patient?.first_name?.[0]}{prescription.patient?.last_name?.[0]}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Paciente</span>
                <strong className="text-base font-bold text-slate-800">
                  {prescription.patient?.first_name} {prescription.patient?.last_name}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-start sm:justify-end gap-6 text-xs">
              <div>
                <span className="text-slate-400 block">Fecha de Nacimiento</span>
                <span className="font-semibold text-slate-700 text-sm">
                  {prescription.patient?.date_of_birth || 'No registrada'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Género</span>
                <span className="font-semibold text-slate-700 text-sm">
                  {formatGender(prescription.patient?.gender)}
                </span>
              </div>
            </div>
          </div>

          {/* 💊 SECCIÓN DE PRESCRIPCIÓN MÉDICA */}
          {prescription.medications && prescription.medications.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-xs font-extrabold text-[#00D09C] print:hidden">
                    💊
                  </span>
                  <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">
                    Indicaciones & Medicamentos Prescritos
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  Folio: {prescription.prescription_code || 'S/F'}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden print:border-slate-300">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="p-3">Medicamento</th>
                      <th className="p-3">Dosis</th>
                      <th className="p-3">Frecuencia</th>
                      <th className="p-3">Duración</th>
                      <th className="p-3">Indicaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {prescription.medications.map((med, idx) => {
                      const nombre = med.medicamento || med.nombre || med.name || '-';
                      const dosis = med.dosis || med.dosage || '-';
                      const frecuencia = med.frecuencia || med.frequency || '-';
                      const duracion = med.duracion || med.duration || '-';
                      const indicaciones = med.indicaciones || med.instructions || '-';

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-3 font-semibold text-slate-900">{nombre}</td>
                          <td className="p-3">{dosis}</td>
                          <td className="p-3">{frecuencia}</td>
                          <td className="p-3">{duracion}</td>
                          <td className="p-3 text-slate-500">{indicaciones}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {prescription.instructions && (
                <div className="mt-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white print:border-slate-200">
                  <strong className="text-slate-900 block mb-1">Instrucciones Adicionales:</strong>
                  {prescription.instructions}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic p-4 text-center border border-dashed rounded-xl">
              No hay medicamentos prescritos para esta receta.
            </div>
          )}

          {/* FIRMA Y CÉDULA MÉDICA */}
          <div className="pt-16 sm:pt-20 mt-8 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2 print:pt-16 print:mt-8 print:break-inside-avoid">
            {prescription.doctor?.digital_signature_url ? (
              <img 
                src={prescription.doctor.digital_signature_url} 
                alt="Firma Médica" 
                className="h-16 mx-auto object-contain mb-1" 
              />
            ) : (
              <div className="w-56 mx-auto border-b border-slate-400 pt-10"></div>
            )}
            <p className="font-bold text-slate-800">{doctorNombre}</p>
            <p className="text-[10px] text-slate-400">
              Cédula Prof: {prescription.doctor?.medical_license || 'S/N'} | Firma Autógrafa / Digitalizada
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
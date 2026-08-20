//app/recetas/[id]/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

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
  prescription_code: string;
  instructions: string | null;
  medications: Medicamento[];
  created_at: string;
  patient: {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
    blood_type?: string;
  } | null;
  doctor: {
    medical_license: string;
    specialty: string;
    digital_signature_url: string | null;
    clinic_logo_url: string | null;
    phone: string | null;
    clinic_name: string | null;
    street_address: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    profile: {
      first_name: string;
      last_name: string;
    } | null;
  } | null;
}

export default function RecetaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const prescriptionId = params.id as string;

  const [prescription, setPrescription] = useState<PrescriptionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (prescriptionId) {
      fetchPrescriptionData();
    }
  }, [prescriptionId]);

  const fetchPrescriptionData = async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          id,
          prescription_code,
          instructions,
          medications,
          created_at,
          encounters (
            id,
            created_at,
            patients (
              first_name,
              last_name,
              date_of_birth,
              gender,
              blood_type
            ),
            doctors (
              medical_license,
              specialty,
              digital_signature_url,
              clinic_logo_url,
              phone,
              clinic_name,
              street_address,
              neighborhood,
              city,
              state,
              postal_code,
              profiles (
                first_name,
                last_name
              )
            )
          )
        `)
        .eq('id', prescriptionId)
        .maybeSingle();

      if (error) {
        throw new Error('Error al consultar la receta en la base de datos.');
      }

      if (!data) {
        setErrorMsg('La receta solicitada no existe o no se encuentra disponible.');
        return;
      }

      const encounterData: any = Array.isArray(data.encounters) 
        ? data.encounters[0] 
        : data.encounters;

      const rawPatient = encounterData && Array.isArray(encounterData.patients) 
        ? encounterData.patients[0] 
        : encounterData?.patients;

      const rawDoctor = encounterData && Array.isArray(encounterData.doctors) 
        ? encounterData.doctors[0] 
        : encounterData?.doctors;

      const docObj = rawDoctor as any;
      const rawProfile = docObj && Array.isArray(docObj.profiles) 
        ? docObj.profiles[0] 
        : docObj?.profiles;

      let medicationsParsed: Medicamento[] = [];
      if (typeof data.medications === 'string') {
        try {
          medicationsParsed = JSON.parse(data.medications);
        } catch {
          medicationsParsed = [];
        }
      } else if (Array.isArray(data.medications)) {
        medicationsParsed = data.medications;
      }

      setPrescription({
        id: data.id,
        prescription_code: data.prescription_code,
        instructions: data.instructions,
        created_at: data.created_at,
        medications: medicationsParsed,
        patient: rawPatient || null,
        doctor: rawDoctor ? {
          medical_license: rawDoctor.medical_license || '',
          specialty: rawDoctor.specialty || '',
          digital_signature_url: rawDoctor.digital_signature_url || null,
          clinic_logo_url: rawDoctor.clinic_logo_url || null,
          phone: rawDoctor.phone || null,
          clinic_name: rawDoctor.clinic_name || null,
          street_address: rawDoctor.street_address || null,
          neighborhood: rawDoctor.neighborhood || null,
          city: rawDoctor.city || null,
          state: rawDoctor.state || null,
          postal_code: rawDoctor.postal_code || null,
          profile: rawProfile || null,
        } : null,
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al cargar la receta.');
    } finally {
      setLoading(false);
    }
  };

  const formatGender = (gender?: string) => {
    if (!gender) return 'No registrado';
    const g = gender.toLowerCase();
    if (g === 'female' || g === 'femenino') return 'Femenino';
    if (g === 'male' || g === 'masculino') return 'Masculino';
    return 'Otro';
  };

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

  if (errorMsg || !prescription) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <p className="text-sm text-slate-700">{errorMsg || 'Receta no encontrada.'}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-all"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const patient = prescription.patient;
  const doctor = prescription.doctor;
  const doctorProfile = doctor?.profile;

  const doctorNombre = doctorProfile
    ? `Dr(a). ${doctorProfile.first_name} ${doctorProfile.last_name}`
    : 'Dr(a). Tratante';

  // Construcción de la dirección completa si existe
  const addressParts = [
    doctor?.street_address,
    doctor?.neighborhood,
    doctor?.city && doctor?.state ? `${doctor.city}, ${doctor.state}` : (doctor?.city || doctor?.state),
    doctor?.postal_code ? `C.P. ${doctor.postal_code}` : null
  ].filter(Boolean);

  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-12 print:bg-white print:p-0 print:pb-0">
      
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          body {
            background-color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            padding: 15mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0052FF] transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Volver al Expediente</span>
          </button>

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
        <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-8 print:shadow-none print:border-none print:p-0 print:space-y-6">
          
          {/* ENCABEZADO INSTITUCIONAL */}
          <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start gap-6">
            
            {/* Izquierda: Logotipo y Nombre del Consultorio/Plataforma */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {doctor?.clinic_logo_url ? (
                  <div className="h-24 w-auto flex items-center justify-center">
                    <img 
                      src={doctor.clinic_logo_url} 
                      alt="Logo Consultorio" 
                      className="max-h-24 max-w-[200px] object-contain" 
                    />
                  </div>
                ) : (
                  <div className="h-20 w-auto flex items-center justify-center text-[#0052FF]">
                    <svg className="h-20 w-auto" viewBox="0 0 120 60" fill="none">
                      <path d="M10 30H25L35 10L45 50L55 20L65 40L75 30H85" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M85 30C85 30 90 20 100 20C110 20 110 32 100 38C95 41 90 45 90 52" stroke="#00D09C" strokeWidth="6" strokeLinecap="round" />
                      <circle cx="90" cy="54" r="4" fill="#00D09C" />
                    </svg>
                  </div>
                )}
                <div>
                  {doctor?.clinic_name && (
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                      {doctor.clinic_name}
                    </h2>
                  )}
                  <span className="text-lg font-extrabold tracking-tight text-[#1A202C]">
                    Medik<span className="text-[#0052FF]">AI</span>
                  </span>
                </div>
              </div>
              
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  RECETA MÉDICA
                </h1>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Documento Oficial conforme a la <span className="font-semibold text-slate-600">NOM-004-SSA3-2012</span>
                </p>
              </div>
            </div>

            {/* Derecha: Datos del Médico, Cédula, Dirección y Teléfono */}
            <div className="text-left sm:text-right text-xs text-slate-600 space-y-1.5 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl w-full sm:w-72 shrink-0 border sm:border-none border-slate-100">
              <div>
                <span className="font-bold text-slate-900 text-sm block">{doctorNombre}</span>
                <span className="font-medium text-[#0052FF]">{doctor?.specialty || 'General'}</span>
              </div>
              
              <div className="pt-1 border-t border-slate-200/60 space-y-1">
                <div>
                  <span className="text-slate-400">Cédula Prof: </span>
                  <span className="font-semibold text-slate-800">{doctor?.medical_license || 'En trámite'}</span>
                </div>
                {doctor?.phone && (
                  <div>
                    <span className="text-slate-400">Teléfono: </span>
                    <span className="font-medium text-slate-700">{doctor.phone}</span>
                  </div>
                )}
                {fullAddress && (
                  <div>
                    <span className="text-slate-400 block sm:inline">Dirección: </span>
                    <span className="font-medium text-slate-700 leading-tight block sm:inline">{fullAddress}</span>
                  </div>
                )}
              </div>

              <div className="pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-400">Fecha: </span>
                <span className="font-medium text-slate-700">
                  {new Date(prescription.created_at).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

          </div>

          {/* FICHA PACIENTE */}
          <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm print:bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#0052FF] font-bold text-sm print:hidden">
                {patient?.first_name?.[0]}{patient?.last_name?.[0]}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Paciente</span>
                <strong className="text-base font-bold text-slate-800">
                  {patient?.first_name} {patient?.last_name}
                </strong>
              </div>
            </div>

            <div className="flex items-center justify-start sm:justify-end gap-6 text-xs">
              <div>
                <span className="text-slate-400 block">Fecha de Nacimiento</span>
                <span className="font-semibold text-slate-700 text-sm">
                  {patient?.date_of_birth || 'No registrada'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Género</span>
                <span className="font-semibold text-slate-700 text-sm">
                  {formatGender(patient?.gender)}
                </span>
              </div>
            </div>
          </div>

          {/* TABLA DE MEDICAMENTOS */}
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
                  {prescription.medications.length > 0 ? (
                    prescription.medications.map((med, idx) => {
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
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        No hay medicamentos prescritos en esta receta.
                      </td>
                    </tr>
                  )}
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

          {/* FIRMA Y CÉDULA MÉDICA */}
          <div className="pt-16 sm:pt-20 mt-8 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2 print:pt-16 print:mt-8 print:break-inside-avoid">
            {doctor?.digital_signature_url ? (
              <img 
                src={doctor.digital_signature_url} 
                alt="Firma Médica" 
                className="h-16 mx-auto object-contain mb-1" 
              />
            ) : (
              <div className="w-56 mx-auto border-b border-slate-400 pt-10"></div>
            )}
            <p className="font-bold text-slate-800">{doctorNombre}</p>
            <p className="text-[10px] text-slate-400">
              Cédula Prof: {doctor?.medical_license || 'S/N'} | {doctor?.specialty || 'General'}
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
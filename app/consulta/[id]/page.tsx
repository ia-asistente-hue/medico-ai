//app/consulta/[id]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { getFullEncounterDetailsAction } from '@/app/actions/patients';
import { getDecryptedPrescriptionAction } from '@/app/actions/prescriptions'; // 🔓 Importamos tu Server Action segura
import RecetaTemplate from '@/components/prescription/RecetaTemplate';

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

interface EncounterDetail {
  id: string;
  created_at: string;
  status: string;
  patient: {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
  };
  doctor: any;
  soap_note: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    created_at: string;
  } | null;
  prescription: {
    id: string;
    medications: Medicamento[];
    instructions: string | null;
    prescription_code: string;
  } | null;
}

export default function DetalleConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const encounterId = resolvedParams.id;

  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

useEffect(() => {
  async function fetchEncounterData() {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Llamamos a ambas funciones en paralelo: los datos generales y la receta descifrada
      const [data, decryptedPrescription] = await Promise.all([
        getFullEncounterDetailsAction(encounterId),
        getDecryptedPrescriptionAction(encounterId) // 🔓 Usa tu server action tal cual la tienes
      ]);

      console.log("📥 Datos generales recibidos en página:", data);
      console.log("💊 Receta descifrada recibida en página:", decryptedPrescription);

      if (!data) {
        throw new Error('No se encontraron registros para esta consulta.');
      }

      const soapData = data.soap_notes;

      setEncounter({
        id: data.id,
        created_at: data.created_at,
        status: data.status,
        patient: {
          first_name: data.patient_first_name || '',
          last_name: data.patient_last_name || '',
          date_of_birth: data.patient_date_of_birth || '',
          gender: data.patient_gender || '',
        },
        doctor: {
          medical_license: data.doctor_medical_license || '',
          specialty: data.doctor_specialty || 'General',
          phone: data.doctor_phone || '',
          street_address: data.doctor_street_address || '',
          neighborhood: data.doctor_neighborhood || '',
          city: data.doctor_city || '',
          state: data.doctor_state || '',
          postal_code: data.doctor_postal_code || '',
          digital_signature_url: data.doctor_digital_signature_url || null,
          clinic_logo_url: data.doctor_clinic_logo_url || null,
          profile: data.doctor_first_name ? {
            first_name: data.doctor_first_name,
            last_name: data.doctor_last_name,
          } : null,
        },
        soap_note: soapData ? {
          subjective: soapData.subjective || '',
          objective: soapData.objective || '',
          assessment: soapData.assessment || '',
          plan: soapData.plan || '',
          created_at: data.created_at,
        } : null,
        // Asignamos la receta ya descifrada por tu Server Action
        prescription: decryptedPrescription ? {
          id: decryptedPrescription.id,
          medications: decryptedPrescription.medications || [],
          instructions: decryptedPrescription.instructions || null,
          prescription_code: decryptedPrescription.prescription_code || 'S/F',
        } : null,
      });
    } catch (err: any) {
      setErrorMessage('No se pudo cargar el detalle de la consulta: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  if (encounterId) {
    fetchEncounterData();
  }
}, [encounterId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 text-slate-500 text-sm font-medium">
          <svg className="h-5 w-5 animate-spin text-[#0052FF]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Cargando expediente clínico...</span>
        </div>
      </div>
    );
  }

  if (errorMessage || !encounter) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm text-slate-700">{errorMessage || 'Consulta no encontrada.'}</p>
          <div>
            <Link
              href="/consulta/nueva"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0052FF] px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-[#0043D6] transition-all"
            >
              ← Volver a nueva consulta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-12 print:bg-white print:p-0 print:pb-0">
      
      <style jsx global>{`
        @media print {
          @page { margin: 0; size: auto; }
          body { background-color: #ffffff !important; -webkit-print-color-adjust: exact; padding: 15mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
      
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/consulta/nueva"
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0052FF] transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Nueva Consulta</span>
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

      <main className="max-w-4xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none space-y-6">
        
        {/* 📝 NOTA SOAP (VISIBLE EN PANTALLA, OCULTA AL IMPRIMIR) */}
        {encounter.soap_note ? (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6 print:hidden">
            <div className="border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Notas de Expediente Interno (Privado)
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-extrabold text-[#0052FF]">S</span>
                <h3 className="font-bold text-[#0052FF] text-xs tracking-wider uppercase">Subjetivo</h3>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {encounter.soap_note.subjective}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-extrabold text-[#0052FF]">O</span>
                <h3 className="font-bold text-[#0052FF] text-xs tracking-wider uppercase">Objetivo</h3>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {encounter.soap_note.objective}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-extrabold text-[#0052FF]">A</span>
                <h3 className="font-bold text-[#0052FF] text-xs tracking-wider uppercase">Análisis</h3>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {encounter.soap_note.assessment}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-extrabold text-[#0052FF]">P</span>
                <h3 className="font-bold text-[#0052FF] text-xs tracking-wider uppercase">Plan</h3>
              </div>
              <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {encounter.soap_note.plan}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 p-4 text-xs font-medium text-amber-800 border border-amber-200 print:hidden">
            Esta consulta aún no cuenta con una nota SOAP registrada.
          </div>
        )}

        {/* 💊 RECETA MÉDICA REUTILIZANDO EL COMPONENTE */}
        {encounter.prescription ? (
          <RecetaTemplate
            prescriptionCode={encounter.prescription.prescription_code}
            createdAt={encounter.created_at}
            instructions={encounter.prescription.instructions}
            medications={encounter.prescription.medications}
            patient={encounter.patient}
            doctor={encounter.doctor}
          />
        ) : (
          <div className="rounded-2xl bg-white p-6 border border-slate-200 text-xs text-slate-400 italic text-center">
            No hay receta médica registrada para esta consulta.
          </div>
        )}

      </main>
    </div>
  );
}
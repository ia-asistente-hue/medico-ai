// app/recetas/[id]/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchPrescriptionAction } from '@/app/actions/patients';
import { decryptText } from '@/utils/encryption'; // 🟢 Importamos la función de descifrado
import RecetaTemplate from '@/components/prescription/RecetaTemplate'; // 🟢 Importamos la plantilla

interface Medicamento {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
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
  } | null;
  doctor: any;
}

const parseAndDecryptMedications = (rawMeds: any): Medicamento[] => {
  let list: any[] = [];
  if (typeof rawMeds === 'string') {
    try { list = JSON.parse(rawMeds); } catch { list = []; }
  } else if (Array.isArray(rawMeds)) {
    list = rawMeds;
  }

  return list.map((med) => {
    const rawName = med.medicamento || med.nombre || med.name || '';
    const rawDosis = med.dosis || med.dosage || '';
    const rawFreq = med.frecuencia || med.frequency || '';
    const rawDur = med.duracion || med.duration || '';
    const rawInd = med.indicaciones || med.instructions || '';

    return {
      medicamento: decryptText(rawName) || rawName,
      dosis: decryptText(rawDosis) || rawDosis,
      frecuencia: decryptText(rawFreq) || rawFreq,
      duracion: decryptText(rawDur) || rawDur,
      indicaciones: decryptText(rawInd) || rawInd,
    };
  });
};

export default function RecetaDetailPage() {
  const params = useParams();
  const router = useRouter();
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
      const data = await fetchPrescriptionAction(prescriptionId);

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

      const decryptedPatient = rawPatient ? {
        first_name: decryptText(rawPatient.first_name) || rawPatient.first_name || '',
        last_name: decryptText(rawPatient.last_name) || rawPatient.last_name || '',
        date_of_birth: rawPatient.date_of_birth || '',
        gender: rawPatient.gender || '',
      } : null;

      const rawInstructions = data.instructions;
      const decryptedInstructions = rawInstructions ? (decryptText(rawInstructions) || rawInstructions) : null;

      setPrescription({
        id: data.id,
        prescription_code: data.prescription_code,
        instructions: decryptedInstructions,
        created_at: data.created_at,
        medications: parseAndDecryptMedications(data.medications),
        patient: decryptedPatient,
        doctor: rawDoctor ? {
          medical_license: rawDoctor.medical_license || '',
          university: rawDoctor.university || null,
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
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#0052FF] transition-all"
          >
            <span>← Volver al Expediente</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-slate-800 transition-all"
          >
            <span>Imprimir Receta Médica (PDF)</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        {/* 🟢 Aquí reutilizamos la plantilla que acabas de crear */}
        <RecetaTemplate
          prescriptionCode={prescription.prescription_code}
          createdAt={prescription.created_at}
          instructions={prescription.instructions}
          medications={prescription.medications}
          patient={prescription.patient}
          doctor={prescription.doctor}
        />
      </main>
    </div>
  );
}
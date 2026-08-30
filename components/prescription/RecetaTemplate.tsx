// components/prescription/RecetaTemplate.tsx
import React from 'react';

interface RecetaTemplateProps {
  prescriptionCode: string;
  createdAt: string;
  instructions: string | null;
  medications: Array<{
    medicamento: string;
    dosis: string;
    via?: string;
    frecuencia: string;
    duracion: string;
    indicaciones: string;
  }>;
  patient: {
    first_name: string;
    last_name: string;
    date_of_birth?: string;
    gender?: string;
  } | null;
  doctor: {
    medical_license: string;
    university?: string | null; // Institución educativa que expidió el título
    specialty: string;
    digital_signature_url: string | null;
    clinic_logo_url: string | null;
    phone: string | null;
    clinic_name?: string | null;
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

const formatGender = (gender?: string) => {
  if (!gender) return 'No registrado';
  const g = gender.toLowerCase();
  if (g === 'femenino') return 'Femenino';
  if (g === 'masculino') return 'Masculino';
  return 'Otro';
};

const calculateAge = (dob?: string) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export default function RecetaTemplate({
  prescriptionCode,
  createdAt,
  instructions,
  medications,
  patient,
  doctor,
}: RecetaTemplateProps) {
  const doctorProfile = doctor?.profile;
  const doctorNombre = doctorProfile
    ? `Dr(a). ${doctorProfile.first_name} ${doctorProfile.last_name}`
    : 'Dr(a). Tratante';

  const addressParts = [
    doctor?.street_address,
    doctor?.neighborhood,
    doctor?.city && doctor?.state ? `${doctor.city}, ${doctor.state}` : (doctor?.city || doctor?.state),
    doctor?.postal_code ? `C.P. ${doctor.postal_code}` : null
  ].filter(Boolean);

  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null;
  const patientAge = calculateAge(patient?.date_of_birth);

  return (
    <div className="rounded-2xl bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-8 print:shadow-none print:border-none print:p-0 print:space-y-6">
      
      {/* ENCABEZADO INSTITUCIONAL */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            {doctor?.clinic_logo_url ? (
              <div className="h-24 w-auto flex items-center justify-center">
                <img src={doctor.clinic_logo_url} alt="Logo Consultorio" className="max-h-24 max-w-[200px] object-contain" />
              </div>
            ) : null}
            <div>
              {doctor?.clinic_name && (
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{doctor.clinic_name}</h2>
              )}
              <span className="text-lg font-extrabold tracking-tight text-[#1A202C]">
                Medik<span className="text-[#0052FF]">AI</span>
              </span>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">RECETA MÉDICA</h1>
          </div>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-600 space-y-1.5 bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl w-full sm:w-80 shrink-0">
          <div className="font-bold text-slate-900 text-sm">{doctorNombre}</div>
          <div className="font-semibold text-slate-800">{doctor?.specialty || 'General'}</div>
          <div>
            <span className="text-slate-400">Cédula Prof: </span>
            <span className="font-semibold text-slate-800">{doctor?.medical_license || 'S/N'}</span>
          </div>
            <div>
              <span className="text-slate-400">Institución: </span>
              <span className="font-semibold text-slate-800">{doctor?.university || ''}</span>
            </div>
          {doctor?.phone && <div><span className="text-slate-400">Tel: </span>{doctor.phone}</div>}
          {fullAddress && <div><span className="text-slate-400">Dir: </span>{fullAddress}</div>}
          <div className="pt-1 text-[11px] text-slate-400">
            Fecha: {new Date(createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* FICHA PACIENTE */}
      <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex justify-between items-center text-sm">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">Paciente</span>
          <strong className="text-base font-bold text-slate-800 uppercase">{patient?.first_name} {patient?.last_name}</strong>
        </div>
        <div className="text-xs text-right space-y-0.5">
          <span className="text-slate-600 block font-medium">
            Nacimiento: {patient?.date_of_birth || 'N/R'} {patientAge !== null && `(${patientAge} años)`}
          </span>
          <span className="text-slate-500 block">Género: {formatGender(patient?.gender)}</span>
        </div>
      </div>

      {/* TABLA DE MEDICAMENTOS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="font-bold text-slate-800 text-xs tracking-wider uppercase">Medicamentos Prescritos</h3>
          <span className="text-[10px] font-mono text-slate-400">Folio: {prescriptionCode}</span>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <th className="p-3">Medicamento / Presentación</th>
                <th className="p-3">Dosis</th>
                <th className="p-3">Vía</th>
                <th className="p-3">Frecuencia</th>
                <th className="p-3">Duración</th>
                <th className="p-3">Indicaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {medications.length > 0 ? (
                medications.map((med, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-slate-900">{med.medicamento}</td>
                    <td className="p-3">{med.dosis}</td>
                    <td className="p-3 ">{med.via || 'Oral'}</td>
                    <td className="p-3">{med.frecuencia}</td>
                    <td className="p-3">{med.duracion}</td>
                    <td className="p-3 text-slate-500">{med.indicaciones}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                    No hay medicamentos prescritos en esta receta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {instructions && (
          <div className="mt-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <strong className="text-slate-900 block mb-1">Instrucciones Adicionales:</strong>
            {instructions}
          </div>
        )}
      </div>

      {/* FIRMA Y SELLO */}
      <div className="pt-16 sm:pt-20 mt-8 border-t border-slate-200 text-center text-xs text-slate-500 space-y-2 print:break-inside-avoid">
        {doctor?.digital_signature_url ? (
          <div className="flex flex-col items-center justify-center">
            <img src={doctor.digital_signature_url} alt="Firma Electrónica" className="h-16 mx-auto object-contain mb-1" />
            <span className="text-[10px] text-slate-400 font-mono">Firma Electrónica / Sello Digital Validado</span>
          </div>
        ) : (
          <div className="w-64 mx-auto border-b border-slate-400 pt-10"></div>
        )}
        <p className="font-bold text-slate-800 pt-1">{doctorNombre}</p>
        <p className="text-[10px] text-slate-500">
          Cédula Prof: {doctor?.medical_license || 'S/N'} {doctor?.university ? `| Univ: ${doctor.university}` : ''} | {doctor?.specialty || 'General'}
        </p>
      </div>

    </div>
  );
}
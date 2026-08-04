'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

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
  soap_note: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    created_at: string;
  } | null;
}

export default function DetalleConsultaPage({ params }: { params: Promise<{ id: string }> }) {
  // En Next.js App Router las params son asíncronas en versiones recientes
  const resolvedParams = use(params);
  const encounterId = resolvedParams.id;

  const supabase = createClient();
  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEncounterData() {
      try {
        setLoading(true);

        // Consultamos la consulta con sus relaciones (patient y soap_notes)
        const { data, error } = await supabase
          .from('encounters')
          .select(`
            id,
            created_at,
            status,
            patient:patients (
              first_name,
              last_name,
              date_of_birth,
              gender
            ),
            soap_note:soap_notes (
              subjective,
              objective,
              assessment,
              plan,
              created_at
            )
          `)
          .eq('id', encounterId)
          .single();

        if (error) throw error;

        // Formateamos si soap_note viene como arreglo o como objeto único
        const soapData = Array.isArray(data.soap_note) ? data.soap_note[0] : data.soap_note;

        setEncounter({
          ...data,
          patient: Array.isArray(data.patient) ? data.patient[0] : data.patient,
          soap_note: soapData || null,
        });
      } catch (err: any) {
        setErrorMessage('No se pudo cargar el detalle de la consulta: ' + err.message);
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
      <div className="max-w-3xl mx-auto p-12 text-center text-gray-500">
        Cargando expediente clínico...
      </div>
    );
  }

  if (errorMessage || !encounter) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
          {errorMessage || 'Consulta no encontrada.'}
        </div>
        <div className="mt-4">
          <Link href="/consulta/nueva" className="text-blue-600 underline">
            ← Volver a nueva consulta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Botones de acción superior */}
      <div className="flex justify-between items-center print:hidden">
        <Link
          href="/consulta/nueva"
          className="text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          ← Nueva Consulta
        </Link>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
      </div>

      {/* DOCUMENTO OFICIAL / HOJA CLÍNICA */}
      <div className="p-8 border rounded-lg bg-white shadow-sm space-y-6 print:shadow-none print:border-none">
        {/* Encabezado Institucional / Médico */}
        <div className="border-b pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-gray-900">RESUMEN DE CONSULTA MÉDICA</h1>
            <p className="text-xs text-gray-500">Expediente Clínico Electrónico (NOM-004-SSA3-2012)</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p><strong>ID Encuentro:</strong> {encounter.id.slice(0, 8)}...</p>
            <p><strong>Fecha:</strong> {new Date(encounter.created_at).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}</p>
          </div>
        </div>

        {/* Ficha de Identificación del Paciente */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-100 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block text-xs">Paciente</span>
            <strong className="text-gray-800 text-base">
              {encounter.patient?.first_name} {encounter.patient?.last_name}
            </strong>
          </div>
          <div>
            <span className="text-gray-500 block text-xs">Fecha de Nacimiento</span>
            <span className="text-gray-800 font-medium">
              {encounter.patient?.date_of_birth || 'No registrada'}
            </span>
          </div>
        </div>

        {/* NOTA SOAP DEFINITIVA */}
        {encounter.soap_note ? (
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="font-bold text-blue-900 text-sm tracking-wide uppercase border-b pb-1 mb-2">
                Subjetivo (S)
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {encounter.soap_note.subjective}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-blue-900 text-sm tracking-wide uppercase border-b pb-1 mb-2">
                Objetivo (O)
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {encounter.soap_note.objective}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-blue-900 text-sm tracking-wide uppercase border-b pb-1 mb-2">
                Análisis / Diagnóstico (A)
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {encounter.soap_note.assessment}
              </p>
            </div>

            <div>
              <h3 className="font-bold text-blue-900 text-sm tracking-wide uppercase border-b pb-1 mb-2">
                Plan / Tratamiento (P)
              </h3>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {encounter.soap_note.plan}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 text-sm rounded-md">
            Esta consulta no tiene una nota SOAP guardada.
          </div>
        )}

        {/* Firma del Médico (Requisito NOM) */}
        <div className="pt-12 mt-8 border-t text-center text-xs text-gray-500">
          <div className="w-48 mx-auto border-b border-gray-400 mb-2"></div>
          <p className="font-semibold text-gray-700">Firma y Cédula Profesional del Médico Evaluador</p>
          <p className="text-[10px] text-gray-400 mt-1">Documento firmado digitalmente en la plataforma.</p>
        </div>
      </div>
    </div>
  );
}
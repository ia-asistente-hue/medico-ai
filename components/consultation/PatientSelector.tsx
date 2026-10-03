// components/consultation/PatientSelector.tsx
'use client';

import React, { RefObject } from 'react';
import Link from 'next/link';

interface Patient {
  id: string;
  chart_number?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  curp?: string | null;
}

interface PatientSelectorProps {
  selectedPatient: Patient | null;
  patientQuery: string;
  setPatientQuery: (query: string) => void;
  filteredPatients: Patient[];
  isPatientDropdownOpen: boolean;
  setIsPatientDropdownOpen: (isOpen: boolean) => void;
  patientDropdownRef: RefObject<HTMLDivElement | null>;
  onSelectPatient: (patient: Patient | null) => void;
  onOpenNewPatientModal: () => void;
  onIniciarEncuentro: () => void;
}

export default function PatientSelector({
  selectedPatient,
  patientQuery,
  setPatientQuery,
  filteredPatients,
  isPatientDropdownOpen,
  setIsPatientDropdownOpen,
  patientDropdownRef,
  onSelectPatient,
  onOpenNewPatientModal,
  onIniciarEncuentro,
}: PatientSelectorProps) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/80 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Seleccionar Paciente de la Consulta</h2>
          <p className="text-xs text-slate-500 mt-0.5">Identifica el paciente para vincular el expediente clínico.</p>
        </div>
        <button
          type="button"
          onClick={onOpenNewPatientModal}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-[#0052FF] hover:bg-blue-100 transition-colors cursor-pointer"
        >
          + Nuevo Paciente
        </button>
      </div>

      <div className="space-y-4">
        {selectedPatient ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Paciente listo para consulta
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectPatient(null);
                    setPatientQuery('');
                    setIsPatientDropdownOpen(true);
                  }}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                >
                  Cambiar paciente ✕
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-base font-bold text-slate-800">
                      {selectedPatient.first_name} {selectedPatient.last_name}
                    </h4>
                    {selectedPatient.chart_number && (
                      <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                        {selectedPatient.chart_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedPatient.curp ? `CURP: ${selectedPatient.curp}` : 'Expediente clínico sincronizado'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/pacientes/${selectedPatient.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-50 px-4 py-2 text-xs font-semibold text-[#0052FF] hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Ver Expediente ↗
                  </Link>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onIniciarEncuentro}
              className="w-full rounded-xl bg-[#0052FF] text-white py-3.5 text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-600 transition-all cursor-pointer"
            >
              Iniciar Consulta Médica con {selectedPatient.first_name} →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative" ref={patientDropdownRef}>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Buscar o seleccionar paciente registrado
              </label>

              <div
                onClick={() => setIsPatientDropdownOpen(true)}
                className="flex items-center gap-2.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-[#1A202C] cursor-pointer focus-within:border-[#0052FF] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#0052FF]/10 transition-all"
              >
                <svg className="h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setIsPatientDropdownOpen(true);
                  }}
                  placeholder="Escribe el nombre, CURP o folio del paciente..."
                  className="w-full bg-transparent outline-none placeholder-slate-400 text-slate-700 font-medium cursor-text"
                />
              </div>

              {isPatientDropdownOpen && (
                <div className="absolute z-50 mt-2 w-full max-h-60 overflow-y-auto rounded-xl bg-white border border-slate-100 shadow-xl shadow-slate-200/60 p-1">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const fullName = `${patient.first_name} ${patient.last_name}`;
                      return (
                        <div
                          key={patient.id}
                          onClick={() => {
                            onSelectPatient(patient);
                            setPatientQuery(fullName);
                            setIsPatientDropdownOpen(false);
                          }}
                          className="flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[#0052FF] rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{fullName}</span>
                            {patient.chart_number && (
                              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {patient.chart_number}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">
                      No se encontraron pacientes
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={!selectedPatient}
              onClick={onIniciarEncuentro}
              className="w-full rounded-xl bg-[#0052FF] text-white py-3 text-sm font-semibold shadow-lg shadow-blue-500/20 hover:bg-blue-600 disabled:bg-slate-300 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              Iniciar Consulta Médica →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
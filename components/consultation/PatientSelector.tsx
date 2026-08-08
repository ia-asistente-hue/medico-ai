'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  blood_type?: string;
  allergies?: string[];
  chronic_conditions?: string[];
}

interface PatientSelectorProps {
  patients: Patient[];
  selectedPatient: Patient | null;
  onSelectPatient: (patientId: string) => void;
  onCreatePatient: (newPatient: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    blood_type: string;
    allergies: string[];
    chronic_conditions: string[];
  }) => Promise<void>;
  onStartEncounter: () => void;
  errorMessage?: string | null;
}

export default function PatientSelector({
  patients,
  selectedPatient,
  onSelectPatient,
  onCreatePatient,
  onStartEncounter,
  errorMessage,
}: PatientSelectorProps) {
  const router = useRouter();
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'other',
    blood_type: 'O+',
    allergies: '',
    chronic_conditions: '',
  });

  const handleSubmitNew = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convierte las cadenas separadas por comas en arreglos válidos para PostgreSQL (text[])
    const formattedPatient = {
      ...newPatient,
      allergies: newPatient.allergies
        ? newPatient.allergies.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      chronic_conditions: newPatient.chronic_conditions
        ? newPatient.chronic_conditions.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
    };

    await onCreatePatient(formattedPatient);
    setIsCreatingPatient(false);
    setNewPatient({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'other',
      blood_type: 'O+',
      allergies: '',
      chronic_conditions: '',
    });
  };

  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            {isCreatingPatient ? 'Registrar Nuevo Paciente' : 'Seleccionar Paciente de la Consulta'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Identifica al paciente para vincular el expediente clínico.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreatingPatient(!isCreatingPatient)}
          className="text-xs font-semibold text-[#0052FF] hover:text-[#0043D6] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-all"
        >
          {isCreatingPatient ? '← Volver a Selección' : '+ Nuevo Paciente'}
        </button>
      </div>

      {isCreatingPatient ? (
        <form onSubmit={handleSubmitNew} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nombre(s)</label>
              <input
                type="text"
                placeholder="Ej. María"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.first_name}
                onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Apellidos</label>
              <input
                type="text"
                placeholder="Ej. López Pérez"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.last_name}
                onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Fecha de Nacimiento</label>
              <input
                type="date"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.date_of_birth}
                onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Género</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.gender}
                onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
              >
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tipo de Sangre</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.blood_type}
                onChange={(e) => setNewPatient({ ...newPatient, blood_type: e.target.value })}
              >
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alergias Registradas</label>
              <input
                type="text"
                placeholder="Ej. Penicilina, Polvo, Marisco"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.allergies}
                onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Condiciones Crónicas</label>
              <input
                type="text"
                placeholder="Ej. Hipertensión, Diabetes Tipo 2"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
                value={newPatient.chronic_conditions}
                onChange={(e) => setNewPatient({ ...newPatient, chronic_conditions: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#00D09C] py-3 text-sm font-semibold text-slate-900 shadow-md hover:bg-[#00B88A] transition-all"
          >
            Guardar Paciente y Seleccionar
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-600 uppercase">
                Buscar o Seleccionar Paciente Registrado
              </label>

              {/* BOTÓN VER EXPEDIENTE CLÍNICO */}
              {selectedPatient && (
                <button
                  type="button"
                  onClick={() => router.push(`/pacientes/${selectedPatient.id}`)}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  📂 Ver Expediente
                </button>
              )}
            </div>

            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10"
              value={selectedPatient?.id || ''}
              onChange={(e) => onSelectPatient(e.target.value)}
            >
              <option value="">-- Selecciona un paciente de la lista --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name} 
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onStartEncounter}
            disabled={!selectedPatient}
            className="w-full rounded-xl bg-[#0052FF] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0052FF]/20 hover:bg-[#0043D6] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Iniciar Consulta Médica →
          </button>
        </div>
      )}
    </div>
  );
}
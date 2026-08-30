// components/PrescriptionBuilder.tsx
'use client';

import React, { useState } from 'react';

interface Medicamento {
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  indicaciones: string;
}

interface PrescriptionBuilderProps {
  medicamentos: Medicamento[];
  nuevoMed: Medicamento; // Se mantiene por compatibilidad si el padre lo manda, pero ya no dependemos de él para los inputs
  instruccionesReceta: string;
  onUpdateNuevoMed: (field: keyof Medicamento, val: string) => void;
  onAgregarMedicamento: () => void;
  onEliminarMedicamento: (idx: number) => void;
  onUpdateInstrucciones: (val: string) => void;
  onGuardarNota: () => void;
  saving: boolean;
}

const emptyMed: Medicamento = {
  medicamento: '',
  dosis: '',
  frecuencia: '',
  duracion: '',
  indicaciones: '',
};

export default function PrescriptionBuilder({
  medicamentos = [],
  instruccionesReceta,
  onAgregarMedicamento,
  onEliminarMedicamento,
  onUpdateInstrucciones,
  onGuardarNota,
  saving,
}: PrescriptionBuilderProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formState, setFormState] = useState<Medicamento>(emptyMed);

  const handleInputChange = (field: keyof Medicamento, val: string) => {
    setFormState((prev) => ({ ...prev, [field]: val }));
  };

  const handleStartEdit = (idx: number, med: any) => {
    setEditingIndex(idx);
    setFormState({
      medicamento: med.medicamento || med.nombre || '',
      dosis: med.dosis || '',
      frecuencia: med.frecuencia || '',
      duracion: med.duracion || '',
      indicaciones: med.indicaciones || '',
    });
  };

  const handleSave = () => {
    if (!formState.medicamento.trim() || !formState.dosis.trim()) return;

    if (editingIndex !== null) {
      medicamentos[editingIndex] = { ...formState };
      setEditingIndex(null);
    } else {
      // Agregamos directamente a la lista del padre usando el estado local actual
      medicamentos.push({ ...formState });
    }
    
    // 🧹 Limpieza inmediata del formulario local
    setFormState(emptyMed);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setFormState(emptyMed);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800">Receta Médica</h2>
        <p className="text-xs text-slate-500">
          Medicamentos prescritos en la consulta.
        </p>
      </div>

      {/* LISTA DE MEDICAMENTOS */}
      {medicamentos.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 italic">
          No hay medicamentos prescritos registrados.
        </div>
      ) : (
        <div className="space-y-3">
          {medicamentos.map((med: any, idx: number) => {
            const nombre = med.medicamento || med.nombre || 'Medicamento sin nombre';
            const dosis = med.dosis || '';
            const frecuencia = med.frecuencia || '';
            const duracion = med.duracion || '';
            const indicaciones = med.indicaciones || '';
            const isBeingEdited = editingIndex === idx;

            return (
              <div
                key={idx}
                className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                  isBeingEdited
                    ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-100'
                    : 'bg-slate-50/80 border-slate-200/60'
                }`}
              >
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-800">
                    {nombre} {dosis && <span className="font-semibold text-blue-600">— {dosis}</span>}
                  </p>
                  {(frecuencia || duracion) && (
                    <p className="text-slate-600">
                      {frecuencia} {duracion ? `durante ${duracion}` : ''}
                    </p>
                  )}
                  {indicaciones && (
                    <p className="text-slate-500 italic text-[11px]">
                      Nota: {indicaciones}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(idx, med)}
                    title="Editar medicamento"
                    className="text-slate-500 hover:text-blue-600 text-xs px-2 py-1 transition-colors rounded-md hover:bg-white border border-slate-200 shadow-sm"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingIndex === idx) handleCancelEdit();
                      onEliminarMedicamento(idx);
                    }}
                    title="Eliminar medicamento"
                    className="text-slate-400 hover:text-rose-500 text-xs px-2 py-1 transition-colors rounded-md hover:bg-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FORMULARIO PARA AGREGAR / EDITAR MEDICAMENTO */}
      <div className="pt-4 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700">
            {editingIndex !== null ? '✏️ Editando Medicamento' : 'Agregar Medicamento'}
          </h3>
          {editingIndex !== null && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-[11px] font-semibold text-rose-600 hover:underline"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Medicamento</label>
            <input
              type="text"
              placeholder="Ej. Paracetamol, Ibuprofeno..."
              value={formState.medicamento}
              onChange={(e) => handleInputChange('medicamento', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Dosis</label>
            <input
              type="text"
              placeholder="Ej. 500 mg, 1 tableta..."
              value={formState.dosis}
              onChange={(e) => handleInputChange('dosis', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Frecuencia</label>
            <input
              type="text"
              placeholder="Ej. Cada 8 horas..."
              value={formState.frecuencia}
              onChange={(e) => handleInputChange('frecuencia', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Duración</label>
            <input
              type="text"
              placeholder="Ej. 5 días..."
              value={formState.duracion}
              onChange={(e) => handleInputChange('duracion', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-[11px] font-semibold text-slate-600">Indicaciones Específicas</label>
            <input
              type="text"
              placeholder="Ej. Tomar con alimentos..."
              value={formState.indicaciones}
              onChange={(e) => handleInputChange('indicaciones', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          {editingIndex !== null ? 'Guardar Cambios del Medicamento' : '+ Añadir a la Receta'}
        </button>
      </div>

      {/* INSTRUCCIONES GENERALES */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <label className="text-xs font-semibold text-slate-700">Instrucciones Generales de la Receta</label>
        <textarea
          rows={2}
          value={instruccionesReceta}
          onChange={(e) => onUpdateInstrucciones(e.target.value)}
          placeholder="Indicaciones sobre reposo, dieta..."
          className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* BOTÓN FINAL */}
      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <button
          type="button"
          onClick={onGuardarNota}
          disabled={saving}
          className="px-6 py-2.5 bg-[#0052FF] hover:bg-blue-700 text-white font-medium text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? 'Guardando...' : 'Finalizar Consulta y Guardar Nota'}
        </button>
      </div>
    </div>
  );
}
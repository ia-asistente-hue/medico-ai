// components/consultation/SoapEditor.tsx
'use client';

interface SoapFormState {
  subjetivo: string;
  objetivo: string;
  analisis: string;
  plan: string;
}

interface SoapEditorProps {
  editableSoap: SoapFormState;
  onUpdateSoap: (field: keyof SoapFormState, value: string) => void;
}

export default function SoapEditor({ editableSoap, onUpdateSoap }: SoapEditorProps) {
  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Nota Clínica Estructurada (SOAP)</h2>
          <p className="text-xs text-slate-500">Revisa y valida la información generada por la IA.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
          NOM-004 / NOM-024
        </span>
      </div>

      <div className="space-y-5">
        {(['subjetivo', 'objetivo', 'analisis', 'plan'] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#0052FF]">
              {field === 'subjetivo' ? 'Subjetivo (S)' : field === 'objetivo' ? 'Objetivo (O)' : field === 'analisis' ? 'Análisis (A)' : 'Plan (P)'}
            </label>
            <textarea
              rows={field === 'plan' ? 3 : 4}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-sm text-slate-800 focus:bg-white focus:border-[#0052FF] focus:outline-none focus:ring-4 focus:ring-[#0052FF]/10 transition-all"
              value={editableSoap[field]}
              onChange={(e) => onUpdateSoap(field, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
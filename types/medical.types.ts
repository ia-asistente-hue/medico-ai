// types/medical.types.ts

export interface Medicamento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  via?: string;
}

export interface PrescripcionIA {
  medicamentos: Medicamento[];
  instrucciones: string | null;
}

export interface NotaSOAP {
  subjetivo: string;
  objetivo: string;
  analisis: string;
  plan: string;
}

export interface ResultadoIA {
  notaSOAP: NotaSOAP;
  prescripcion?: PrescripcionIA;
  transcripcionOriginal?: string;
}

// Estructuras de respuesta para persistencia
export interface PrescriptionRecord {
  id: string;
  encounter_id: string;
  doctor_id: string;
  medications: Medicamento[];
  instructions: string | null;
  prescription_code: string;
  created_at?: string;
}

export interface SOAPNoteRecord {
  id: string;
  encounter_id: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  summary?: string;
  ai_model_version: string;
  is_finalized: boolean;
  created_at?: string;
}
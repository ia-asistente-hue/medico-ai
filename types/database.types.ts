// types/database.types.ts
import { Medicamento } from './medical.types';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      doctors: {
        Row: {
          id: string
          profile_id: string
          full_name: string | null
          email: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          profile_id: string
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          full_name?: string | null
          email?: string | null
        }
      }
      patients: {
        Row: {
          id: string
          doctor_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          phone: string | null
          email: string | null
          gender: 'male' | 'female' | 'other' | null
          blood_type: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null
          allergies: string[] | null
          chronic_conditions: string[] | null
          emergency_contact: Json | null
          created_at?: string
          updated_at?: string
        }
        Insert: {
          id?: string
          doctor_id: string
          first_name: string
          last_name: string
          date_of_birth: string
          phone?: string | null
          email?: string | null
          gender?: 'male' | 'female' | 'other' | null
          blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null
          allergies?: string[] | null
          chronic_conditions?: string[] | null
          emergency_contact?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          doctor_id?: string
          first_name?: string
          last_name?: string
          date_of_birth?: string
          phone?: string | null
          email?: string | null
          gender?: 'male' | 'female' | 'other' | null
          blood_type?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null
          allergies?: string[] | null
          chronic_conditions?: string[] | null
          emergency_contact?: Json | null
          updated_at?: string
        }
      }
      encounters: {
        Row: {
          id: string
          patient_id: string
          doctor_id: string | null
          created_at?: string
        }
        Insert: {
          id?: string
          patient_id: string
          doctor_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          doctor_id?: string | null
        }
      }
      soap_notes: {
        Row: {
          id: string
          encounter_id: string
          subjective: string | null
          objective: string | null
          assessment: string | null
          plan: string | null
          summary: string | null
          ai_model_version: string | null
          is_finalized: boolean
          created_at?: string
        }
        Insert: {
          id?: string
          encounter_id: string
          subjective?: string | null
          objective?: string | null
          assessment?: string | null
          plan?: string | null
          summary?: string | null
          ai_model_version?: string | null
          is_finalized?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          encounter_id?: string
          subjective?: string | null
          objective?: string | null
          assessment?: string | null
          plan?: string | null
          summary?: string | null
          ai_model_version?: string | null
          is_finalized?: boolean
        }
      }
      prescriptions: {
        Row: {
          id: string
          encounter_id: string
          doctor_id: string
          medications: Medicamento[]
          instructions: string | null
          prescription_code: string
          created_at?: string
        }
        Insert: {
          id?: string
          encounter_id: string
          doctor_id: string
          medications: Medicamento[]
          instructions?: string | null
          prescription_code: string
          created_at?: string
        }
        Update: {
          id?: string
          encounter_id?: string
          doctor_id?: string
          medications?: Medicamento[]
          instructions?: string | null
          prescription_code?: string
        }
      }
    }
  }
}
// app/registro/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    acceptTerms: false,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.acceptTerms) {
      setErrorMessage('Debes leer y aceptar los Términos y Condiciones y el Aviso de Privacidad.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Registro en Supabase Auth enviando nombre, apellido y datos de auditoría en los metadatos
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
            aceptado_terminos: true,
            version_terminos: 'v1.0-2026',
          },
        },
      });

      if (authError) {
        console.error('Detalle completo del error de Supabase:', authError);
        const detailedMsg = authError.message || (authError as any).error_description;
        throw new Error(detailedMsg || 'No se pudo registrar el usuario.');
      }

      if (!authData?.user) {
        throw new Error('No se generó el usuario en Supabase Auth.');
      }

      // El trigger en la base de datos se encargará automáticamente de insertar 
      // estos datos en la tabla `profiles`. Ya no requerimos un upsert manual aquí.

      router.push('/verify-email');
    } catch (err: any) {
      console.error('💥 Excepción en registro:', err);
      setErrorMessage(err.message || 'Error durante el proceso de registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1A202C]">
          Medik<span className="text-[#0052FF]">AI</span>
        </h1>
        <h2 className="mt-2 text-xl font-bold text-slate-800">Crea tu cuenta</h2>
        <p className="mt-1 text-xs text-slate-500">Ingresa tus datos para comenzar.</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
              <strong>Error: </strong>
              {errorMessage}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre(s) *</label>
              <input
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
                placeholder="Ej. Carlos"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Apellido(s) *</label>
              <input
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
                placeholder="Ej. Mendoza"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
                placeholder="doctor@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contraseña *</label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Confirmar Contraseña *</label>
              <input
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start gap-2 pt-2">
              <input
                name="acceptTerms"
                type="checkbox"
                id="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#0052FF] focus:ring-[#0052FF]"
              />
              <label htmlFor="acceptTerms" className="text-xs text-slate-600 select-none leading-relaxed">
                He leído y acepto los{' '}
                <button
                  type="button"
                  onClick={() => setModalType('terms')}
                  className="font-semibold text-[#0052FF] hover:underline focus:outline-none"
                >
                  Términos y Condiciones
                </button>{' '}
                y el{' '}
                <button
                  type="button"
                  onClick={() => setModalType('privacy')}
                  className="font-semibold text-[#0052FF] hover:underline focus:outline-none"
                >
                  Aviso de Privacidad
                </button>
                .
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#0052FF] hover:bg-blue-700 transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Creando cuenta...' : 'Registrarse'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-semibold text-[#0052FF] hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                {modalType === 'terms' ? 'Términos y Condiciones de Uso - MedikAI' : 'Aviso de Privacidad - MedikAI'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
              {modalType === 'terms' ? (
                <>
                  <p><strong>1. Naturaleza del Software:</strong> MedikAI es exclusivamente una herramienta tecnológica de apoyo administrativo y transcripción. <strong>NO realiza diagnósticos</strong>, no sugiere tratamientos por cuenta propia y no sustituye el juicio clínico del profesional de la salud.</p>
                  <p><strong>2. Cumplimiento Normativo:</strong> El Médico actúa como Responsable del Tratamiento de los Datos Personales Sensibles de sus pacientes. ArchiTech Dynamics Solutions actúa como Encargado tecnológico.</p>
                  <p><strong>3. Uso de Credenciales:</strong> El médico es responsable de la confidencialidad de su cuenta y cédula profesional.</p>
                  <p><strong>4. Propiedad Intelectual:</strong> Todos los derechos pertenecen a ArchiTech Dynamics Solutions.</p>
                  <p><strong>5. Condiciones Comerciales:</strong> Suscripción SaaS mensual/anual. Periodo de gracia de 30 días ante cancelación (NOM-004).</p>
                  <p><strong>6. Disponibilidad:</strong> Objetivo de 99.9% uptime.</p>
                </>
              ) : (
                <>
                  <p><strong>Aviso de Privacidad Simplificado:</strong> ArchiTech Dynamics Solutions protege la información recabada conforme a la LFPDPPP.</p>
                  <p><strong>Datos Sensibles:</strong> Gestionados bajo cifrado y estrictos controles de seguridad.</p>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="bg-[#0052FF] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-blue-700 transition-all cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
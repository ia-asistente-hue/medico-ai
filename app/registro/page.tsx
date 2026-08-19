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
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

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

      // Mapeo directo a los metadatos de Supabase Auth
      const payloadAuth = {
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName.trim(),
            last_name: formData.lastName.trim(),
          },
        },
      };

      const { data: authData, error: authError } = await supabase.auth.signUp(payloadAuth);

      if (authError) {
        const detailedMsg = authError.message || (authError as any).error_description;
        throw new Error(detailedMsg || 'No se pudo registrar el usuario.');
      }

      if (!authData?.user) {
        throw new Error('No se generó el usuario en Supabase Auth.');
      }

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

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-[#0052FF] hover:bg-blue-700 transition-all focus:outline-none disabled:opacity-50"
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
    </div>
  );
}
// app/perfil/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

interface DoctorProfileForm {
  first_name: string;
  last_name: string;
  phone: string;
  medical_license: string;
  specialty_license: string;
  specialty: string;
  university: string;
  clinic_name: string;
  street_address: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
}

interface DoctorProfileProps {
  mode?: 'profile' | 'onboarding';
}

export default function DoctorProfileFormView({ mode = 'profile' }: DoctorProfileProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [form, setForm] = useState<DoctorProfileForm>({
    first_name: '',
    last_name: '',
    phone: '',
    medical_license: '',
    specialty_license: '',
    specialty: 'General',
    university: '',
    clinic_name: '',
    street_address: '',
    neighborhood: '',
    city: '',
    state: '',
    postal_code: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserId(user.id);

        // 1. Consultar tabla profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', user.id)
          .single();

        // 2. Consultar tabla doctors
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('profile_id', user.id)
          .single();

        if (doctorError && doctorError.code !== 'PGRST116') {
          throw doctorError;
        }

        if (doctorData) {
          setDoctorId(doctorData.id);
          if (doctorData.clinic_logo_url) {
            setLogoUrl(doctorData.clinic_logo_url);
          }
        }

        // 3. Resolución de nombres (Prioridad: Profiles -> Metadata -> Vacío)
        const firstName = profileData?.first_name || user.user_metadata?.first_name || '';
        const lastName = profileData?.last_name || user.user_metadata?.last_name || '';
        const phone = doctorData?.phone || profileData?.phone || '';

        setForm({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          medical_license: doctorData?.medical_license || '',
          specialty_license: doctorData?.specialty_license || '',
          specialty: doctorData?.specialty || 'General',
          university: doctorData?.university || '',
          clinic_name: doctorData?.clinic_name || '',
          street_address: doctorData?.street_address || '',
          neighborhood: doctorData?.neighborhood || '',
          city: doctorData?.city || '',
          state: doctorData?.state || '',
          postal_code: doctorData?.postal_code || '',
        });

      } catch (err: any) {
        console.error("💥 Error detallado en handleSave:", {
          message: err.message,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        });
        setErrorMessage('Error al cargar la información: ' + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('El archivo del logotipo es demasiado pesado. Máximo 2MB.');
        return;
      }
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        finalLogoUrl = publicURLData.publicUrl;
      }

      // 1. Upsert o Update en profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 2. Upsert en doctors
      const { error: doctorError } = await supabase
        .from('doctors')
        .upsert({
          ...(doctorId ? { id: doctorId } : {}),
          profile_id: userId,
          medical_license: form.medical_license,
          specialty_license: form.specialty_license,
          specialty: form.specialty,
          university: form.university,
          phone: form.phone,
          clinic_name: form.clinic_name,
          street_address: form.street_address,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          clinic_logo_url: finalLogoUrl,
          updated_at: new Date().toISOString(),
        });

      if (doctorError) throw doctorError;

      if (mode === 'onboarding') {
        router.push('/consulta/nueva');
      } else {
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
        setSuccessMessage('¡Perfil, datos profesionales y logotipo actualizados correctamente!');
      }
    } catch (err: any) {
      console.error("💥 Error detallado en handleSave:", {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code,
        fullError: err
      });
      setErrorMessage('Error al guardar los cambios: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center text-slate-500 font-sans">
        Cargando perfil...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] font-sans pb-12">
      {mode === 'profile' && (
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur-md px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-[#1A202C]">
              Medik<span className="text-[#0052FF]">AI</span>
            </span>
            <div className="flex items-center gap-3">
              <Link
                href="/consulta/nueva"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-[#0052FF] transition-all"
              >
                Nueva Consulta
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>
      )}

      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 pt-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === 'onboarding' ? '¡Bienvenido a MedikAI! Configura tu perfil' : 'Perfil Profesional'}
          </h1>
          <p className="text-sm text-slate-500">
            {mode === 'onboarding'
              ? 'Por favor completa tus credenciales y datos de consultorio para habilitar la generación de recetas.'
              : 'Configura tu información personal, credenciales médicas y datos de consultorio para la emisión de recetas.'}
          </p>
        </div>

        {successMessage && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs text-emerald-700">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* TARJETA 1: DATOS PERSONALES */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-2">Información Personal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Nombre(s)</label>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Apellido(s)</label>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Teléfono</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>
            </div>
          </section>

          {/* TARJETA 2: CREDENCIALES MÉDICAS */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-2">Credenciales y Especialidad</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Cédula Profesional</label>
                <input
                  type="text"
                  name="medical_license"
                  value={form.medical_license}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  required={mode === 'onboarding'}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Cédula de Especialidad</label>
                <input
                  type="text"
                  name="specialty_license"
                  value={form.specialty_license}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Especialidad</label>
                <input
                  type="text"
                  name="specialty"
                  value={form.specialty}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Universidad</label>
                <input
                  type="text"
                  name="university"
                  value={form.university}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>
            </div>
          </section>

          {/* TARJETA 3: CONSULTORIO, UBICACIÓN Y LOGOTIPO */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-2">Consultorio / Clínica y Logotipo</h2>
            
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-center gap-5 mb-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo Consultorio" className="w-full h-full object-contain p-1" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium text-center px-1">Sin logo</span>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-semibold text-slate-600 uppercase block">Logotipo para Recetas</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleLogoChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0052FF] hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">Formato PNG o JPG recomendado. Máximo 2MB.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Nombre del Consultorio</label>
                <input
                  type="text"
                  name="clinic_name"
                  value={form.clinic_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Calle y Número</label>
                  <input
                    type="text"
                    name="street_address"
                    value={form.street_address}
                    onChange={handleChange}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Colonia</label>
                  <input
                    type="text"
                    name="neighborhood"
                    value={form.neighborhood}
                    onChange={handleChange}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Ciudad</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Estado</label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Código Postal</label>
                  <input
                    type="text"
                    name="postal_code"
                    value={form.postal_code}
                    onChange={handleChange}
                    className="w-full bg-slate-50 rounded-xl border border-slate-200/60 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20 focus:border-[#0052FF]"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* BOTÓN DE ACCIÓN */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#0052FF] px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
            >
              {saving
                ? 'Guardando...'
                : mode === 'onboarding'
                ? 'Completar Registro e Ir al Dashboard'
                : 'Guardar Todos los Cambios'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
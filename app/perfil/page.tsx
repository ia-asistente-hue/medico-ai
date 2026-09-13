// app/perfil/page.tsx (o tu componente de perfil/onboarding)
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // 🛡️ Cambiado de headerFile/footerFile a pdfTemplateFile
  const [pdfTemplateFile, setPdfTemplateFile] = useState<File | null>(null);
  const [pdfTemplateUrl, setPdfTemplateUrl] = useState<string | null>(null);

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
        setUserEmail(user.email || null);

        // 1. Consultar tabla profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('id', user.id)
          .maybeSingle();

        // 2. Consultar tabla doctors
        const { data: doctorData, error: doctorError } = await supabase
          .from('doctors')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (doctorError) {
          throw doctorError;
        }

        if (doctorData) {
          setDoctorId(doctorData.id);
          if (doctorData.clinic_logo_url) {
            setLogoUrl(doctorData.clinic_logo_url);
          }
          if (doctorData.custom_pdf_template_url) {
            setPdfTemplateUrl(doctorData.custom_pdf_template_url);
          }
        }

        // 3. Resolución de nombres
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
        console.error("💥 Error al cargar información:", err);
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setLogoFile(file);
      setLogoUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  // 🛡️ Manejador para el archivo PDF personalizado del doctor
  const handlePdfTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setErrorMessage('El formato de la plantilla debe ser un archivo PDF.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('El archivo PDF es demasiado pesado. Máximo 10MB.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setPdfTemplateFile(file);
      setPdfTemplateUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoUrl(null);
  };

  const handleRemovePdfTemplate = () => {
    setPdfTemplateFile(null);
    setPdfTemplateUrl(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      let finalLogoUrl = logoUrl;
      let finalPdfTemplateUrl = pdfTemplateUrl;

      if (!logoUrl) finalLogoUrl = null;
      if (!pdfTemplateUrl) finalPdfTemplateUrl = null;

      // 1. Subir Logotipo si es nuevo archivo
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${userId}-logo-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);

        finalLogoUrl = publicURLData.publicUrl;
      }

      // 2. Subir Plantilla PDF personalizada si es nuevo archivo
      if (pdfTemplateFile) {
        const fileExt = pdfTemplateFile.name.split('.').pop();
        const fileName = `${userId}-pdf-template-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('doctor-assets') // Asegúrate de tener este bucket creado en Supabase
          .upload(fileName, pdfTemplateFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: publicURLData } = supabase.storage
          .from('doctor-assets')
          .getPublicUrl(fileName);

        finalPdfTemplateUrl = publicURLData.publicUrl;
      }

      // 3. Upsert en profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: userEmail,
          first_name: form.first_name,
          last_name: form.last_name,
          phone: form.phone,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      // 4. Upsert en doctors (utilizando la columna correcta custom_pdf_template_url)
      const doctorPayload: any = {
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
        custom_pdf_template_url: finalPdfTemplateUrl, // 👈 Nombre correcto
        updated_at: new Date().toISOString(),
      };

      if (doctorId) {
        doctorPayload.id = doctorId;
      }

      const { data: savedDoctor, error: doctorError } = await supabase
        .from('doctors')
        .upsert(doctorPayload)
        .select('id')
        .single();

      if (doctorError) throw doctorError;

      if (savedDoctor) {
        setDoctorId(savedDoctor.id);
      }

      if (mode === 'onboarding') {
        router.push('/consulta/nueva');
      } else {
        setLogoUrl(finalLogoUrl);
        setLogoFile(null);
        setPdfTemplateUrl(finalPdfTemplateUrl);
        setPdfTemplateFile(null);
        setSuccessMessage('¡Perfil, datos profesionales y plantilla PDF actualizados correctamente!');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error("💥 Error detallado en handleSave:", err);
      setErrorMessage('Error al guardar los cambios: ' + err.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3.5 shadow-2xs">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0052FF] group-hover:bg-blue-100 transition-colors p-1">
                <img src="/logo.png" alt="MedikAI Logo" className="h-full w-auto object-contain" />
              </div>
              <span className="font-bold text-slate-800 tracking-tight text-sm sm:text-base">
                Medik<span className="text-[#0052FF]">AI</span>
              </span>
            </Link>
            <div className="flex items-center gap-2.5">
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
                className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all shadow-2xs cursor-pointer"
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
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-2">Información Personal</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Nombre(s) <span className="text-rose-500">*</span>
                </label>
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
                <label className="text-xs font-semibold text-slate-500 uppercase">Apellido(s)<span className="text-rose-500">*</span></label>
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

          {/* CREDENCIALES MÉDICAS */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-2">Credenciales y Especialidad</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Cédula Profesional<span className="text-rose-500">*</span></label>
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

          {/* CONSULTORIO E IMÁGENES DE RECETA */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80 space-y-4">
            <h2 className="text-xs font-bold text-[#0052FF] uppercase tracking-wider mb-2">Consultorio / Clínica y Plantilla de Receta</h2>
            
            {/* Logotipo para Recetas */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-center gap-5 mb-4">
              <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm shrink-0 relative group">
                {logoUrl ? (
                  <>
                    <img src={logoUrl} alt="Logo Consultorio" className="w-full h-full object-contain p-1" />
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute inset-0 bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-bold cursor-pointer"
                    >
                      Quitar
                    </button>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium text-center px-1">Sin logo</span>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 uppercase block">Logotipo para Recetas (Opcional)</label>
                  {logoUrl && (
                    <button 
                      type="button" 
                      onClick={handleRemoveLogo} 
                      className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                    >
                      Eliminar imagen
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/jpg" 
                  onChange={handleLogoChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0052FF] hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">Formato PNG o JPG recomendado. Máximo 2MB.</p>
              </div>
            </div>

            {/* Plantilla PDF Personalizada (custom_pdf_template_url) */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-center gap-5 mb-4">
              <div className="w-28 h-20 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm shrink-0 relative group">
                {pdfTemplateUrl ? (
                  <div className="flex flex-col items-center justify-center text-center p-1">
                    <svg className="h-6 w-6 text-red-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[9px] font-bold text-slate-600 truncate max-w-[90px]">PDF Cargado</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium text-center px-1">Sin plantilla PDF</span>
                )}
              </div>
              <div className="flex-1 w-full space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-600 uppercase block">Plantilla de Receta en PDF (Opcional)</label>
                  {pdfTemplateUrl && (
                    <button 
                      type="button" 
                      onClick={handleRemovePdfTemplate} 
                      className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                    >
                      Eliminar PDF
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="application/pdf" 
                  onChange={handlePdfTemplateChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0052FF] hover:file:bg-blue-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400">Si subes un PDF, las recetas usarán tu formato personalizado. Máximo 10MB.</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
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
              className="rounded-xl bg-[#0052FF] px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving
                ? 'Guardando...'
                : mode === 'onboarding'
                ? 'Completar Registro'
                : 'Guardar Todos los Cambios'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
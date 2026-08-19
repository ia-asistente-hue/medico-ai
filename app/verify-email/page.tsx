'use client';

import Link from 'next/link';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center items-center px-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200/80 p-8 text-center space-y-6">
        {/* Ícono de correo */}
        <div className="w-16 h-16 bg-blue-50 text-[#0052FF] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            ¡Revisa tu correo electrónico!
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Hemos enviado un enlace de confirmación a tu dirección de correo electrónico. 
            Por favor, haz clic en el enlace para activar tu cuenta y continuar.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 text-xs text-slate-500 text-left space-y-1">
          <p className="font-semibold text-slate-700">¿No encuentras el correo?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Revisa tu carpeta de <strong>Spam</strong> o correo no deseado.</li>
            <li>Asegúrate de haber ingresado el correo correctamente.</li>
          </ul>
        </div>

        <div className="pt-2">
          <Link
            href="/login"
            className="inline-block text-xs font-semibold text-[#0052FF] hover:underline"
          >
            ← Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
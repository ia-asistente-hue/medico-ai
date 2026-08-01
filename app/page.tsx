'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function Home() {
  const [status, setStatus] = useState<string>('Cargando prueba de conexión...')
  const [errorDetails, setErrorDetails] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = createClient()
        // Intentamos hacer una consulta simple a la tabla de perfiles
        const { data, error } = await supabase.from('profiles').select('*').limit(1)

        if (error) {
          setStatus('❌ Error al conectar con Supabase')
          setErrorDetails(error.message)
        } else {
          setStatus('✅ ¡Conexión exitosa con Supabase y la base de datos!')
        }
      } catch (err: any) {
        setStatus('❌ Error inesperado')
        setErrorDetails(err.message || 'Error desconocido')
      }
    }

    testConnection()
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-white">
      <div className="max-w-md w-full p-6 bg-slate-800 rounded-xl shadow-lg text-center border border-slate-700">
        <h1 className="text-2xl font-bold mb-4 text-emerald-400">Prueba de Conexión - Asistente Médico</h1>
        <p className="text-lg font-medium mb-2">{status}</p>
        {errorDetails && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm text-left">
            <strong>Detalle del error:</strong> {errorDetails}
          </div>
        )}
      </div>
    </main>
  )
}
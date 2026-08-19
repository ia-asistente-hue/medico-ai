// app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const userId = formData.get('userId') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phone = formData.get('phone') as string;
    const specialty = formData.get('specialty') as string;
    const medicalLicense = formData.get('medicalLicense') as string;
    const specialtyLicense = formData.get('specialtyLicense') as string;
    const university = formData.get('university') as string;
    const clinicName = formData.get('clinicName') as string;
    const streetAddress = formData.get('streetAddress') as string;
    const neighborhood = formData.get('neighborhood') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const postalCode = formData.get('postalCode') as string;

    if (!userId) {
      return NextResponse.json({ error: 'Falta el ID del usuario.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Usa UPSERT para que si el Trigger ya insertó el perfil, solo actualice los campos
    const { error: profileError } = await supabase.from('profiles').upsert(
      [
        {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          role: 'doctor',
          phone,
        },
      ],
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('❌ Error en profiles:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Insertar datos en la tabla 'doctors'
    const { error: doctorError } = await supabase.from('doctors').insert([
      {
        user_id: userId,
        specialty,
        medical_license: medicalLicense,
        specialty_license: specialtyLicense,
        university,
        clinic_name: clinicName,
        street_address: streetAddress,
        neighborhood,
        city,
        state,
        postal_code: postalCode,
      },
    ]);

    if (doctorError) {
      console.error('❌ Error en doctors:', doctorError);
      return NextResponse.json({ error: doctorError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('💥 Error en API Route:', err);
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}
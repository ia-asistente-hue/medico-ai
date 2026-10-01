import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(req: Request) {
  try {
    const { stripeCustomerId } = await req.json();

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'El ID de cliente de Stripe es requerido' },
        { status: 400 }
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_URL}/suscripcion`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error al generar Portal Session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-08-26.dahlia',
});

export async function POST(req: Request) {
  try {
    const { userId, email, priceId } = await req.json();

    if (!userId || !email || !priceId) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos (userId, email, priceId)' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_URL}/suscripcion?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/suscripcion?canceled=true`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error en checkout session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
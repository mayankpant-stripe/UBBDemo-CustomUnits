import { NextRequest, NextResponse } from 'next/server';

// Records AI-1 token usage to Stripe Billing v2 meter events with event name "Event AI-1"
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerId: string | undefined = body?.customerId;
    const valueRaw: number | string | undefined = body?.value;
    const date: string | undefined = body?.date; // optional (ignored)

    const valueNum = Number(valueRaw);
    if (!customerId || !Number.isFinite(valueNum)) {
      return NextResponse.json(
        { success: false, error: 'customerId and numeric value are required' },
        { status: 400 }
      );
    }

    const options = {
      event_name: 'Event AI-1',
      payload: {
        stripe_customer_id: customerId,
        value: String(valueNum)
      }
    } as Record<string, any>;

    const res = await fetch('https://api.stripe.com/v2/billing/meter_events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Stripe-Version': 'unsafe-development'
      },
      body: JSON.stringify(options)
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Meter event post failed: ${res.status} - ${text}` },
        { status: 500 }
      );
    }

    const json = text ? JSON.parse(text) : {};

    return NextResponse.json({
      success: true,
      stripe_response: json
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


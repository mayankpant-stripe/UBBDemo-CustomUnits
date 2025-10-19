import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerId: string = body.customerId;
    const date: string | undefined = body.date; // optional (not sent to Stripe)
    const systemInput: string | null | undefined = body.system; // may be null/empty
    const numericValue: number = Number(body.value);

    if (!customerId || !Number.isFinite(numericValue)) {
      return NextResponse.json(
        { success: false, error: 'customerId and value are required' },
        { status: 400 }
      );
    }

    // Normalize system value
    let systemVariable: string | undefined;
    let event_name = 'SyseventSA2'; // default event name
    
    if (systemInput) {
      const normalized = String(systemInput).trim().toLowerCase();
      if (normalized === 'open ai' || normalized === 'openai') {
        systemVariable = 'openai';
      } else if (normalized === 'claude') {
        systemVariable = 'claude';
      } else if (normalized === 'grok') {
        systemVariable = 'grok';
      } else if (normalized === 'eventtest 19') {
        systemVariable = 'eventtest_19';
        event_name = 'EventTest 19';
      }
    }

    const payload: Record<string, any> = {
      stripe_customer_id: customerId,
      // Stripe expects value as a string for v2 meter_events
      value: String(numericValue)
    };
    
    // Always set type field - required by Stripe
    if (systemVariable) {
      payload.type = systemVariable;
    } else {
      payload.type = 'default';
    }

    if (systemVariable) {
      payload.system = systemVariable;
    }

    const options = {
      event_name,
      payload
    };

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
      message: `Meter event has been registered under "${event_name}" for the customer "${customerId}"`,
      event_name,
      customerId,
      stripe_response: json
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

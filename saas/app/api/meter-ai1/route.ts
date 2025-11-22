import { NextRequest, NextResponse } from 'next/server';

// Records AI4 events to Stripe Billing v2 meter events with event name "AI4"
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerId: string | undefined = body?.customerId;
    const valueRaw: number | string | undefined = body?.value;
    const date: string | undefined = body?.date;
    const type: string | undefined = body?.type;

    const valueNum = Number(valueRaw);
    if (!customerId || !Number.isFinite(valueNum)) {
      return NextResponse.json(
        { success: false, error: 'customerId and numeric value are required' },
        { status: 400 }
      );
    }

    // Convert date string to Unix timestamp (as string)
    let createdTimestamp: string | undefined;
    if (date) {
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        createdTimestamp = String(Math.floor(dateObj.getTime() / 1000));
      }
    }

    // Determine event name based on whether type is provided
    // If type is provided: use 'AI4' meter (with type field)
    // If no type: use 'Event AI-1' meter (without type field)
    const hasType = type && type.trim() !== '';
    const event_name = hasType ? 'AI4' : 'Event AI-1';

    // Build payload
    const payload: Record<string, any> = {
      stripe_customer_id: customerId,
      value: String(valueNum)
    };

    // Only add type field if it was provided (for AI4 events)
    if (hasType) {
      payload.type = type;
    }

    if (createdTimestamp) {
      payload.created = createdTimestamp;
    }

    const options = {
      event_name,
      payload
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


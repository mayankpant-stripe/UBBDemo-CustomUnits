import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, invoiceAmount, creditAmount } = body;

    if (!customerId || !invoiceAmount || !creditAmount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: customerId, invoiceAmount, and creditAmount are required'
      }, { status: 400 });
    }

    console.log('Creating invoice and credit grant for Stability Core:', { customerId, invoiceAmount, creditAmount });

    // Step 1: Create invoice
    const invoiceResponse = await fetch('https://api.stripe.com/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
      },
      body: new URLSearchParams({
        'customer': customerId,
        'collection_method': 'charge_automatically',
        'auto_advance': 'false'
      })
    });

    if (!invoiceResponse.ok) {
      const errorText = await invoiceResponse.text();
      console.error('Invoice creation failed:', errorText);
      throw new Error(`Invoice creation failed: ${invoiceResponse.status} - ${errorText}`);
    }

    const invoice = await invoiceResponse.json();
    console.log('Invoice created:', invoice.id);

    // Step 2: Create invoice item
    const invoiceItemResponse = await fetch('https://api.stripe.com/v1/invoiceitems', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
      },
      body: new URLSearchParams({
        'customer': customerId,
        'price_data[currency]': 'usd',
        'price_data[product]': 'prod_T9SJrht8qO7y5t',
        'price_data[unit_amount]': (invoiceAmount * 100).toString(), // Convert dollars to cents
        'quantity': '1',
        'description': 'Stability Core Subscription Top Up',
        'invoice': invoice.id
      })
    });

    if (!invoiceItemResponse.ok) {
      const errorText = await invoiceItemResponse.text();
      console.error('Invoice item creation failed:', errorText);
      throw new Error(`Invoice item creation failed: ${invoiceItemResponse.status} - ${errorText}`);
    }

    const invoiceItem = await invoiceItemResponse.json();
    console.log('Invoice item created:', invoiceItem.id);

    // Step 3: Finalize invoice
    const finalizeResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/finalize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
      }
    });

    if (!finalizeResponse.ok) {
      const errorText = await finalizeResponse.text();
      console.error('Invoice finalization failed:', errorText);
      throw new Error(`Invoice finalization failed: ${finalizeResponse.status} - ${errorText}`);
    }

    const finalizedInvoice = await finalizeResponse.json();
    console.log('Invoice finalized:', finalizedInvoice.id);

    // Step 4: Pay the invoice using customer's default payment method
    const payResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
      }
    });

    if (!payResponse.ok) {
      const errorText = await payResponse.text();
      console.error('Invoice payment failed:', errorText);
      throw new Error(`Invoice payment failed: ${payResponse.status} - ${errorText}`);
    }

    const paidInvoice = await payResponse.json();
    console.log('Invoice paid:', paidInvoice.id, 'Status:', paidInvoice.status);

    // Step 5: Create credit grant with CUSTOM PRICING UNITS for Stability Core
    console.log('Creating custom pricing unit credit grant for customer:', customerId, 'creditAmount:', creditAmount);

    // Create form-encoded body for Stripe API - using custom pricing units for Stability
    const formBody = new URLSearchParams();
    formBody.append('amount[custom_pricing_unit][id]', 'cpu_test_61TT5XePmbXQBegOk16T5kls95SQJJF9DR1pbaQwq4ye'); // Stability AI custom unit
    formBody.append('amount[custom_pricing_unit][value]', creditAmount.toString()); // Credit amount as custom units (not cents)
    formBody.append('amount[type]', 'custom_pricing_unit');
    formBody.append('applicability_config[scope][price_type]', 'metered');
    formBody.append('category', 'paid');
    formBody.append('customer', customerId);
    formBody.append('name', 'Purchased Credits');
    formBody.append('priority', '60');

    const creditGrantResponse = await fetch('https://api.stripe.com/v1/billing/credit_grants', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-07-03.private'
      },
      body: formBody.toString()
    });

    if (!creditGrantResponse.ok) {
      const errorText = await creditGrantResponse.text();
      console.error('Credit grant creation failed:', errorText);
      throw new Error(`Credit grant creation failed: ${creditGrantResponse.status} - ${errorText}`);
    }

    const creditGrant = await creditGrantResponse.json();
    console.log('Credit grant created:', creditGrant.id);

    return NextResponse.json({
      success: true,
      invoiceId: finalizedInvoice.id,
      creditGrantId: creditGrant.id,
      message: `Invoice for $${invoiceAmount} and credit grant of ${creditAmount} custom units created successfully`
    });

  } catch (error) {
    console.error('Error in Stability-create-invoice-and-credit:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create invoice and credit grant',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


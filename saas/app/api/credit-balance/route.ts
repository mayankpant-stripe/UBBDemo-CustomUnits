import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json({
        success: false,
        error: 'Customer ID is required'
      }, { status: 400 });
    }

    console.log('Fetching credit balance summary for customer:', customerId);

    // Step 1: Fetch all credit grants for the customer
    const creditGrantsResponse = await fetch(`https://api.stripe.com/v1/billing/credit_grants?customer=${customerId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-05-28.basil;checkout_product_catalog_preview=v1'
      }
    });

    if (!creditGrantsResponse.ok) {
      const errorText = await creditGrantsResponse.text();
      console.error('Failed to fetch credit grants:', errorText);
      throw new Error(`Failed to fetch credit grants: ${creditGrantsResponse.status}`);
    }

    const creditGrantsData = await creditGrantsResponse.json();
    console.log('Found', creditGrantsData.data?.length || 0, 'credit grants');

    let totalGranted = 0;
    let totalAvailable = 0;

    // Step 2: For each credit grant, fetch its balance summary
    if (creditGrantsData.data && creditGrantsData.data.length > 0) {
      for (const grant of creditGrantsData.data) {
        console.log('Fetching balance for grant:', grant.id);
        
        // Fetch balance summary for this specific grant
        const balanceUrl = `https://api.stripe.com/v1/billing/credit_balance_summary?customer=${customerId}&filter[type]=credit_grant&filter[credit_grant]=${grant.id}`;
        const balanceResponse = await fetch(balanceUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Stripe-Version': '2025-05-28.basil;checkout_product_catalog_preview=v1'
          }
        });

        if (!balanceResponse.ok) {
          console.error(`Failed to fetch balance for grant ${grant.id}`);
          continue;
        }

        const balanceSummary = await balanceResponse.json();
        
        // Process balance entries
        if (balanceSummary.balances && balanceSummary.balances.length > 0) {
          for (const balance of balanceSummary.balances) {
            // Get granted amount from ledger_balance
            if (balance.ledger_balance?.custom_pricing_unit) {
              const grantedValue = parseFloat(balance.ledger_balance.custom_pricing_unit.value) || 0;
              totalGranted += grantedValue;
              console.log(`Grant ${grant.id}: Added ${grantedValue} to granted total`);
            } else if (balance.ledger_balance?.monetary) {
              const grantedValue = balance.ledger_balance.monetary.value || 0;
              totalGranted += grantedValue / 100; // Convert cents to dollars
              console.log(`Grant ${grant.id}: Added $${grantedValue / 100} to granted total`);
            }

            // Get available amount from available_balance (accounts for usage)
            if (balance.available_balance?.custom_pricing_unit) {
              const availableValue = parseFloat(balance.available_balance.custom_pricing_unit.value) || 0;
              totalAvailable += availableValue;
              console.log(`Grant ${grant.id}: Added ${availableValue} to available total`);
            } else if (balance.available_balance?.monetary) {
              const availableValue = balance.available_balance.monetary.value || 0;
              totalAvailable += availableValue / 100; // Convert cents to dollars
              console.log(`Grant ${grant.id}: Added $${availableValue / 100} to available total`);
            }
          }
        }
      }
    }

    console.log('Final totals:', {
      totalGranted,
      totalAvailable,
      grantedFormatted: totalGranted.toLocaleString(),
      availableFormatted: totalAvailable.toLocaleString()
    });

    return NextResponse.json({
      success: true,
      grantedUnits: totalGranted.toLocaleString(),
      availableUnits: totalAvailable.toLocaleString(),
      customerId
    });

  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch credit balance'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID is required'
      }, { status: 400 });
    }

    console.log('Processing checkout success for session:', sessionId);

    // Retrieve the checkout session with appropriate expansions based on mode
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'setup_intent.payment_method', 'payment_intent.payment_method', 'subscription', 'subscription.default_payment_method']
    });

    console.log('Checkout session retrieved:', {
      id: session.id,
      status: session.status,
      mode: session.mode,
      customer: typeof session.customer === 'object' ? session.customer?.id : session.customer,
      setup_intent: typeof session.setup_intent === 'object' ? session.setup_intent?.id : session.setup_intent,
      payment_intent: typeof session.payment_intent === 'object' ? session.payment_intent?.id : session.payment_intent
    });

    if (!session.customer) {
      throw new Error('Invalid checkout session: missing customer');
    }

    // Check for either setup intent (setup mode), payment intent (payment mode), or subscription (subscription mode)
    if (!session.setup_intent && !session.payment_intent && !session.subscription) {
      throw new Error('Invalid checkout session: missing setup intent, payment intent, or subscription');
    }

    if (typeof session.customer === 'string') {
      throw new Error('Customer must be expanded object');
    }

    const customer = session.customer as Stripe.Customer;
    let paymentMethod: Stripe.PaymentMethod;

    if (session.mode === 'payment' && session.payment_intent) {
      // Payment mode - get payment method from payment intent
      if (typeof session.payment_intent === 'string') {
        throw new Error('Payment intent must be expanded object');
      }
      const paymentIntent = session.payment_intent as Stripe.PaymentIntent;
      paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;
      
      if (!paymentMethod) {
        throw new Error('No payment method found in payment intent');
      }
      console.log('Payment mode - using payment method from payment intent');
    } else if (session.mode === 'setup' && session.setup_intent) {
      // Setup mode - get payment method from setup intent
      if (typeof session.setup_intent === 'string') {
        throw new Error('Setup intent must be expanded object');
      }
      const setupIntent = session.setup_intent as Stripe.SetupIntent;
      paymentMethod = setupIntent.payment_method as Stripe.PaymentMethod;
      
      if (!paymentMethod) {
        throw new Error('No payment method found in setup intent');
      }
      console.log('Setup mode - using payment method from setup intent');
    } else if ((session.mode as string) === 'subscription' && session.subscription) {
      // Subscription mode - get payment method from subscription
      if (typeof session.subscription === 'string') {
        throw new Error('Subscription must be expanded object');
      }
      const subscription = session.subscription as Stripe.Subscription;
      paymentMethod = subscription.default_payment_method as Stripe.PaymentMethod;
      
      if (!paymentMethod) {
        throw new Error('No payment method found in subscription');
      }
      console.log('Subscription mode - using payment method from subscription');
    } else {
      throw new Error('Invalid session mode or missing intent/subscription');
    }

    console.log('Customer and payment method retrieved:', {
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      paymentMethodId: paymentMethod.id
    });

    // Update customer with name from metadata if available
    const customerName = session.metadata?.customer_name || customer.name;
    const customerEmail = session.metadata?.customer_email || customer.email;

    // Extract plan info from session metadata
    const planType = session.metadata?.plan || 'starter_rate_card';
    const rateCardId = session.metadata?.rate_card_id || 'rcd_test_61SslDUf5TEQBs1ED16SJ793MpE9vspyGN7Wv6Auu0XQ';
    const flowType = session.metadata?.flow_type;
    const testClockId = session.metadata?.test_clock_id;
    
    console.log('Process checkout success - Flow detection:', {
      flowType,
      planType,
      sessionMode: session.mode,
      hasSubscription: !!session.subscription,
      metadata: session.metadata
    });

    let testClock;

    // Check if this is the new Starter invoice flow
    if (flowType === 'starter_invoice_custom_flow') {
      console.log('Processing Starter invoice flow - creating test clock and customer after payment');
      
      // Step 3: Create test clock and associate with customer (after payment)
      console.log('Step 3: Creating test clock with current date');
      
      const now = new Date();
      const londonDateString = now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const formatter = new Intl.DateTimeFormat('en', {
        timeZone: 'Europe/London',
        timeZoneName: 'longOffset'
      });
      
      const londonOffsetString = formatter.formatToParts(now)
        .find(part => part.type === 'timeZoneName')?.value || '+00:00';
      
      const offsetMatch = londonOffsetString.match(/([+-])(\d{2}):(\d{2})/);
      let offsetHours = 0;
      if (offsetMatch) {
        offsetHours = parseInt(offsetMatch[2]) * (offsetMatch[1] === '+' ? 1 : -1);
      }
      
      const [year, month, day] = londonDateString.split('-').map(Number);
      const beginningOfDayUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      beginningOfDayUTC.setUTCHours(beginningOfDayUTC.getUTCHours() - offsetHours);
      
      const testClockResponse = await fetch('https://api.stripe.com/v1/test_helpers/test_clocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        },
        body: new URLSearchParams({
          'frozen_time': Math.floor(beginningOfDayUTC.getTime() / 1000).toString()
        })
      });

      if (!testClockResponse.ok) {
        const errorText = await testClockResponse.text();
        console.error('Test clock creation failed:', errorText);
        throw new Error(`Test clock creation failed: ${testClockResponse.status} - ${errorText}`);
      }

      testClock = await testClockResponse.json();
      console.log('Test clock created:', testClock.id);

      // Update customer with name from modal and set preferred currency to GBP
      await stripe.customers.update(customer.id, {
        name: customerName || customer.name || 'Customer', // Use name from modal metadata or fallback
        preferred_locales: ['en-GB'],
        metadata: {
          ...customer.metadata,
          plan: 'starter_invoice_flow',
          created_via: 'starter_invoice_flow',
          timestamp: new Date().toISOString(),
          test_clock_id: testClock.id,
          preferred_currency: 'gbp'
        }
      });
      console.log('Customer updated with name from modal:', customerName, 'metadata and test clock reference');
      
    } else {
      // Original flow - create test clock at beginning of current London day (BST/GMT aware)
      console.log('Creating test clock with beginning of current day in London timezone');

      const nowOrig = new Date();
      const londonDateStringOrig = nowOrig.toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
      const formatterOrig = new Intl.DateTimeFormat('en', { timeZone: 'Europe/London', timeZoneName: 'longOffset' });
      const londonOffsetStringOrig = formatterOrig.formatToParts(nowOrig).find(part => part.type === 'timeZoneName')?.value || '+00:00';
      const offsetMatchOrig = londonOffsetStringOrig.match(/([+-])(\d{2}):(\d{2})/);
      let offsetHoursOrig = 0;
      if (offsetMatchOrig) {
        offsetHoursOrig = parseInt(offsetMatchOrig[2]) * (offsetMatchOrig[1] === '+' ? 1 : -1);
      }
      const [yOrig, mOrig, dOrig] = londonDateStringOrig.split('-').map(Number);
      const beginningOfDayUTCOrig = new Date(Date.UTC(yOrig, mOrig - 1, dOrig, 0, 0, 0, 0));

      const testClockResponse = await fetch('https://api.stripe.com/v1/test_helpers/test_clocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        },
        body: new URLSearchParams({
          'frozen_time': Math.floor(beginningOfDayUTCOrig.getTime() / 1000).toString()
        })
      });

      if (!testClockResponse.ok) {
        const errorText = await testClockResponse.text();
        console.error('Test clock creation failed:', errorText);
        throw new Error(`Test clock creation failed: ${testClockResponse.status} - ${errorText}`);
      }

      testClock = await testClockResponse.json();
      console.log('Test clock created:', testClock);

      // Update customer metadata to include test clock reference
      if (customerName && customerName !== customer.name) {
        await stripe.customers.update(customer.id, {
          name: customerName,
          metadata: {
            ...customer.metadata,
            plan: planType,
            rate_card_id: rateCardId,
            created_via: 'checkout_flow',
            timestamp: new Date().toISOString(),
            test_clock_id: testClock.id
          }
        });
        console.log('Customer updated with name:', customerName, 'plan:', planType, 'and test clock reference:', testClock.id);
      } else {
        await stripe.customers.update(customer.id, {
          metadata: {
            ...customer.metadata,
            plan: planType,
            rate_card_id: rateCardId,
            created_via: 'checkout_flow',
            timestamp: new Date().toISOString(),
            test_clock_id: testClock.id
          }
        });
        console.log('Customer updated with plan:', planType, 'and test clock reference:', testClock.id);
      }
    }

    // Payment method is already attached in setup mode

    // Set the payment method as default for the customer
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });

    console.log('Payment method set as default for customer');

    // Handle different flows
    if (flowType === 'starter_invoice_custom_flow') {
      // New Starter invoice flow: Steps 4-7
      
      // Step 4: Create invoice with £100
      console.log('Step 4: Creating invoice with £100');
      const invoice = await stripe.invoices.create({
        customer: customer.id,
        automatic_tax: {
          enabled: true
        },
        default_payment_method: paymentMethod.id,
        auto_advance: true
      });
      console.log('Invoice created:', invoice.id);

      // Add invoice item using raw API call to avoid TypeScript issues
      console.log('Adding invoice item');
      if (!invoice.id) {
        throw new Error('Invoice ID is missing for invoice item creation');
      }
      
      const invoiceItemResponse = await fetch('https://api.stripe.com/v1/invoiceitems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        },
        body: new URLSearchParams([
          ['customer', customer.id],
          ['invoice', invoice.id],
          ['price', 'price_1RlR4wCxTX20iupG3WdVATtj']
        ])
      });

      if (!invoiceItemResponse.ok) {
        const errorText = await invoiceItemResponse.text();
        console.error('Invoice item creation failed:', errorText);
        throw new Error(`Invoice item creation failed: ${invoiceItemResponse.status} - ${errorText}`);
      }

      const invoiceItem = await invoiceItemResponse.json();
      console.log('Invoice item created:', invoiceItem.id);

      // Finalize the invoice
      console.log('Finalizing invoice');
      if (!invoice.id) {
        throw new Error('Invoice ID is missing');
      }
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      console.log('Invoice finalized:', finalizedInvoice.id, 'Amount:', finalizedInvoice.amount_due);

      // Step 5: Create billing credit grant ($100 GBP)
      console.log('Step 5: Creating billing credit grant in USD');
      const creditGrantResponse = await fetch('https://api.stripe.com/v1/billing/credit_grants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
        },
        body: new URLSearchParams({
          'amount[monetary][currency]': 'usd',
          'amount[monetary][value]': '10000',
          'amount[type]': 'monetary',
          'applicability_config[scope][price_type]': 'metered',
          'category': 'paid',
          'customer': customer.id,
          'name': 'Purchased Credits'
        })
      });

      if (!creditGrantResponse.ok) {
        const errorText = await creditGrantResponse.text();
        console.error('Credit grant creation failed:', errorText);
        throw new Error(`Credit grant creation failed: ${creditGrantResponse.status} - ${errorText}`);
      }

      const creditGrant = await creditGrantResponse.json();
      console.log('Credit grant created:', creditGrant.id, 'Name:', creditGrant.name);

      // Step 6: Create subscription with two price items
      console.log('Step 6: Creating subscription with multiple prices');
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        default_payment_method: paymentMethod.id,
        expand: ['customer'],
        items: [{
          price: 'price_1RqaNwCxTX20iupGRkZ0298p'
        }, {
          price: 'price_1RY2c5CxTX20iupGsNnlQCz5'
        }],
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        automatic_tax: {
          enabled: true
        }
      });
      console.log('Subscription created:', subscription.id);

      // Step 7: Return success message with all IDs
      console.log('Step 7: Returning success message');
      
      // Get account ID (merchant account)
      const account = await stripe.accounts.retrieve();
      
      return NextResponse.json({
        success: true,
        message: `Starter Plan activated successfully!`,
        // Top-level fields expected by frontend
        customerId: customer.id,
        subscriptionId: subscription.id,
        account: {
          id: account.id,
          business_profile: account.business_profile
        },
        customer: {
          id: customer.id,
          name: customerName || customer.name,
          email: customerEmail || customer.email,
          paymentMethodId: paymentMethod.id,
          testClockId: testClock?.id
        },
        invoice: {
          id: finalizedInvoice.id,
          number: finalizedInvoice.number,
          amount: finalizedInvoice.amount_due,
          currency: finalizedInvoice.currency
        },
        creditGrant: {
          id: creditGrant.id,
          name: creditGrant.name,
          amount: creditGrant.amount
        },
        subscription: {
          id: subscription.id,
          status: subscription.status
        },
        testClock: testClock ? {
          id: testClock.id,
          name: testClock.name || `Test Clock ${testClock.id}`,
          frozenTime: testClock.frozen_time,
          status: testClock.status || 'active',
          note: "Test clock created at beginning of current day in London timezone (BST/GMT)"
        } : undefined,
        session: {
          id: session.id,
          setupIntentId: typeof session.setup_intent === 'object' 
            ? session.setup_intent?.id 
            : session.setup_intent,
          mode: session.mode
        }
      });
    }

    // Create billing cadence for SuperAI flows
    const cadenceOptions = {
      payer: {
        type: "customer",
        customer: customer.id
      },
      billing_cycle: {
        type: "month",
        interval_count: 1
      }
    };

    console.log('Creating cadence with options:', cadenceOptions);

    const cadenceResponse = await fetch('https://api.stripe.com/v2/billing/cadences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Stripe-Version': '2025-08-27.preview'
      },
      body: JSON.stringify(cadenceOptions)
    });

    if (!cadenceResponse.ok) {
      const errorText = await cadenceResponse.text();
      console.error('Cadence creation failed:', errorText);
      throw new Error(`Cadence creation failed: ${cadenceResponse.status} - ${errorText}`);
    }

    const cadence = await cadenceResponse.json();
    console.log('Full cadence response:', cadence);
    
    if (!cadence || !cadence.id) {
      throw new Error(`Cadence creation failed: No ID returned. Response: ${JSON.stringify(cadence)}`);
    }

    let finalSubscription;
    let invoiceId;
    let creditGrantId;

    if (flowType === 'superai_pro_custom_credits_flow' || flowType === 'superai_core_custom_credits_flow') {
      // SuperAI-Pro/SuperAI-Core flow: Get pricing plan details and create billing intent
      
      // Step 2 - Get pricing plan details  
      const pricingPlanId = session.metadata?.pricing_plan_id 
        || (flowType === 'superai_pro_custom_credits_flow'
              ? 'bpp_test_61TT60NzJkaRemjh216T5kls95SQJJF9DR1pbaQwq7rc' // SuperAI Pro plan
              : 'bpp_test_61TT5XipfJUNx6zyd16T5kls95SQJJF9DR1pbaQwqFmK'); // SuperAI Core plan
      
      console.log('Getting SuperAI pricing plan details for:', pricingPlanId);
      
      const pricingPlanResponse = await fetch(`https://api.stripe.com/v2/billing/pricing_plans/${pricingPlanId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Stripe-Version': 'unsafe-development'
        }
      });

      if (!pricingPlanResponse.ok) {
        const errorText = await pricingPlanResponse.text();
        console.error('Pricing plan fetch failed:', errorText);
        throw new Error(`Pricing plan fetch failed: ${pricingPlanResponse.status} - ${errorText}`);
      }

      const pricingPlan = await pricingPlanResponse.json();
      console.log('Full pricing plan response:', JSON.stringify(pricingPlan, null, 2));
      
      // Extract version - try various field names and structures
      let planVersion = null;
      
      // Try direct fields
      if (pricingPlan.version) {
        planVersion = pricingPlan.version;
      } else if (pricingPlan.current_version) {
        planVersion = pricingPlan.current_version;
      } else if (pricingPlan.latest_version) {
        planVersion = pricingPlan.latest_version;
      } else if (pricingPlan.active_version) {
        planVersion = pricingPlan.active_version;
      }
      
      // If version is an object, try to extract the version identifier
      if (typeof planVersion === 'object' && planVersion !== null) {
        planVersion = planVersion.version || planVersion.id || planVersion.number || planVersion.name;
      }
      
      console.log('Extracted pricing plan version:', planVersion);
      console.log('Version type:', typeof planVersion);
      
      // If still no version found, try to use a default or latest approach
      if (!planVersion) {
        console.log('No version found, checking for versions array or other structures...');
        
        // Check if there's a versions array
        if (pricingPlan.versions && Array.isArray(pricingPlan.versions) && pricingPlan.versions.length > 0) {
          // Use the first version or find the active one
          const activeVersion = pricingPlan.versions.find((v: any) => v.status === 'active' || v.active === true);
          planVersion = activeVersion ? (activeVersion.id || activeVersion.version) : pricingPlan.versions[0].id || pricingPlan.versions[0].version;
          console.log('Using version from versions array:', planVersion);
        } else {
          // As a last resort, try using the plan ID itself or a default
          console.log('Available fields in pricing plan:', Object.keys(pricingPlan));
          
          // Sometimes the version might be the same as the ID or use a default version like "1"
          planVersion = pricingPlan.id || "1";
          console.log('Using fallback version:', planVersion);
        }
      }

      // Step 3 - Create billing intent
      const billingIntentOptions = {
        currency: 'usd',
        cadence: cadence.id,
        actions: [
          {
            type: "subscribe",
            subscribe: {
              type: "pricing_plan_subscription_details",
              pricing_plan_subscription_details: {
                pricing_plan: pricingPlanId,
                pricing_plan_version: planVersion,
                component_configurations: []
              }
            }
          }
        ]
      };

      console.log('Creating billing intent with options:', billingIntentOptions);
      
      const billingIntentResponse = await fetch('https://api.stripe.com/v2/billing/intents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Stripe-Version': 'unsafe-development'
        },
        body: JSON.stringify(billingIntentOptions)
      });

      if (!billingIntentResponse.ok) {
        const errorText = await billingIntentResponse.text();
        console.error('Billing intent creation failed:', errorText);
        throw new Error(`Billing intent creation failed: ${billingIntentResponse.status} - ${errorText}`);
      }

      const billingIntent = await billingIntentResponse.json();
      console.log('Billing intent created:', billingIntent);
      
      if (!billingIntent || !billingIntent.id) {
        throw new Error(`Billing intent creation failed: No ID returned. Response: ${JSON.stringify(billingIntent)}`);
      }

      // Step 4 - Reserve the billing intent first (draft -> reserved)
      console.log('Reserving billing intent:', billingIntent.id);
      
      const reserveResponse = await fetch(`https://api.stripe.com/v2/billing/intents/${billingIntent.id}/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Stripe-Version': 'unsafe-development'
        }
      });

      if (!reserveResponse.ok) {
        const errorText = await reserveResponse.text();
        console.error('Billing intent reserve failed:', errorText);
        throw new Error(`Billing intent reserve failed: ${reserveResponse.status} - ${errorText}`);
      }

      const reservedIntent = await reserveResponse.json();
      console.log('Full reserved billing intent:', JSON.stringify(reservedIntent, null, 2));

      // Step 4.5 - Get or create PaymentIntent
      let paymentIntentId;

      // Check if payment is needed based on the total amount
      const totalAmount = reservedIntent.amount_details.total;
      console.log('Billing intent total amount:', totalAmount);

      // For SuperAI Core plan, ALWAYS skip PaymentIntent (it's setup-only, payment handled separately via invoice)
      if (flowType === 'superai_core_custom_credits_flow') {
        console.log('SuperAI Core plan - skipping PaymentIntent creation (payment handled via invoice)');
        paymentIntentId = null;
      }
      // First check if the reserved intent already has a PaymentIntent
      else if (reservedIntent.payment_intent) {
        paymentIntentId = typeof reservedIntent.payment_intent === 'string' 
          ? reservedIntent.payment_intent 
          : reservedIntent.payment_intent.id;
        console.log('Using existing PaymentIntent from reserved intent:', paymentIntentId);
      } else {
        // Create PaymentIntent with amount from reserved billing intent
        console.log('Creating PaymentIntent with amount from billing intent:', totalAmount);
        
        // Ensure minimum amount (Stripe requires at least $0.50 for USD)
        const minAmount = Math.max(totalAmount, 50); // $0.50 minimum
        console.log('Using amount (ensuring minimum):', minAmount);
        const paymentIntentResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          },
          body: new URLSearchParams({
            'amount': minAmount.toString(),
            'currency': reservedIntent.currency,
            'customer': customer.id,
            'payment_method': paymentMethod.id,
            'confirm': 'true',
            'off_session': 'true',
            'description': 'Advanced Plan Payment'
          })
        });

        if (!paymentIntentResponse.ok) {
          const errorText = await paymentIntentResponse.text();
          console.error('PaymentIntent creation failed:', errorText);
          throw new Error(`PaymentIntent creation failed: ${paymentIntentResponse.status} - ${errorText}`);
        }

        const paymentIntent = await paymentIntentResponse.json();
        console.log('PaymentIntent created and confirmed:', { id: paymentIntent.id, status: paymentIntent.status });

        if (paymentIntent.status === 'requires_action') {
          throw new Error('Payment requires additional authentication. Please complete 3DS.');
        }

        paymentIntentId = paymentIntent.id;
      }

      // Step 5 - Commit the billing intent to make it active (reserved -> active)
      console.log('Committing billing intent:', reservedIntent.id);
      console.log('Billing intent total amount:', totalAmount);
      
      // Check if payment is required based on the total amount
      const commitBody = totalAmount > 0 ? { payment_intent: paymentIntentId } : {};
      
      console.log('Commit body:', commitBody);
      
      const commitResponse = await fetch(`https://api.stripe.com/v2/billing/intents/${reservedIntent.id}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          'Stripe-Version': 'unsafe-development'
        },
        body: JSON.stringify(commitBody)
      });

      if (!commitResponse.ok) {
        const errorText = await commitResponse.text();
        console.error('Billing intent commit failed:', errorText);
        throw new Error(`Billing intent commit failed: ${commitResponse.status} - ${errorText}`);
      }

      const committedIntent = await commitResponse.json();
      console.log('Billing intent committed:', committedIntent);
      
      // Step 6 - For SuperAI Core flow: Create invoice
      if (flowType === 'superai_core_custom_credits_flow') {
        const invoiceAmount = session.metadata?.invoice_amount || '10000000'; // $100,000 for SuperAI Core
        
        console.log(`Creating invoice for SuperAI Core flow... Amount: $${parseInt(invoiceAmount)/100}`);
        
        const invoiceResponse = await fetch('https://api.stripe.com/v1/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          },
          body: new URLSearchParams({
            'customer': customer.id,
            'collection_method': 'charge_automatically',
          })
        });

        if (!invoiceResponse.ok) {
          const errorText = await invoiceResponse.text();
          console.error('Invoice creation failed:', errorText);
          throw new Error(`Invoice creation failed: ${invoiceResponse.status} - ${errorText}`);
        }

        const invoice = await invoiceResponse.json();
        console.log('Invoice created:', invoice);

        // Add invoice item for the specified price
        const invoiceItemResponse = await fetch('https://api.stripe.com/v1/invoiceitems', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          },
          body: new URLSearchParams({
            'customer': customer.id,
            'price_data[currency]': 'usd',
            'price_data[product]': 'prod_T9SJrht8qO7y5t',
            'price_data[unit_amount]': invoiceAmount,
            'quantity': '1',
            'description': 'Credit Grant',
            'invoice': invoice.id
          })
        });

        if (!invoiceItemResponse.ok) {
          const errorText = await invoiceItemResponse.text();
          console.error('Invoice item creation failed:', errorText);
          throw new Error(`Invoice item creation failed: ${invoiceItemResponse.status} - ${errorText}`);
        }

        const invoiceItem = await invoiceItemResponse.json();
        console.log('Invoice item created:', invoiceItem);

        // Finalize the invoice
        const finalizeResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/finalize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          }
        });

        if (!finalizeResponse.ok) {
          const errorText = await finalizeResponse.text();
          console.error('Invoice finalization failed:', errorText);
          throw new Error(`Invoice finalization failed: ${finalizeResponse.status} - ${errorText}`);
        }

        const finalizedInvoice = await finalizeResponse.json();
        console.log('Invoice finalized:', finalizedInvoice);

        // Pay the invoice
        const payResponse = await fetch(`https://api.stripe.com/v1/invoices/${invoice.id}/pay`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`
          }
        });

        if (!payResponse.ok) {
          const errorText = await payResponse.text();
          console.error('Invoice payment failed:', errorText);
          throw new Error(`Invoice payment failed: ${payResponse.status} - ${errorText}`);
        }

        const paidInvoice = await payResponse.json();
        console.log('Invoice paid:', paidInvoice);

        // Step 7 - Create credit grant
        const creditUnits = session.metadata?.credit_units || '500000'; // 500,000 custom units for SuperAI Core
        
        console.log(`Creating credit grant for SuperAI Core flow... Units: ${creditUnits}`);
        
        const creditGrantBody = new URLSearchParams({
          'amount[custom_pricing_unit][id]': 'cpu_test_61TT5XePmbXQBegOk16T5kls95SQJJF9DR1pbaQwq4ye', // SuperAI custom unit
          'amount[custom_pricing_unit][value]': creditUnits,
          'amount[type]': 'custom_pricing_unit',
          'applicability_config[scope][price_type]': 'metered',
          'category': 'paid',
          'customer': customer.id,
          'name': 'Purchased Credits'
        });
        
        const creditGrantResponse = await fetch('https://api.stripe.com/v1/billing/credit_grants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Stripe-Version': '2025-05-28.basil;checkout_product_catalog_preview=v1'
          },
          body: creditGrantBody
        });

        if (!creditGrantResponse.ok) {
          const errorText = await creditGrantResponse.text();
          console.error('Credit grant creation failed:', errorText);
          throw new Error(`Credit grant creation failed: ${creditGrantResponse.status} - ${errorText}`);
        }

        const creditGrant = await creditGrantResponse.json();
        console.log('Credit grant created:', creditGrant);

        // Store the invoice and credit grant IDs for response
        invoiceId = paidInvoice.id;
        creditGrantId = creditGrant.id;
      }
      
      finalSubscription = committedIntent;
    } else {
      throw new Error(`Unsupported flow type: ${flowType}`);
    }

    // Prepare response for SuperAI flows
    const isSuperAIProFlow = flowType === 'superai_pro_custom_credits_flow';
    
    return NextResponse.json({
      success: true,
      message: `Customer ${customerName || customer.name} successfully subscribed to SuperAI ${isSuperAIProFlow ? 'Pro' : 'Core'} Plan!`,
      customer: {
        id: customer.id,
        name: customerName || customer.name,
        email: customerEmail || customer.email,
        paymentMethodId: paymentMethod.id,
        testClockId: testClock?.id
      },
      billing: {
        cadenceId: cadence.id,
        pricingPlanId: (session.metadata?.pricing_plan_id || (isSuperAIProFlow 
          ? 'bpp_test_61TT60NzJkaRemjh216T5kls95SQJJF9DR1pbaQwq7rc' 
          : 'bpp_test_61TT5XipfJUNx6zyd16T5kls95SQJJF9DR1pbaQwqFmK')),
        billingIntentId: finalSubscription.id,
        status: finalSubscription.status,
        ...(invoiceId && { invoiceId }),
        ...(creditGrantId && { creditGrantId })
      },
      customerId: customer.id,
      subscriptionId: finalSubscription.id,
      testClock: testClock ? {
        id: testClock.id,
        name: testClock.name || `Test Clock ${testClock.id}`,
        frozenTime: testClock.frozen_time,
        status: testClock.status || 'active',
        note: "Test clock created at beginning of current day in London timezone (BST/GMT)"
      } : undefined,
      session: {
        id: session.id,
        intentId: session.mode === 'payment' 
          ? (session.payment_intent as Stripe.PaymentIntent)?.id 
          : (session.setup_intent as Stripe.SetupIntent)?.id,
        mode: session.mode
      }
    });

  } catch (error) {
    console.error('Error processing checkout success:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process checkout completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
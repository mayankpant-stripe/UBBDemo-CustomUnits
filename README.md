# SuperAI Usage-Based Billing Demo with Custom Units

A Next.js application demonstrating Stripe's Usage-Based Billing (UBB) with custom pricing units for AI service billing across multiple tiers: Core, Pro, and Enterprise.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Plan Tiers](#plan-tiers)
- [Key Features](#key-features)
- [Technical Implementation](#technical-implementation)
- [API Endpoints](#api-endpoints)
- [Meter Events](#meter-events)
- [Credit Grant System](#credit-grant-system)
- [Getting Started](#getting-started)

## Overview

This project implements a comprehensive billing system for SuperAI services using Stripe's latest Billing v2 APIs with custom pricing units. It supports three subscription tiers (Core, Pro, Enterprise) with prepaid credit models and real-time usage tracking.

## Architecture

### Technology Stack
- **Frontend**: Next.js 14+ with TypeScript, React
- **Backend**: Next.js API Routes
- **Billing**: Stripe Billing v2 with Custom Pricing Units
- **Payment Processing**: Stripe Checkout
- **Usage Tracking**: Stripe Meter Events API

### Flow Diagram

```
User → Plan Selection → Checkout Session → Payment Setup → 
→ Process Success → Create Invoice → Create Credit Grant → 
→ Success Page → Usage Tracking → Meter Events
```

## Plan Tiers

### SuperAI Core
- **Price**: $100,000 upfront
- **Credits**: 500,000 custom units
- **Target**: Individuals getting started with automation
- **Pricing Plan ID**: `bpp_test_61TT5XipfJUNx6zyd16T5kls95SQJJF9DR1pbaQwqFmK`

### SuperAI Pro
- **Price**: $1,000/month (listed as subscription model)
- **Credits**: 10,000 custom units
- **Target**: Individuals with growing business needs
- **Pricing Plan ID**: `bpp_test_61Tbv07vzXUduHgcu16T5kls95SQJJF9DR1pbaQwqC9Y`

### SuperAI Enterprise
- **Price**: $250,000 upfront (Custom pricing)
- **Credits**: 1,000,000 custom units
- **Target**: Organizations running critical business processes
- **Pricing Plan ID**: `bpp_test_61TeLpk36MZRGgydI16T5kls95SQJJF9DR1pbaQwq7js`
- **Additional Features**: 
  - AI3 events tracking with type classification (account, pg, object)
  - AI4 events tracking with complexity levels (basic, advanced)

## Key Features

### 1. Test Clock Integration
All customer accounts are created with Stripe Test Clocks set to the beginning of the current day in London timezone (BST/GMT). This enables controlled testing of time-based billing scenarios.

### 2. Custom Pricing Units
Uses Stripe's Custom Pricing Unit feature for flexible credit allocation:
- **Unit ID**: `cpu_test_61TT5XePmbXQBegOk16T5kls95SQJJF9DR1pbaQwq4ye`
- Credits are tracked as custom units rather than monetary values
- Enables prepaid credit models with usage depletion

### 3. Usage Tracking
Real-time usage tracking through Stripe Meter Events:
- **AI3 Events**: SuperAI operations with type classification
- **AI4 Events**: AI-1 token usage with complexity tiers

### 4. Credit Management
- Automatic credit grant creation upon subscription
- 1-year expiration on purchased credits
- Real-time credit balance display
- Top-up functionality for additional credits

## Technical Implementation

### Customer Creation Flow

#### 1. Create Test Clock
```typescript
// Set to beginning of current day in London timezone
const testClockResponse = await fetch('https://api.stripe.com/v1/test_helpers/test_clocks', {
  method: 'POST',
  body: new URLSearchParams({
    'frozen_time': Math.floor(beginningOfDayUTC.getTime() / 1000).toString()
  })
});
```

#### 2. Create Customer with Metadata
```typescript
const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
  method: 'POST',
  body: new URLSearchParams({
    'name': name,
    'email': email,
    'test_clock': testClock.id,
    'metadata[created_via]': 'superai_custom_credits_flow',
    'metadata[plan]': 'superai_enterprise_plan',
    'metadata[pricing_plan_id]': 'bpp_test_61TeLpk36MZRGgydI16T5kls95SQJJF9DR1pbaQwq7js',
    'metadata[test_clock_id]': testClock.id,
    'invoice_settings[custom_fields][0][name]': 'PO Number',
    'invoice_settings[custom_fields][0][value]': 'PO1'
  })
});
```

#### 3. Create Checkout Session
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'setup',
  payment_method_types: ['card'],
  customer: customer.id,
  success_url: `${baseUrl}/SuperAI/success_enterprise?session_id={CHECKOUT_SESSION_ID}`,
  metadata: {
    flow_type: 'superai_enterprise_custom_credits_flow',
    invoice_amount: '25000000', // $250,000 in cents
    credit_units: '1000000' // 1,000,000 custom units
  }
});
```

### Post-Checkout Processing

#### 1. Get Pricing Plan Details
```typescript
const pricingPlanResponse = await fetch(
  `https://api.stripe.com/v2/billing/pricing_plans/${pricingPlanId}`,
  {
    headers: {
      'Stripe-Version': 'unsafe-development'
    }
  }
);
```

#### 2. Create Billing Intent
```typescript
const billingIntentResponse = await fetch(
  'https://api.stripe.com/v2/billing/billing_intents',
  {
    method: 'POST',
    body: JSON.stringify({
      customer: customer.id,
      pricing_plan_version: planVersion,
      customer_timezone: 'Europe/London'
    })
  }
);
```

#### 3. Create and Pay Invoice
```typescript
// Create invoice
const invoice = await stripe.invoices.create({
  customer: customer.id,
  auto_advance: false
});

// Add invoice item
await stripe.invoiceItems.create({
  customer: customer.id,
  price_data: {
    currency: 'usd',
    product: 'prod_T9SJrht8qO7y5t',
    unit_amount: invoiceAmount
  },
  quantity: 1,
  description: 'Credit Grant',
  invoice: invoice.id
});

// Finalize and pay
await stripe.invoices.finalize(invoice.id);
await stripe.invoices.pay(invoice.id);
```

#### 4. Create Credit Grant
```typescript
const creditGrantBody = new URLSearchParams({
  'amount[custom_pricing_unit][id]': 'cpu_test_61TT5XePmbXQBegOk16T5kls95SQJJF9DR1pbaQwq4ye',
  'amount[custom_pricing_unit][value]': creditUnits,
  'amount[type]': 'custom_pricing_unit',
  'applicability_config[scope][price_type]': 'metered',
  'category': 'paid',
  'customer': customer.id,
  'name': 'Purchased Credits',
  'expires_at': expiresAtTimestamp.toString()
});

const creditGrantResponse = await fetch('https://api.stripe.com/v1/billing/credit_grants', {
  method: 'POST',
  headers: {
    'Stripe-Version': '2025-05-28.basil;checkout_product_catalog_preview=v1'
  },
  body: creditGrantBody
});
```

#### 5. Commit Billing Intent
```typescript
const committedIntent = await fetch(
  `https://api.stripe.com/v2/billing/billing_intents/${billingIntent.id}/commit`,
  {
    method: 'POST',
    body: JSON.stringify({
      default_payment_method: paymentMethod.id
    })
  }
);
```

## API Endpoints

### Customer Creation & Checkout

#### `/api/create-superai-enterprise-flow` (POST)
Creates Enterprise plan checkout flow
- **Input**: `{ name: string, email: string }`
- **Output**: `{ checkoutUrl, sessionId, customerId, testClockId }`

#### `/api/superai-custom-credits-flow` (POST)
Creates Pro plan checkout flow
- **Input**: `{ name: string, email: string }`
- **Output**: `{ checkoutUrl, sessionId, customerId, testClockId }`

#### `/api/create-superai-core-flow` (POST)
Creates Core plan checkout flow
- **Input**: `{ name: string, email: string }`
- **Output**: `{ checkoutUrl, sessionId, customerId, testClockId }`

### Post-Checkout Processing

#### `/api/process-checkout-success` (POST)
Processes successful checkout and creates subscription
- **Input**: `{ sessionId: string }`
- **Output**: Complete customer, billing, and subscription details
- **Actions**:
  1. Retrieves checkout session
  2. Gets pricing plan details
  3. Creates billing intent
  4. Creates and pays invoice
  5. Creates credit grant
  6. Commits billing intent
  7. Returns comprehensive response

### Usage Tracking

#### `/api/meter-superai` (POST)
Records AI3 events
- **Input**: 
  ```json
  {
    "customerId": "cus_xxx",
    "date": "2025-01-01",
    "value": 100,
    "type": "account" | "pg" | "object"
  }
  ```
- **Event Name**: `AI3`
- **Meter**: Tracks SuperAI operations with type classification

#### `/api/meter-ai1` (POST)
Records AI4 events
- **Input**: 
  ```json
  {
    "customerId": "cus_xxx",
    "date": "2025-01-01",
    "value": 50,
    "type": "basic" | "advanced"
  }
  ```
- **Event Name**: `AI4`
- **Meter**: Tracks AI-1 token usage with complexity levels

### Credit Management

#### `/api/credit-balance` (POST)
Retrieves customer credit balance
- **Input**: `{ customerId: string }`
- **Output**: `{ grantedUnits, availableUnits }`

#### `/api/SuperAI-create-invoice-and-credit` (POST)
Creates top-up invoice and credit grant
- **Input**: 
  ```json
  {
    "customerId": "cus_xxx",
    "invoiceAmount": 100000,
    "creditAmount": 500000
  }
  ```
- **Actions**:
  1. Creates invoice
  2. Adds invoice item
  3. Finalizes invoice
  4. Pays invoice
  5. Creates credit grant

#### `/api/customer-details` (POST)
Fetches customer information
- **Input**: `{ customerId: string }`
- **Output**: Customer object with metadata

## Meter Events

### AI3 Events
- **Event Name**: `AI3`
- **Purpose**: Track SuperAI operations
- **Type Field**: Classification of event type
  - `account`: Account-level operations
  - `pg`: Payment gateway operations
  - `object`: Object-level operations
- **Payload**:
  ```json
  {
    "stripe_customer_id": "cus_xxx",
    "value": "100",
    "type": "account",
    "created": "1234567890"
  }
  ```

### AI4 Events
- **Event Name**: `AI4`
- **Purpose**: Track AI-1 token usage
- **Type Field**: Complexity classification
  - `basic`: Basic token operations
  - `advanced`: Advanced token operations
- **Payload**:
  ```json
  {
    "stripe_customer_id": "cus_xxx",
    "value": "50",
    "type": "basic",
    "created": "1234567890"
  }
  ```

### Meter Event Submission
All meter events are submitted to:
```
POST https://api.stripe.com/v2/billing/meter_events
```

With headers:
```
Content-Type: application/json
Authorization: Bearer ${STRIPE_SECRET_KEY}
Stripe-Version: unsafe-development
```

## Credit Grant System

### Credit Grant Properties
- **Custom Pricing Unit ID**: `cpu_test_61TT5XePmbXQBegOk16T5kls95SQJJF9DR1pbaQwq4ye`
- **Type**: Custom Pricing Unit (not monetary)
- **Category**: `paid`
- **Expiration**: 1 year from creation
- **Scope**: Applies to metered prices
- **Name**: "Purchased Credits"

### Credit Depletion
Credits are automatically deducted when:
1. Meter events are recorded
2. Events match the metered price types in the pricing plan
3. Customer has active credit grants available
4. Credits haven't expired

### Top-Up Flow
Users can purchase additional credits:
1. Navigate to success page
2. Click "Top Up" button
3. Enter desired invoice amount and credit amount
4. System creates and pays invoice
5. Credit grant is created automatically
6. New credits are added to customer balance

## Getting Started

### Prerequisites
- Node.js 18+
- Stripe account with Billing v2 enabled
- Stripe API keys

### Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Testing Flow
1. Navigate to `/SuperAI`
2. Select a plan (Core, Pro, or Enterprise)
3. Enter customer name and email
4. Complete Stripe Checkout
5. View success page with credit balance
6. Record usage through meter event inputs
7. View credit depletion in real-time

## Project Structure

```
saas/
├── app/
│   ├── api/
│   │   ├── create-superai-enterprise-flow/   # Enterprise checkout
│   │   ├── create-superai-core-flow/          # Core checkout
│   │   ├── superai-custom-credits-flow/       # Pro checkout
│   │   ├── process-checkout-success/          # Post-checkout processing
│   │   ├── meter-superai/                     # AI3 event tracking
│   │   ├── meter-ai1/                         # AI4 event tracking
│   │   ├── credit-balance/                    # Credit balance API
│   │   ├── customer-details/                  # Customer info API
│   │   └── SuperAI-create-invoice-and-credit/ # Top-up API
│   └── SuperAI/
│       ├── page.tsx                           # Plan selection page
│       ├── success_enterprise/                # Enterprise success page
│       ├── success_core/                      # Core success page
│       └── customunitssuccess/                # Pro success page
├── components/
│   └── ui/
│       ├── starter-payment-modal.tsx          # Payment modal
│       └── superai-core-modal.tsx             # Core plan modal
└── lib/
    └── payments/
        └── stripe.ts                          # Stripe utilities
```

## Key Concepts

### Usage-Based Billing (UBB)
- Charges based on actual usage rather than fixed subscription
- Credits prepaid, depleted as services are consumed
- Real-time tracking through meter events

### Custom Pricing Units
- Non-monetary units for flexible billing
- Decouples pricing from currency
- Enables complex credit systems

### Test Clocks
- Allows controlled time manipulation for testing
- Tests time-based billing scenarios
- Set to specific timezone (London/GMT)

### Billing Intents
- Stripe's way to manage subscription lifecycle
- Committed after payment method attached
- Links pricing plans to customers

## Troubleshooting

### Common Issues

**Credit grants not appearing**
- Verify custom pricing unit ID matches
- Check credit grant creation logs
- Ensure invoice was paid successfully

**Meter events not deducting credits**
- Confirm event name matches meter configuration
- Verify pricing plan includes metered prices
- Check customer has available credits

**Checkout session fails**
- Validate pricing plan ID exists
- Ensure test clock creation succeeded
- Check Stripe API version compatibility

## Things to Do

### ⚠️ Critical: Fix Enterprise Pricing Plan Credit Grant Logic

**Current Issue:**
The Enterprise plan is currently using the same credit grant logic as the Core and Pro plans, which creates credits based on **Custom Pricing Units**. This is incorrect for the Enterprise tier.

**Current Implementation (Incorrect):**
```typescript
// In /api/process-checkout-success/route.ts (lines 776-785)
const creditGrantBody = new URLSearchParams({
  'amount[custom_pricing_unit][id]': 'cpu_test_61TT5XePmbXQBegOk16T5kls95SQJJF9DR1pbaQwq4ye',
  'amount[custom_pricing_unit][value]': creditUnits,
  'amount[type]': 'custom_pricing_unit',
  'applicability_config[scope][price_type]': 'metered',
  'category': 'paid',
  'customer': customer.id,
  'name': 'Purchased Credits',
  'expires_at': expiresAtTimestamp.toString()
});
```

**Required Change:**
The Enterprise pricing plan (`bpp_test_61TeLpk36MZRGgydI16T5kls95SQJJF9DR1pbaQwq7js`) needs to be updated to use **monetary credit grants** instead of custom pricing units.

**Expected Implementation:**
```typescript
// Enterprise plan should use monetary credits
const creditGrantBody = new URLSearchParams({
  'amount[monetary][value]': invoiceAmount, // $250,000 in cents
  'amount[type]': 'monetary',
  'applicability_config[scope][price_type]': 'metered',
  'category': 'paid',
  'customer': customer.id,
  'name': 'Purchased Credits',
  'expires_at': expiresAtTimestamp.toString()
});
```

**Action Items:**
1. Update the Enterprise pricing plan in Stripe Dashboard
2. Modify `/api/process-checkout-success/route.ts` to differentiate between plan types
3. Add conditional logic to use monetary credits for Enterprise:
   ```typescript
   if (flowType === 'superai_enterprise_custom_credits_flow') {
     // Use monetary credit grant logic
   } else {
     // Use custom pricing unit logic (for Core and Pro)
   }
   ```
4. Update Enterprise metadata to reflect monetary credit structure
5. Test the new credit grant creation and depletion flow
6. Update documentation to reflect the distinction between plan types

**Impact:**
- Enterprise customers will receive monetary credits that can be applied against invoices
- Different from Core/Pro plans which use custom pricing units
- Allows for more flexible pricing and discount structures at the Enterprise level

**Priority:** High - This affects core billing functionality for Enterprise tier

## Additional Resources

- [Stripe Billing v2 Documentation](https://stripe.com/docs/billing)
- [Custom Pricing Units Guide](https://stripe.com/docs/billing/subscriptions/usage-based/custom-units)
- [Meter Events API](https://stripe.com/docs/api/billing/meter-event)
- [Test Clocks](https://stripe.com/docs/billing/testing/test-clocks)
- [Credit Grants - Monetary vs Custom Units](https://stripe.com/docs/billing/subscriptions/credits)

## License

This is a demo project for educational purposes.


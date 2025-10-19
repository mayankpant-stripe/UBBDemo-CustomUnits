'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface SuccessData {
  customerId: string;
  customer?: { id: string; name?: string | null; email?: string | null };
  session?: { id: string; intentId?: string | null; mode?: string };
  billing?: {
    cadenceId?: string;
    pricingPlanId: string;
    billingIntentId: string;
    status: string;
  };
  creditGrant?: { grantedUnits: string; availableUnits: string };
}

export default function SuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');
  const urlCustomerId = params.get('customerid');
  const [manualCustomerId, setManualCustomerId] = useState(urlCustomerId || '');
  const [loadingManual, setLoadingManual] = useState(false);
  const [data, setData] = useState<SuccessData | null>(null);
  const [loading, setLoading] = useState(true); // Set to true initially
  const [error, setError] = useState<string | null>(null);
  const [openAiModal, setOpenAiModal] = useState(false);
  const [openAiDate, setOpenAiDate] = useState(() => new Date().toISOString().slice(0,10));
  const [openAiEvents, setOpenAiEvents] = useState<number | ''>('');
  const [openAiSubmitting, setOpenAiSubmitting] = useState(false);
  const [grokModal, setGrokModal] = useState(false);
  const [grokDate, setGrokDate] = useState(() => new Date().toISOString().slice(0,10));
  const [grokEvents, setGrokEvents] = useState<number | ''>('');
  const [grokSubmitting, setGrokSubmitting] = useState(false);
  const [claudeModal, setClaudeModal] = useState(false);
  const [claudeDate, setClaudeDate] = useState(() => new Date().toISOString().slice(0,10));
  const [claudeEvents, setClaudeEvents] = useState<number | ''>('');
  const [claudeSubmitting, setClaudeSubmitting] = useState(false);
  const [topUpModal, setTopUpModal] = useState(false);
  const [invoiceAmount, setInvoiceAmount] = useState<number>(500);
  const [creditAmount, setCreditAmount] = useState<number>(5000);
  const [topUpSubmitting, setTopUpSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        // Path A: we have a checkout session → use existing flow
        if (sessionId) {
          const res = await fetch('/api/process-checkout-success', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const json = await res.json();
          if (!res.ok || !json.success) {
            throw new Error(json.details || json.error || 'Failed to load success data');
          }
          let creditGrant: { grantedUnits: string; availableUnits: string } | undefined;
          try {
            const creditRes = await fetch('/api/credit-balance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: json.customer?.id || json.customerId })
            });
            const creditJson = await creditRes.json();
            if (creditRes.ok && creditJson.success) {
              creditGrant = {
                grantedUnits: creditJson.grantedUnits,
                availableUnits: creditJson.availableUnits
              };
            }
          } catch {}
          setData({ ...json, ...(creditGrant ? { creditGrant } : {}) });
          // After processing, replace the URL with customerid to make refresh idempotent
          try {
            const cid = json.customer?.id || json.customerId;
            if (cid && typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('session_id');
              url.searchParams.set('customerid', cid);
              window.history.replaceState({}, '', url.toString());
            }
          } catch {}
          return;
        }

        // Path B: manage-sub provided a customerid → fetch customer + credit balance
        if (urlCustomerId) {
          // fetch basic customer details
          let customer: any | undefined;
          try {
            const custRes = await fetch('/api/customer-details', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: urlCustomerId })
            });
            const custJson = await custRes.json();
            if (custRes.ok && custJson.success) customer = custJson.customer;
          } catch {}

          let creditGrant: { grantedUnits: string; availableUnits: string } | undefined;
          try {
            const creditRes = await fetch('/api/credit-balance', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ customerId: urlCustomerId })
            });
            const creditJson = await creditRes.json();
            if (creditRes.ok && creditJson.success) {
              creditGrant = {
                grantedUnits: creditJson.grantedUnits,
                availableUnits: creditJson.availableUnits
              };
            }
          } catch {}

          setData({ success: true, customerId: urlCustomerId, customer, ...(creditGrant ? { creditGrant } : {}) } as any);
          return;
        }

        // Neither session nor customerid
        setError('Provide a session_id or customerid.');
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [sessionId, urlCustomerId]);

  const customerName = data?.customer?.name || 'Customer';
  const customerEmail = (data as any)?.customer?.email || '';
  const customerId = urlCustomerId || data?.customer?.id || data?.customerId || '';
  const paymentMethod = (data as any)?.customer?.paymentMethodId || (data as any)?.paymentMethodId || (data as any)?.session?.intentId || '';
  const grantedUnits = data?.creditGrant?.grantedUnits || '—';
  const availableUnits = data?.creditGrant?.availableUnits || '—';

  return (
    <main className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'white' }}>

      <div className="relative max-w-6xl mx-auto px-4 py-10">
        {/* Main Container Box */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-sm tracking-wide uppercase font-semibold shadow">Customer ID</span>
            <input
              value={manualCustomerId}
              onChange={(e) => setManualCustomerId(e.target.value)}
              placeholder="cus_..."
              className="h-10 w-[20ch] md:w-[24ch] text-gray-900 text-sm px-3 rounded-full shadow outline-none placeholder-gray-400 border border-blue-200" style={{ backgroundColor: '#eff6ff' }}
            />
            <button
              onClick={async () => {
                if (!manualCustomerId) return;
                try {
                  setLoadingManual(true);
                  // Fetch customer basics
                  const res = await fetch('/api/customer-details', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ customerId: manualCustomerId })
                  });
                  const json = await res.json();
                  if (!res.ok || !json.success) throw new Error(json.error || 'Failed');

                  // Fetch credit balance totals
                  let creditGrant: { grantedUnits: string; availableUnits: string } | undefined;
                  try {
                    const creditRes = await fetch('/api/credit-balance', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ customerId: manualCustomerId })
                    });
                    const creditJson = await creditRes.json();
                    if (creditRes.ok && creditJson.success) {
                      creditGrant = {
                        grantedUnits: creditJson.grantedUnits,
                        availableUnits: creditJson.availableUnits
                      };
                    }
                  } catch {}

                  setData((prev) => ({
                    ...(prev || { customerId: manualCustomerId }),
                    customerId: manualCustomerId,
                    customer: json.customer,
                    ...(creditGrant ? { creditGrant } : {})
                  }));
                } catch (e: any) {
                  setError(e.message || 'Failed to load customer');
                } finally {
                  setLoadingManual(false);
                }
              }}
              className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow transition-colors"
            >
              {loadingManual ? 'Loading...' : 'Load'}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setTopUpModal(true)}
              className="inline-flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-5 rounded-xl shadow transition-colors"
            >
              Top Up
            </button>
            <Link href="/SuperAI" className="inline-flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-5 rounded-xl shadow transition-colors">
              Manage Subscription
            </Link>
          </div>
        </div>

        {/* Stability Pro Plan Success Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Stability Pro Plan Success!!</h1>
          <p className="text-black/80 text-lg">Your Stability Pro Plan subscription is now active</p>
        </div>

        {/* Content Card */}
        <div className="rounded-2xl p-6 text-black shadow-xl border-2 border-gray-300" style={{ backgroundColor: 'white' }}>
          {loading && <p className="text-black/80">Loading customer details...</p>}
          {error && <p className="text-red-300">Error: {error}</p>}
          {data && (
            <div className="space-y-8">
              {/* At-a-glance strip */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="rounded-xl p-4 border-2 border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
                  <div className="text-black text-xs uppercase tracking-wide font-bold">Name</div>
                  <div className="text-black font-bold mt-1 truncate">{customerName || '—'}</div>
                </div>
                <div className="rounded-xl p-4 border-2 border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
                  <div className="text-black text-xs uppercase tracking-wide font-bold">Customer ID</div>
                  <div className="text-black font-bold font-mono mt-1 truncate">{customerId || '—'}</div>
                </div>
                <div className="rounded-xl p-4 border-2 border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
                  <div className="text-black text-xs uppercase tracking-wide font-bold">Email</div>
                  <div className="text-black font-bold mt-1 truncate">{customerEmail || '—'}</div>
                </div>
              </div>

              {/* Customer Details removed by request */}

              {/* Credit Grants */}
              <section>
                <div className="inline-flex items-center gap-2 bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow mb-4">
                  <span>Credit Grants</span>
                </div>
                <div className="rounded-xl p-6 border-2 border-gray-200 text-black" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="grid md:grid-cols-2 gap-6 mb-4">
                    <span className="pill text-black font-bold border-2" style={{ backgroundColor: 'white', borderColor: '#3b82f6' }}>Granted Credits</span>
                    <span className="pill text-black font-bold border-2" style={{ backgroundColor: 'white', borderColor: '#3b82f6' }}>Available Credits</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <span className="metric text-black font-bold border-2" style={{ backgroundColor: 'white', borderColor: '#3b82f6' }}>{grantedUnits}</span>
                    <span className="metric text-black font-bold border-2" style={{ backgroundColor: 'white', borderColor: '#3b82f6' }}>{availableUnits}</span>
                  </div>
                </div>
              </section>

              {/* Input Usage */}
              <section>
                <div className="inline-flex items-center gap-2 bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow mb-4">
                  <span>Input Usage</span>
                </div>
                <div className="rounded-xl p-6 border-2 border-gray-300" style={{ backgroundColor: 'white' }}>
                  <div className="flex justify-center">
                    <button className="action bg-blue-700 text-white hover:bg-blue-800" onClick={() => setOpenAiModal(true)}>Input Operations</button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
        {/* End Main Container Box */}
        </div>
      </div>

      {/* utility styles for chips/buttons in one place */}
      <style jsx>{`
        .chip { background: rgba(255,255,255,0.08); color: #fff; padding: 0.5rem 1rem; border-radius: 0.75rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); }
        .value { background: rgba(255,255,255,0.08); color: #fff; padding: 0.5rem 1rem; border-radius: 0.75rem; font-weight: 800; border: 1px solid rgba(255,255,255,0.2); }
        .pill { padding: 0.75rem 1.25rem; border-radius: 0.75rem; text-align: center; }
        .metric { padding: 0.75rem 1.25rem; border-radius: 0.75rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; text-align: center; }
        .action { padding: 0.875rem 1rem; border-radius: 0.75rem; font-weight: 700; color: #fff; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.25), 0 4px 6px -4px rgba(0,0,0,0.25); transition: transform .15s ease, background-color .2s ease; }
        .action.green { background: #22c55e; }
        .action.green:hover { background: #16a34a; transform: translateY(-1px); }
        .action:active { transform: translateY(0); }
      `}</style>

      {openAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify_between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Record Operations usage</h2>
              <button
                onClick={() => !openAiSubmitting && setOpenAiModal(false)}
                className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                disabled={openAiSubmitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (openAiEvents === '' || !Number.isFinite(Number(openAiEvents))) return;
                try {
                  setOpenAiSubmitting(true);
                  const resp = await fetch('/api/meter-superai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      customerId,
                      date: openAiDate,
                      value: Number(openAiEvents)
                    })
                  });
                  const json = await resp.json();
                  if (!resp.ok || !json.success) {
                    throw new Error(json.error || 'Failed to register Operations usage');
                  }
                  setOpenAiModal(false);
                  setOpenAiEvents('');
                } catch (err) {
                  console.error(err);
                } finally {
                  setOpenAiSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={openAiDate}
                  onChange={(e) => setOpenAiDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operations</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={openAiEvents}
                  onChange={(e) => setOpenAiEvents(e.target.value === '' ? '' : Number(e.target.value))}
                  min={0}
                  step={1}
                  required
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => !openAiSubmitting && setOpenAiModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                  disabled={openAiSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md disabled:bg-gray-400"
                  disabled={openAiSubmitting}
                >
                  {openAiSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Up Modal */}
      {topUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-black">Top Up Credits</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!data?.customerId) {
                  alert('Customer ID not available');
                  return;
                }
                setTopUpSubmitting(true);
                try {
                  const response = await fetch('/api/SuperAI-create-invoice-and-credit', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      customerId: data.customerId,
                      invoiceAmount,
                      creditAmount
                    })
                  });
                  const result = await response.json();
                  if (result.success) {
                    alert(result.message);
                    setTopUpModal(false);
                    // Reload the page to show updated credit balance
                    window.location.reload();
                  } else {
                    alert('Error: ' + (result.details || result.error));
                  }
                } catch (error) {
                  alert('Failed to create top-up: ' + error);
                } finally {
                  setTopUpSubmitting(false);
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-black">Invoice Amount ($)</label>
                  <input
                    type="number"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-blue-50"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-black">Credit Grant (Custom Units)</label>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-black bg-blue-50"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => !topUpSubmitting && setTopUpModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                  disabled={topUpSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md disabled:bg-gray-400"
                  disabled={topUpSubmitting}
                >
                  {topUpSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claude and Grok modals removed for custom units success page */}
    </main>
  );
}



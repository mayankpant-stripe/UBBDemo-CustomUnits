'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import heroImage from '../../docs/SuperAI.svg';
import StarterPaymentModal from '@/components/ui/starter-payment-modal';
import SuperAICoreModal from '@/components/ui/superai-core-modal';

export default function NewHackPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCoreModalOpen, setIsCoreModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'superai-core' | 'superai-pro'>('superai-pro');
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [usageCustomerId, setUsageCustomerId] = useState('');
  const [usageDate, setUsageDate] = useState(() => new Date().toISOString().slice(0,10));
  const [usageSystem, setUsageSystem] = useState('Open AI');
  const [usageValue, setUsageValue] = useState<number | ''>('');
  const [usageSubmitting, setUsageSubmitting] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutStatus = urlParams.get('checkout');
    const sessionId = urlParams.get('session_id');

    if (checkoutStatus === 'success' && sessionId) {
      handleCheckoutSuccess(sessionId);
    } else if (checkoutStatus === 'cancelled') {
      setMessage('Checkout was cancelled. You can try again anytime.');
      setMessageType('error');
    }

    if (checkoutStatus) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCheckoutSuccess = async (sessionId: string) => {
    setIsProcessing(true);
    setMessage('Processing your payment and setting up your account...');
    setMessageType('success');

    try {
      const response = await fetch('/api/process-checkout-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId })
      });

      const data = await response.json();

      if (data.success) {
        const planName = selectedPlan === 'superai-pro' ? 'SuperAI Pro' : 'SuperAI Core';
        const customerId = data.customerId || data.customer?.id;
        const subscriptionId = data.subscriptionId || data.billing?.billingIntentId;
        const testClockInfo = data.testClock ? `, Test Clock: ${data.testClock.id}` : '';
        setMessage(`🎉 Success! Welcome ${data.customer?.name || 'Customer'}! Your ${planName} Plan is now active. Customer ID: ${customerId}, Subscription ID: ${subscriptionId}${testClockInfo}`);
        setMessageType('success');
      } else {
        throw new Error(data.details || data.error);
      }
    } catch (error) {
      setMessage(`Error processing your payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handler functions for SuperAI plans

  const handleProClick = () => {
    setSelectedPlan('superai-pro');
    setIsModalOpen(true);
    setMessage('');
    setMessageType('');
  };

  const handleCoreClick = () => {
    setIsCoreModalOpen(true);
    setMessage('');
    setMessageType('');
  };


  const handleModalSuccess = (data: { customerId: string; billingIntentId?: string; subscriptionId?: string; testClockId?: string }) => {
    const planName = selectedPlan === 'superai-pro' ? 'SuperAI Pro' : 'SuperAI Core';
    const subscriptionId = data.subscriptionId || data.billingIntentId;
    const testClockInfo = data.testClockId ? `, Test Clock: ${data.testClockId}` : '';
    setMessage(`Success! Customer created and subscribed to ${planName} plan. Customer ID: ${data.customerId}, Subscription ID: ${subscriptionId}${testClockInfo}`);
    setMessageType('success');
    setIsModalOpen(false);
  };

  const handleModalError = (error: string) => {
    setMessage(`Error: ${error}`);
    setMessageType('error');
    setIsModalOpen(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleCoreModalSuccess = (data: { customerId: string; billingIntentId?: string; subscriptionId?: string; testClockId?: string }) => {
    const subscriptionId = data.subscriptionId || data.billingIntentId;
    const testClockInfo = data.testClockId ? `, Test Clock: ${data.testClockId}` : '';
    setMessage(`Success! Customer created and subscribed to SuperAI Core plan. Customer ID: ${data.customerId}, Subscription ID: ${subscriptionId}${testClockInfo}`);
    setMessageType('success');
    setIsCoreModalOpen(false);
  };

  const handleCoreModalError = (error: string) => {
    setMessage(`Error: ${error}`);
    setMessageType('error');
    setIsCoreModalOpen(false);
  };

  const handleCoreModalClose = () => {
    setIsCoreModalOpen(false);
  };

  const submitUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usageCustomerId || usageValue === '' || !Number.isFinite(Number(usageValue))) {
      setMessage('Please input Customer Id and a numeric Usage events value.');
      setMessageType('error');
      return;
    }
    try {
      setUsageSubmitting(true);
      const resp = await fetch('/api/meter-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: usageCustomerId.trim(),
          date: usageDate,
          system: usageSystem,
          value: Number(usageValue)
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data.error || 'Failed to register meter event');
      }
      setMessage(`Meter event has been registered under "${data.event_name}" for the customer "${data.customerId}"`);
      setMessageType('success');
      setIsUsageOpen(false);
      setUsageCustomerId('');
      setUsageSystem('');
      setUsageValue('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to register meter event');
      setMessageType('error');
    } finally {
      setUsageSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white !bg-white">
      <section className="relative w-full h-28 md:h-32 bg-white">
        <Image src={heroImage} alt="Header" fill priority className="object-contain" />
      </section>
      {/* Plan cards */}
      <section className="py-8 px-4 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Core card */}
          <div className="w-full bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-sm font-semibold text-[#2A0148] mb-1">Core</div>
              <div className="text-xl font-extrabold tracking-tight text-gray-900 mb-1">
                <span className="align-top text-2xl mr-1">$</span>100,000
                <span className="text-base font-medium text-gray-500 ml-1"> </span></div>
              <div className="text-gray-500 text-sm mb-6">500,000 SuperAI Credits
              </div>
              <button
                onClick={handleCoreClick}
                disabled={isProcessing}
                className="w-full h-12 bg-[#2A0148] hover:bg-[#3a0166] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors duration-200 shadow-md"
              >
                {isProcessing ? 'Processing...' : 'SuperAI Core'}
              </button>
              <div className="text-gray-700 text-sm mt-6">For individuals getting started with automation</div>
            </div>
            <div className="mt-6">
              <div className="text-gray-900 font-semibold mb-3">Free includes:</div>
              <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>No-code visual workflow builder</span></li>
              <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>2000+ apps</span></li>
              <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Routers & filters</span></li>
              <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Customer support</span></li>
              <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>15-minute minimum interval between runs</span></li>
             </ul>
            </div>
          </div>

          {/* Pro card */}
          <div className="w-full bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-sm font-semibold text-[#2A0148] mb-1">Pro</div>
              <div className="text-xl font-extrabold tracking-tight text-gray-900 mb-1">
                <span className="align-top text-2xl mr-1">$</span>1,000 per month
                <span className="text-base font-medium text-gray-500 ml-1"></span></div>
              <div className="text-gray-500 text-sm mb-6">10,000 SuperAI Credits</div>
              <button
                onClick={handleProClick}
                disabled={isProcessing}
                className="w-full h-12 bg-[#2A0148] hover:bg-[#3a0166] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors duration-200 shadow-md"
              >
                {isProcessing ? 'Processing...' : 'SuperAI Pro'}
              </button>
              <div className="text-gray-700 text-sm mt-6">For individuals with growing business needs</div>
            </div>

            <div className="mt-6">
              <div className="text-gray-900 font-semibold mb-3">Everything in Core, plus:</div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Priority scenario execution</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Custom variables</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Full-text execution log search</span></li>
              </ul>
            </div>
          </div>

          {/* Enterprise card */}
          <div className="w-full bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="text-center">
              <div className="text-sm font-semibold text-[#2A0148] mb-1">Enterprise</div>
              <div className="text-xl font-extrabold tracking-tight text-gray-900 mb-1">
                <span className="align-top text-xl mr-1"></span> Custom
              </div>
              <div className="text-gray-500 text-sm mb-6">Growing business together</div>
              <button
                disabled={isProcessing}
                className="w-full h-12 bg-[#2A0148] hover:bg-[#3a0166] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors duration-200 shadow-md"
                >             
                SuperAI Enterprise
              </button>
              <div className="text-gray-700 text-sm mt-6">For organizations running critical business processes with automation</div>
            </div>

            <div className="mt-6">
              <div className="text-gray-900 font-semibold mb-3">Everything in Pro, plus:</div>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Custom functions support</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Enterprise app integrations</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>24/7 Enterprise support</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Access to Value Engineering team</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Overage protection</span></li>
                <li className="flex items-start gap-2"><span className="text-green-600 mt-0.5">✔</span><span>Advanced security features</span></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <StarterPaymentModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        onError={handleModalError}
        planType={selectedPlan}
      />

      <SuperAICoreModal
        isOpen={isCoreModalOpen}
        onClose={handleCoreModalClose}
        onSuccess={handleCoreModalSuccess}
        onError={handleCoreModalError}
      />
    </main>
  );
}


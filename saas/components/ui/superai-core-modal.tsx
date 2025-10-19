'use client';

import React, { useState } from 'react';

interface SuperAICoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { customerId: string; billingIntentId?: string; subscriptionId?: string; testClockId?: string }) => void;
  onError: (error: string) => void;
}

const SuperAICoreModal: React.FC<SuperAICoreModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      onError('Please enter both name and email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/create-superai-core-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.checkoutUrl) {
          // Redirect to Stripe Checkout
          window.location.href = data.checkoutUrl;
        } else {
          onError(data.error || 'Failed to process request');
        }
      } else {
        onError(data.error || 'Failed to create checkout session');
      }

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      onError('Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setEmail('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Subscribe to SuperAI Core</h2>
            <p className="text-gray-600 text-sm">
              500,000 Prepaid Credits • Pricing Plan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2A0148] focus:border-transparent outline-none transition-all text-gray-900"
                placeholder="Enter your full name"
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2A0148] focus:border-transparent outline-none transition-all text-gray-900"
                placeholder="Enter your email"
                disabled={isLoading}
                required
              />
            </div>

            {/* Features List */}
            <div className="bg-gray-50 rounded-lg p-4 my-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Includes:</p>
              <ul className="space-y-1.5 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  <span>No-code visual workflow builder</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  <span>2000+ apps</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  <span>Routers & filters</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-600">✔</span>
                  <span>Customer support</span>
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-[#2A0148] text-white font-semibold rounded-lg hover:bg-[#3a0166] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Continue to Checkout'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SuperAICoreModal;


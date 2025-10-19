'use client';

import React, { useState } from 'react';

interface StarterPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { customerId: string; billingIntentId?: string; subscriptionId?: string; testClockId?: string }) => void;
  onError: (error: string) => void;
  planType?: 'superai-core' | 'superai-pro';
}

const StarterPaymentModal: React.FC<StarterPaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  onError,
  planType = 'superai-pro'
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
      let apiEndpoint;
      if (planType === 'superai-pro') {
        apiEndpoint = '/api/superai-custom-credits-flow';
      } else if (planType === 'superai-core') {
        apiEndpoint = '/api/create-superai-core-flow';
      } else {
        onError('Unknown plan type');
        return;
      }
          
      const response = await fetch(apiEndpoint, {
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
          // Redirect to Stripe Checkout for all plans (including Core and Pro)
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

  const getPlanInfo = () => {
    switch (planType) {
      case 'superai-pro':
        return {
          title: 'SuperAI Pro Plan',
          price: '$1,000 per month',
          features: ['10,000 SuperAI Credits', 'Priority scenario execution', 'Custom variables', 'Full-text execution log search']
        };
      case 'superai-core':
        return {
          title: 'SuperAI Core Plan',
          price: '$100,000',
          features: ['500,000 SuperAI Credits', 'No-code visual workflow builder', '2000+ apps', 'Customer support']
        };
      default:
        return {
          title: 'SuperAI Pro Plan',
          price: '$1,000 per month',
          features: ['10,000 SuperAI Credits', 'Priority scenario execution', 'Custom variables', 'Full-text execution log search']
        };
    }
  };

  const planInfo = getPlanInfo();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Subscribe to {planInfo.title}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-gray-900">{planInfo.title}</span>
            <span className="text-lg font-bold text-purple-600">{planInfo.price}</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1">
            {planInfo.features.map((feature, index) => (
              <li key={index} className="flex items-center">
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Continue to Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StarterPaymentModal; 
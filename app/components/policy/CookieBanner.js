'use client';

import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    if (cookiesAccepted === null) {
      setAccepted(false);
    }
  }, []);

  if (accepted) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-600 text-center sm:text-left">
          We use essential cookies to ensure our website works properly and provide you with the best experience.
        </p>
        <button
          onClick={() => {
            localStorage.setItem('cookiesAccepted', 'true');
            setAccepted(true);
          }}
          className="px-6 py-2 bg-primary text-white hover:bg-secondary rounded-lg transition-all duration-200 text-sm whitespace-nowrap"
        >
          Accept & Close
        </button>
      </div>
    </div>
  );
}
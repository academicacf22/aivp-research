'use client';

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

export default function VerificationModal({ email, onClose, onLogin }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-primary mb-4">Verify Your Email</h2>
                    <p className="text-gray-600 mb-6">
                        We've sent a verification link to <strong>{email}</strong>.
                        Please check your email and click the link to verify your account.
                    </p>
                    <div className="space-y-4">
                        <button
                            onClick={onLogin}
                            className="w-full btn btn-primary"
                        >
                            Go to Login
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full btn btn-secondary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
} 
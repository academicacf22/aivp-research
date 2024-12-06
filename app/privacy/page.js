'use client';

import Layout from '../components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-primary mb-8">Privacy Policy - CLERKtheAI</h1>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Overview</h2>
              <p className="text-gray-700">
                This privacy policy explains how ClerktheAI collects and processes your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data We Collect</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">1. Account Data:</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>University or nhs.net email address</li>
                    <li>Authentication details</li>
                    <li>Usage statistics</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">2. Consultation Data:</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Chat messages and responses</li>
                    <li>Session transcripts</li>
                    <li>Usage metrics</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    3. Research Participant Data (if consent given):
                  </h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Anonymised consultation data</li>
                    <li>Research profile information</li>
                    <li>Interview responses</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Continue with all other sections */}
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Data</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>To provide the AI Virtual Patient service</li>
                <li>To maintain your account</li>
                <li>For research purposes (if consented)</li>
                <li>To monitor for professional conduct</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Data Storage and Security</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Data stored using Firebase (Google Cloud Platform)</li>
                <li>Industry-standard encryption (AES-256)</li>
                <li>Secure transmission (HTTPS/TLS)</li>
                <li>Access restricted to authorised personnel</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">1. Firebase (Google Cloud Platform):</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Account management</li>
                    <li>Data storage</li>
                    <li>Authentication</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">2. OpenAI:</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Processes consultation messages</li>
                    <li>No training on provided data</li>
                    <li>Access limited to system functionality</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">3. Vercel:</h3>
                  <ul className="list-disc pl-6 text-gray-700 space-y-1">
                    <li>Website hosting</li>
                    <li>No data storage</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Add remaining sections... */}
            {/* ... */}

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Contact</h2>
              <p className="text-gray-700">
                For data-related queries please email me at{' '}
                <a href="mailto:a.narain@keele.ac.uk" className="text-primary hover:underline">
                  a.narain@keele.ac.uk
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  );
}
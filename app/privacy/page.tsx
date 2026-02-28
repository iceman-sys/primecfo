export default function Privacy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Internal Application Privacy Policy
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Last Updated: November 18, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            1. Internal Use Only
          </h2>
          <p className="text-gray-700 leading-relaxed">
            This application is for internal use by Prime Accounting Solutions, LLC only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            2. Data Collection
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We collect and process financial data from connected QuickBooks accounts solely for 
            internal business management purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            3. Data Storage
          </h2>
          <p className="text-gray-700 leading-relaxed">
            All data is stored securely using industry-standard encryption.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            4. Third-Party Services
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We integrate with QuickBooks for accounting data. Each service maintains its own 
            privacy and security standards.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            5. No External Sharing
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Data is never shared outside of Prime Accounting Solutions, LLC except as required for the 
            operation of integrated services (QuickBooks).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            6. Access Control
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Access is restricted to authorized personnel only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            Contact
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Questions: <a href="mailto:support@primeaccountingsolutions.com" className="text-blue-600 hover:text-blue-800 underline">support@primeaccountingsolutions.com</a>
          </p>
        </section>
      </div>
    </div>
  );
}

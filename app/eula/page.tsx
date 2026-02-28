export default function EULA() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Internal Use License Agreement
        </h1>
        <p className="text-sm text-gray-600 mb-8">
          Last Updated: November 18, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            1. Restricted Use
          </h2>
          <p className="text-gray-700 leading-relaxed">
            This application ("PrimeCFO.ai") is proprietary software owned and operated by Prime Accounting Solutions, LLC. 
            Access is restricted to authorized employees and contractors of Prime Accounting Solutions, LLC only.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            2. License Grant
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Authorized users are granted a limited, non-exclusive, non-transferable license to use this 
            application solely for internal business purposes of Prime Accounting Solutions, LLC.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            3. Restrictions
          </h2>
          <p className="text-gray-700 leading-relaxed mb-2">Users may NOT:</p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Share access credentials with unauthorized parties</li>
            <li>Use the application for any purpose other than Prime Accounting Solutions, LLC business</li>
            <li>Copy, modify, or distribute the application</li>
            <li>Reverse engineer or attempt to extract source code</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            4. Confidentiality
          </h2>
          <p className="text-gray-700 leading-relaxed">
            All data accessed through this application is confidential and proprietary. Users must maintain 
            strict confidentiality of all client information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            5. Termination
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Access may be revoked at any time at the sole discretion of Prime Accounting Solutions, LLC.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-3">
            6. No Warranty
          </h2>
          <p className="text-gray-700 leading-relaxed">
            This application is provided "as is" for internal use.
          </p>
        </section>

        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-gray-700 leading-relaxed">
            By using this application, you acknowledge that you are an authorized user and agree to these terms.
          </p>
        </div>
      </div>
    </div>
  );
}

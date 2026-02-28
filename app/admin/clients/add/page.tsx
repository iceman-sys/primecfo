'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import AdminAuth from '@/app/components/AdminAuth';
import SignOutButton from '@/app/components/SignOutButton';
import AddClientForm from '@/app/components/AddClientForm';

export default function AddClientPage() {
  const router = useRouter();

  const handleSuccess = (client: any) => {
    console.log('Client created successfully:', client);
  };

  const handleClose = () => {
    router.push('/admin/clients');
  };

  return (
    <AdminAuth>
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.push('/admin/clients')}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Add New Client</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Create a new client and optionally connect their QuickBooks account
                  </p>
                </div>
              </div>
              <SignOutButton variant="link" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AddClientForm 
          onSuccess={handleSuccess}
          onClose={handleClose}
        />
      </div>
    </div>
    </AdminAuth>
  );
}
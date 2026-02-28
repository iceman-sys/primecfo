'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  AlertCircle, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  Tag,
  FileText,
  Link,
  ChevronRight,
  Loader2,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

interface ClientFormData {
  client_name: string;
  company_name: string;
  email: string;
  phone: string;
  client_type: string;
  tags: string[];
  notes: string;
  is_active: boolean;
  qbo_customer_id?: string;
}

interface AddClientFormProps {
  onClose?: () => void;
  onSuccess?: (client: any) => void;
}

export default function AddClientForm({ onClose, onSuccess }: AddClientFormProps) {
  const [formData, setFormData] = useState<ClientFormData>({
    client_name: '',
    company_name: '',
    email: '',
    phone: '',
    client_type: '',
    tags: [],
    notes: '',
    is_active: true,
    qbo_customer_id: ''
  });

  const [currentTag, setCurrentTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newClientId, setNewClientId] = useState<string | null>(null);
  const [qboConnecting, setQboConnecting] = useState(false);
  const [qboConnected, setQboConnected] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  // Client type options
  const clientTypes = [
    'Small Business',
    'Enterprise',
    'Startup',
    'Non-Profit',
    'Individual',
    'Agency',
    'E-commerce',
    'SaaS',
    'Retail',
    'Manufacturing',
    'Healthcare',
    'Real Estate',
    'Other'
  ];

  // Common tags
  const suggestedTags = [
    'VIP',
    'High Priority',
    'New',
    'Monthly Retainer',
    'Project-Based',
    'Hourly',
    'Remote',
    'Local',
    'International'
  ];

  useEffect(() => {
    // Check for OAuth callback parameters
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');
    
    if (connected === 'true') {
      setQboConnected(true);
      setQboConnecting(false);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error === 'connection_failed') {
      setError('Failed to connect to QuickBooks. Please try again.');
      setQboConnecting(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !formData.tags.includes(currentTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddSuggestedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.client_name.trim()) {
      setError('Client name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      setError('Please enter a valid phone number');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Prepare the data to send, explicitly including qbo_customer_id
      const clientData = {
        client_name: formData.client_name,
        company_name: formData.company_name,
        email: formData.email,
        phone: formData.phone,
        client_type: formData.client_type,
        tags: formData.tags,
        notes: formData.notes,
        is_active: formData.is_active,
        qbo_customer_id: formData.qbo_customer_id || null // Explicitly include, send null if empty
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client');
      }
      
      setSuccess(true);
      setNewClientId(result.data.client_id);
      setShowSuccessScreen(true);
      
      if (onSuccess) {
        onSuccess(result.data);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    } finally {
      if (!error) {
        setIsSubmitting(false);
      }
    }
  };

  const handleConnectQuickBooks = () => {
    if (!newClientId) return;
    
    setQboConnecting(true);
    // returnTo=add so callback redirects to /admin/clients?connected=true
    window.location.href = `/api/quickbooks/auth?clientId=${encodeURIComponent(newClientId)}&returnTo=add`;
  };

  const handleFinish = () => {
    if (onClose) {
      onClose();
    } else {
      // Reset form for another entry
      setFormData({
        client_name: '',
        company_name: '',
        email: '',
        phone: '',
        client_type: '',
        tags: [],
        notes: '',
        is_active: true,
        qbo_customer_id: ''
      });
      setSuccess(false);
      setNewClientId(null);
      setQboConnected(false);
      setShowSuccessScreen(false);
      setError(null);
    }
  };

  // Success screen after client creation
  if (showSuccessScreen) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Client Added Successfully!</h2>
          <p className="text-gray-600">Now let's connect their QuickBooks account</p>
        </div>

        <div className="space-y-4">
          {/* Client Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Client Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Name</dt>
                <dd className="font-medium text-gray-900">{formData.client_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900">{formData.email}</dd>
              </div>
              {formData.company_name && (
                <div>
                  <dt className="text-gray-500">Company</dt>
                  <dd className="font-medium text-gray-900">{formData.company_name}</dd>
                </div>
              )}
              {formData.client_type && (
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900">{formData.client_type}</dd>
                </div>
              )}
              {formData.phone && (
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="font-medium text-gray-900">{formData.phone}</dd>
                </div>
              )}
              {formData.qbo_customer_id && (
                <div>
                  <dt className="text-gray-500">QuickBooks ID</dt>
                  <dd className="font-medium text-gray-900">{formData.qbo_customer_id}</dd>
                </div>
              )}
              {formData.tags.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-gray-500 mb-1">Tags</dt>
                  <dd className="flex flex-wrap gap-1">
                    {formData.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* QuickBooks Connection */}
          <div className={`border-2 rounded-lg p-6 transition-all ${
            qboConnected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    qboConnected ? 'bg-green-600' : 'bg-gray-100'
                  }`}>
                    {qboConnecting ? (
                      <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                    ) : qboConnected ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      <Link className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      QuickBooks Integration
                    </h3>
                    <p className="text-sm text-gray-600">
                      {qboConnected 
                        ? 'Successfully connected!' 
                        : qboConnecting 
                          ? 'Connecting to QuickBooks...' 
                          : formData.qbo_customer_id 
                            ? 'Customer ID provided - ready to sync'
                            : 'Connect to sync financial data automatically'}
                    </p>
                  </div>
                </div>
                
                {!qboConnected && !qboConnecting && !formData.qbo_customer_id && (
                  <div className="mt-4 space-y-3">
                    <div className="text-sm text-gray-600">
                      <p className="mb-2">This will allow you to:</p>
                      <ul className="space-y-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Sync invoices and payments automatically</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Track customer balances in real-time</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3 h-3 text-green-600" />
                          <span>Generate financial reports instantly</span>
                        </li>
                      </ul>
                    </div>
                    
                    <button
                      onClick={handleConnectQuickBooks}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <img 
                        src="https://cdn.brandfolder.io/I0O6R8JF/at/c3vm4xbbxcb9f5vqstfnv4/qb-logo-white.svg" 
                        alt="QuickBooks" 
                        className="h-5"
                      />
                      Connect QuickBooks
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {formData.qbo_customer_id && !qboConnected && (
                  <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ✓ QuickBooks Customer ID provided. Financial data will sync using ID: {formData.qbo_customer_id}
                    </p>
                  </div>
                )}
                
                {qboConnected && (
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ QuickBooks account connected successfully. Financial data will sync automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {!qboConnected && !formData.qbo_customer_id && (
              <button
                onClick={handleFinish}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip for Now
              </button>
            )}
            <button
              onClick={handleFinish}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                qboConnected || formData.qbo_customer_id
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {qboConnected || formData.qbo_customer_id ? (
                <>
                  Finish Setup
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Add Another Client
                  <Plus className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Main form
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-7 h-7 text-blue-600" />
          Add New Client
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                type="text"
                id="client_name"
                name="client_name"
                value={formData.client_name}
                onChange={handleInputChange}
                placeholder="John Doe or Company Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleInputChange}
                placeholder="Optional company name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="client@example.com"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 234 567 890"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="client_type" className="block text-sm font-medium text-gray-700 mb-1">
                Client Type
              </label>
              <select
                id="client_type"
                name="client_type"
                value={formData.client_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select type...</option>
                {clientTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* QuickBooks Customer ID */}
            <div>
              <label htmlFor="qbo_customer_id" className="block text-sm font-medium text-gray-700 mb-1">
                QuickBooks Customer ID (Optional)
              </label>
              <input
                type="text"
                id="qbo_customer_id"
                name="qbo_customer_id"
                value={formData.qbo_customer_id || ''}
                onChange={handleInputChange}
                placeholder="e.g., 58 (find in QuickBooks)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to connect later. You can find this in QuickBooks under the customer details.
              </p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tags & Categories</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
            
            {/* Current Tags */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* Suggested Tags */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Suggested tags:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddSuggestedTag(tag)}
                    disabled={formData.tags.includes(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      formData.tags.includes(tag)
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Plus className="inline w-3 h-3 mr-1" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            placeholder="Any additional notes about this client..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Active Status */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            name="is_active"
            checked={formData.is_active}
            onChange={handleInputChange}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Client is Active
          </label>
        </div>

        {/* QuickBooks Note */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Link className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">QuickBooks Integration</h4>
              <p className="text-sm text-gray-600">
                {formData.qbo_customer_id 
                  ? `Customer ID ${formData.qbo_customer_id} will be used for automatic syncing.`
                  : 'After creating the client, you\'ll have the option to connect their QuickBooks account for automatic financial data syncing and reporting.'}
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && !isSubmitting && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-4 border-t">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Client...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Client
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { useTRPC } from '@/trpc/client';
import { useMutation, useQuery } from '@tanstack/react-query';

export default function TestEmailPage() {
  const trpc = useTRPC();
  const [testResult, setTestResult] = useState<any>(null);

  // Query for config check
  const { data: configResult, isLoading: configLoading, refetch: checkConfig } = useQuery({
    ...trpc.testEmail.checkConfig.queryOptions(),
    enabled: false, // Don't run on mount
  });

  // Mutation for sending test email
  const sendTestMutation = useMutation({
    ...trpc.testEmail.sendTest.mutationOptions(),
    onSuccess: (data) => {
      setTestResult(data);
    },
    onError: (error: any) => {
      setTestResult({ success: false, error: error.message });
    },
  });

  const sendTestEmail = () => {
    setTestResult(null);
    sendTestMutation.mutate();
  };

  const loading = configLoading || sendTestMutation.isPending;

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-8">📧 Email Configuration Test</h1>
      
      <div className="space-y-6">
        {/* Check Config */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">1. Check SMTP Configuration</h2>
          <button
            onClick={() => checkConfig()}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Checking...' : 'Check Config'}
          </button>
          
          {configResult && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Configuration Status:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(configResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Send Test Email */}
        <div className="border rounded-lg p-6 bg-white shadow">
          <h2 className="text-xl font-semibold mb-4">2. Send Test Email</h2>
          <p className="text-gray-600 mb-4">
            This will send a test email to <strong>{process.env.NEXT_PUBLIC_SMTP_USER || 'your email'}</strong>
          </p>
          <button
            onClick={sendTestEmail}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Sending...' : 'Send Test Email'}
          </button>
          
          {testResult && (
            <div className={`mt-4 p-4 rounded ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">
                {testResult.success ? '✅ Success!' : '❌ Failed'}
              </h3>
              <pre className="text-sm overflow-auto whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="border rounded-lg p-6 bg-yellow-50 border-yellow-200">
          <h2 className="text-xl font-semibold mb-4">⚠️ Important Notes</h2>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>
              <strong>Gmail App Password:</strong> Your SMTP_PASS should be a 16-character app password from 
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                Google Account
              </a>
            </li>
            <li>
              <strong>Format:</strong> App password should have NO SPACES: <code className="bg-yellow-100 px-1">dvksirylmadajurb</code>
            </li>
            <li>
              <strong>Your current password:</strong> <code className="bg-yellow-100 px-1">dvks iryl mada jurb</code> (has spaces - might be the issue!)
            </li>
            <li>
              <strong>2-Step Verification:</strong> Must be enabled in Gmail to generate app passwords
            </li>
            <li>
              <strong>Check Railway logs:</strong> Run <code className="bg-yellow-100 px-1">railway logs</code> to see detailed error messages
            </li>
          </ul>
        </div>

        {/* Common Issues */}
        <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
          <h2 className="text-xl font-semibold mb-4">🔍 Common Issues</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold">Error: "Invalid login"</h3>
              <p className="text-gray-700">→ Using regular Gmail password instead of app password</p>
              <p className="text-gray-700">→ App password has spaces (remove them)</p>
            </div>
            <div>
              <h3 className="font-semibold">Error: "Connection timeout"</h3>
              <p className="text-gray-700">→ Wrong SMTP_HOST or SMTP_PORT</p>
              <p className="text-gray-700">→ Should be: smtp.gmail.com:587</p>
            </div>
            <div>
              <h3 className="font-semibold">Error: "Authentication failed"</h3>
              <p className="text-gray-700">→ 2-Step Verification not enabled</p>
              <p className="text-gray-700">→ App password not generated correctly</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

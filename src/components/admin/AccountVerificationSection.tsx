'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@payloadcms/ui';
import { Button, Banner } from '@payloadcms/ui';

interface VerificationStatus {
  status: 'pending' | 'document_verified' | 'physically_verified' | 'rejected';
  requested: boolean;
  requestedAt?: string;
  isVerified: boolean;
}

export const AccountVerificationSection: React.FC = () => {
  const { user } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.roles && !user.roles.includes('super-admin')) {
      fetchVerificationStatus();
    }
  }, [user]);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch('/api/tenants/request-verification');
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.verification);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    }
  };

  const requestVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tenants/request-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchVerificationStatus();
        alert('Verification request submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error requesting verification:', error);
      alert('Failed to request verification');
    } finally {
      setLoading(false);
    }
  };

  // Don't show for super admins
  if (!user || (user.roles && user.roles.includes('super-admin'))) {
    return null;
  }

  const getStatusDisplay = () => {
    if (!verificationStatus) return null;

    switch (verificationStatus.status) {
      case 'document_verified':
        return {
          title: '📄 Document Verified',
          description: 'Your documents have been verified. You can now list and sell products.',
          type: 'success' as const,
          canRequest: false,
        };
      case 'physically_verified':
        return {
          title: '✅ Physically Verified',
          description: 'Your business has been physically verified. You have full merchant capabilities.',
          type: 'success' as const,
          canRequest: false,
        };
      case 'rejected':
        return {
          title: '❌ Verification Rejected',
          description: 'Your verification request was rejected. Please contact support for more information.',
          type: 'error' as const,
          canRequest: true,
        };
      default:
        if (verificationStatus.requested) {
          return {
            title: '⏳ Verification Pending',
            description: `Verification request submitted ${verificationStatus.requestedAt ? new Date(verificationStatus.requestedAt).toLocaleDateString() : ''}. Our team will review your documents soon.`,
            type: 'info' as const,
            canRequest: false,
          };
        } else {
          return {
            title: '📋 Request Verification',
            description: 'Submit your business documents for verification to unlock selling capabilities.',
            type: 'info' as const,
            canRequest: true,
          };
        }
    }
  };

  const statusInfo = getStatusDisplay();
  if (!statusInfo) return null;

  return (
    <div style={{ marginTop: '24px' }}>
      <Banner type={statusInfo.type}>
        <div>
          <h3 style={{ margin: '0 0 8px 0' }}>
            {statusInfo.title}
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            {statusInfo.description}
          </p>

          {statusInfo.canRequest && (
            <Button
              onClick={requestVerification}
              disabled={loading}
              buttonStyle="primary"
              size="small"
            >
              {loading ? 'Submitting...' : 'Request Verification'}
            </Button>
          )}
        </div>
      </Banner>

      {verificationStatus && verificationStatus.status === 'pending' && verificationStatus.requested && (
        <div style={{ marginTop: '12px' }}>
          <Banner type="info">
            <div>
              <strong>Next Steps:</strong>
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>Our admin team will review your submitted documents</li>
                <li>You&apos;ll receive an update on your verification status</li>
                <li>Once verified, you&apos;ll be able to create and sell products</li>
              </ul>
            </div>
          </Banner>
        </div>
      )}
    </div>
  );
};

export default AccountVerificationSection;
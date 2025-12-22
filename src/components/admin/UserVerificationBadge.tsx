'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@payloadcms/ui';
import { Button, Pill } from '@payloadcms/ui';

interface VerificationStatus {
  status: 'pending' | 'document_verified' | 'physically_verified' | 'rejected';
  requested: boolean;
  requestedAt?: string;
  isVerified: boolean;
}

export const UserVerificationBadge: React.FC = () => {
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

  const getBadgeContent = () => {
    if (!verificationStatus) return null;

    switch (verificationStatus.status) {
      case 'document_verified':
        return (
          <Pill pillStyle="success">
            📄 Document Verified
          </Pill>
        );
      case 'physically_verified':
        return (
          <Pill pillStyle="success">
            ✅ Physically Verified
          </Pill>
        );
      case 'rejected':
        return (
          <Pill pillStyle="error">
            ❌ Rejected
          </Pill>
        );
      default:
        if (verificationStatus.requested) {
          return (
            <Pill pillStyle="warning">
              ⏳ Pending Review
            </Pill>
          );
        } else {
          return (
            <Button
              onClick={requestVerification}
              disabled={loading}
              size="small"
              buttonStyle="secondary"
            >
              {loading ? '⏳' : '📋'} Request Verification
            </Button>
          );
        }
    }
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '8px' }}>
      {getBadgeContent()}
    </div>
  );
};

export default UserVerificationBadge;
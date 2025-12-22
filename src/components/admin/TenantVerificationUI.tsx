'use client';

import React from 'react';
import { Button, Banner } from '@payloadcms/ui';

interface TenantVerificationUIProps {
  value?: string;
  onChange?: (value: string) => void;
  path?: string;
  data?: {
    id: string;
    verificationStatus?: string;
    verificationNotes?: string;
  };
  user?: {
    roles?: string[];
  };
}

export const TenantVerificationUI: React.FC<TenantVerificationUIProps> = ({ 
  data, 
  user 
}) => {
  // Only show for super admins
  if (!user?.roles?.includes('super-admin')) {
    return null;
  }

  const handleVerification = async (status: string) => {
    if (!data?.id) return;
    
    const notes = prompt('Add verification notes (optional):');
    
    try {
      const response = await fetch(`/api/tenants/${data.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationStatus: status,
          verificationNotes: notes || '',
          isVerified: status !== 'rejected',
          verifiedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert('Verification status updated successfully!');
        window.location.reload();
      } else {
        alert('Failed to update verification status');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error updating verification status');
    }
  };

  const currentStatus = data?.verificationStatus || 'pending';

  const getStatusBanner = () => {
    switch (currentStatus) {
      case 'document_verified':
        return { type: 'success' as const, text: 'DOCUMENT VERIFIED' };
      case 'physically_verified':
        return { type: 'success' as const, text: 'PHYSICALLY VERIFIED' };
      case 'rejected':
        return { type: 'error' as const, text: 'REJECTED' };
      default:
        return { type: 'info' as const, text: 'PENDING' };
    }
  };

  const statusBanner = getStatusBanner();

  return (
    <div style={{ margin: '20px 0' }}>
      <Banner type="info">
        <div>
          <h3 style={{ margin: '0 0 12px 0' }}>
            🔐 Super Admin Verification Actions
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>Current Status: </strong>
            <Banner type={statusBanner.type}>
              {statusBanner.text}
            </Banner>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' }}>
            {currentStatus === 'pending' && (
              <>
                <Button 
                  buttonStyle="primary"
                  onClick={() => handleVerification('document_verified')}
                >
                  ✅ Verify Documents
                </Button>
                <Button 
                  buttonStyle="secondary"
                  onClick={() => handleVerification('rejected')}
                >
                  ❌ Reject
                </Button>
              </>
            )}

            {currentStatus === 'document_verified' && (
              <>
                <Button 
                  buttonStyle="primary"
                  onClick={() => handleVerification('physically_verified')}
                >
                  🏠 Mark Physically Verified
                </Button>
                <Button 
                  buttonStyle="secondary"
                  onClick={() => handleVerification('rejected')}
                >
                  ❌ Reject
                </Button>
              </>
            )}

            {(currentStatus === 'physically_verified' || currentStatus === 'rejected') && (
              <>
                <Button 
                  buttonStyle="secondary"
                  onClick={() => handleVerification('document_verified')}
                >
                  📄 Reset to Document Verified
                </Button>
                <Button 
                  buttonStyle="secondary"
                  onClick={() => handleVerification('pending')}
                >
                  🔄 Reset to Pending
                </Button>
              </>
            )}
          </div>

          {data?.verificationNotes && (
            <Banner type="default">
              <div>
                <strong>Admin Notes:</strong>
                <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
                  {data.verificationNotes}
                </div>
              </div>
            </Banner>
          )}
        </div>
      </Banner>
    </div>
  );
};

export default TenantVerificationUI;

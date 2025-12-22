import React from 'react';
import { useAuth } from '@payloadcms/ui';
import { Button } from '@payloadcms/ui';
import { Tenant } from '@/payload-types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isSuperAdmin = (user: any) => {
  return user?.roles?.includes('super-admin');
};

export const TenantVerificationButtons: React.FC<{ 
  tenant: Tenant;
  onVerify: (status: string, notes?: string) => void;
}> = ({ tenant, onVerify }) => {
  const { user } = useAuth();

  // Only show for super admins
  if (!isSuperAdmin(user)) {
    return null;
  }

  const handleDocumentVerification = () => {
    const notes = prompt('Add verification notes (optional):');
    onVerify('document_verified', notes || undefined);
  };

  const handlePhysicalVerification = () => {
    const notes = prompt('Add verification notes (optional):');
    onVerify('physically_verified', notes || undefined);
  };

  const handleReject = () => {
    const notes = prompt('Reason for rejection:');
    if (notes) {
      onVerify('rejected', notes);
    }
  };

  const currentStatus = tenant?.verificationStatus || 'pending';

  return (
    <div style={{ 
      margin: '20px 0', 
      padding: '15px', 
      border: '1px solid #e0e0e0', 
      borderRadius: '6px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>
        🔐 Super Admin Verification Actions
      </h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Current Status:</strong> 
        <span style={{ 
          marginLeft: '8px',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: currentStatus === 'pending' ? '#fff3cd' : 
                          currentStatus === 'document_verified' ? '#d1ecf1' :
                          currentStatus === 'physically_verified' ? '#d4edda' :
                          currentStatus === 'rejected' ? '#f8d7da' : '#e2e3e5',
          color: currentStatus === 'pending' ? '#856404' : 
                 currentStatus === 'document_verified' ? '#0c5460' :
                 currentStatus === 'physically_verified' ? '#155724' :
                 currentStatus === 'rejected' ? '#721c24' : '#495057'
        }}>
          {currentStatus.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {currentStatus === 'pending' && (
          <>
            <Button
              onClick={handleDocumentVerification}
              buttonStyle="primary"
              size="small"
            >
              ✅ Verify Documents
            </Button>
            <Button
              onClick={handleReject}
              buttonStyle="secondary"
              size="small"
            >
              ❌ Reject
            </Button>
          </>
        )}

        {currentStatus === 'document_verified' && (
          <>
            <Button
              onClick={handlePhysicalVerification}
              buttonStyle="primary"
              size="small"
            >
              🏠 Mark Physically Verified
            </Button>
            <Button
              onClick={handleReject}
              buttonStyle="secondary"
              size="small"
            >
              ❌ Reject
            </Button>
          </>
        )}

        {(currentStatus === 'physically_verified' || currentStatus === 'rejected') && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Button
              onClick={handleDocumentVerification}
              buttonStyle="secondary"
              size="small"
            >
              📄 Reset to Document Verified
            </Button>
            <Button
              onClick={() => onVerify('pending')}
              buttonStyle="secondary"
              size="small"
            >
              🔄 Reset to Pending
            </Button>
          </div>
        )}
      </div>

      {tenant?.verificationNotes && (
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: '#fff', 
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>Admin Notes:</strong>
          <div style={{ marginTop: '5px', fontStyle: 'italic' }}>
            {tenant.verificationNotes}
          </div>
        </div>
      )}
    </div>
  );
};

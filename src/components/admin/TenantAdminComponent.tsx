import React from 'react';
import { TenantVerificationButtons } from './TenantVerificationButtons';
import { Tenant, User } from '@/payload-types';

export const TenantAdminComponent: React.FC<{ 
  data: Tenant; 
  user: User;
}> = ({ data }) => {
  
  const handleVerification = async (status: string, notes?: string) => {
    try {
      // Make API call to update tenant verification
      const response = await fetch(`/api/tenants/${data.id}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          verificationStatus: status,
          verificationNotes: notes,
          isVerified: status !== 'rejected',
          verifiedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        // Refresh the page to show updated status
        window.location.reload();
      } else {
        alert('Failed to update verification status');
      }
    } catch (error) {
      console.error('Error updating verification:', error);
      alert('Error updating verification status');
    }
  };

  return (
    <TenantVerificationButtons 
      tenant={data}
      onVerify={handleVerification}
    />
  );
};

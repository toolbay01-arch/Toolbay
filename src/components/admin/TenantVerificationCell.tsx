'use client';

import React from 'react';
import { Button, Pill } from '@payloadcms/ui';

interface TenantVerificationCellProps {
  cellData?: string;
  rowData?: {
    id: string;
    verificationRequested?: boolean;
    [key: string]: unknown;
  };
}

const TenantVerificationCell: React.FC<TenantVerificationCellProps> = ({ cellData, rowData }) => {
  const status = cellData || 'pending';
  const tenantId = rowData?.id;
  
  const handleVerifyClick = () => {
    if (tenantId) {
      // Navigate to the tenant edit page where verification UI is available
      window.location.href = `/admin/collections/tenants/${tenantId}`;
    }
  };

  const getStatusPill = () => {
    switch (status) {
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
        return (
          <Pill pillStyle="warning">
            ⏳ Pending
          </Pill>
        );
    }
  };

  const showVerifyButton = status === 'pending' || rowData?.verificationRequested;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {getStatusPill()}
      {showVerifyButton && (
        <Button
          onClick={handleVerifyClick}
          size="small"
          buttonStyle="secondary"
        >
          Verify
        </Button>
      )}
    </div>
  );
};

export default TenantVerificationCell;
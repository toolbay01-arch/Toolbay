'use client';

import React from 'react';
import { Pill } from '@payloadcms/ui';

interface VerificationRequestedCellProps {
  cellData?: boolean;
  rowData?: {
    verificationRequestedAt?: string;
    [key: string]: unknown;
  };
}

const VerificationRequestedCell: React.FC<VerificationRequestedCellProps> = ({ cellData, rowData }) => {
  const isRequested = cellData || false;
  const requestedAt = rowData?.verificationRequestedAt;

  if (!isRequested) {
    return <span style={{ color: '#666' }}>No</span>;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <Pill pillStyle="warning">
        ✅ Requested
      </Pill>
      {requestedAt && (
        <span style={{ fontSize: '12px', color: '#666' }}>
          {new Date(requestedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

export default VerificationRequestedCell;
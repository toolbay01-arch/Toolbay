'use client';

import React from 'react';
import { useAuth } from '@payloadcms/ui';
import { Banner } from '@payloadcms/ui';

export const TenantVerificationAlert: React.FC = () => {
  const { user } = useAuth();

  // Only show for super admins
  if (!user?.roles?.includes('super-admin')) {
    return null;
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <Banner type="info">
        <div>
          <h3 style={{ margin: '0 0 8px 0' }}>
            🔍 Verification Management Dashboard
          </h3>
          <p style={{ margin: '0 0 12px 0' }}>
            Review tenant verification requests and manage verification status. 
            Look for tenants with <strong>verificationRequested: true</strong> that need your attention.
          </p>
          <div>
            <p style={{ margin: '0', fontSize: '13px' }}>
              <strong>Status Legend:</strong>{' '}
              <span>⚠️ Pending</span> | {' '}
              <span>📄 Document Verified</span> | {' '}
              <span>✅ Physically Verified</span> | {' '}
              <span>❌ Rejected</span>
            </p>
          </div>
        </div>
      </Banner>
    </div>
  );
};

export default TenantVerificationAlert;
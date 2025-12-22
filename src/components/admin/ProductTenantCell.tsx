'use client';

import React from 'react';
import { useAuth } from '@payloadcms/ui';
import type { Tenant } from '@/payload-types';

interface ProductTenantCellProps {
  cellData: Tenant | string | null;
  rowData: Record<string, unknown>;
}

export const ProductTenantCell: React.FC<ProductTenantCellProps> = ({ cellData }) => {
  const { user } = useAuth();
  
  // Only show for super admins
  if (!user?.roles?.includes('super-admin')) {
    return null;
  }

  if (!cellData) {
    return <span style={{ color: '#999' }}>No Tenant</span>;
  }

  return (
    <span>
      {typeof cellData === 'object' ? cellData.name : cellData}
    </span>
  );
};

export default ProductTenantCell;

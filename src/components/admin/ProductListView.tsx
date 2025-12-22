import React, { useEffect } from 'react';
import { DefaultListView } from '@payloadcms/ui';
import { useAuth } from '@payloadcms/ui';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ProductListView: React.FC<any> = (props) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.includes('super-admin');

  useEffect(() => {
    // Hide tenant column for non-super-admin users
    if (!isSuperAdmin) {
      const style = document.createElement('style');
      style.textContent = `
        th[data-column="tenant"],
        td[data-column="tenant"] {
          display: none !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [isSuperAdmin]);

  return <DefaultListView {...props} />;
};

export default ProductListView;

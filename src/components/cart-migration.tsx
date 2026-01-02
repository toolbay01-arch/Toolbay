/**
 * Cart Migration Component
 * Automatically migrates cart data from localStorage to cross-domain cookies
 */

'use client';

import { useEffect } from 'react';
import { migrateCartStorage } from '@/lib/migrate-cart-storage';

export function CartMigration() {
  useEffect(() => {
    // Run migration on mount
    migrateCartStorage();
  }, []);

  return null; // This component doesn't render anything
}

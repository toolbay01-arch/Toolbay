/**
 * Cart Storage Migration
 * Migrates cart data from localStorage to cross-domain cookies
 */

import { setCrossDomainItem, getCrossDomainItem } from './cross-domain-storage';

export function migrateCartStorage() {
  if (typeof window === 'undefined') return;

  try {
    // Check if already migrated
    const alreadyMigrated = getCrossDomainItem('cart-migrated');
    if (alreadyMigrated === 'true') {
      return;
    }

    // Try to get old cart data from localStorage
    const oldCartData = localStorage.getItem('toolbay-cart');
    
    if (oldCartData) {
      console.log('[Cart Migration] Migrating cart data from localStorage to cookies...');
      
      // Set in cross-domain storage (cookies)
      setCrossDomainItem('toolbay-cart', oldCartData);
      
      // Mark as migrated
      setCrossDomainItem('cart-migrated', 'true');
      
      console.log('[Cart Migration] Migration complete!');
      
      // Optionally remove from localStorage after successful migration
      // Commented out to keep as backup for now
      // localStorage.removeItem('toolbay-cart');
    } else {
      // No old data, just mark as migrated
      setCrossDomainItem('cart-migrated', 'true');
    }
  } catch (error) {
    console.error('[Cart Migration] Failed to migrate cart data:', error);
  }
}

# MoMo Code Specification

## Overview
This document clarifies the MoMo Code format used in the payment system.

## Field Type
- **Type**: `number` (integer)
- **Unique**: Yes (each tenant must have a unique code)
- **Required**: Yes (when `paymentMethod === 'momo_pay'`)

## Format
- **Valid Examples**: `828822`, `123456`, `999001`, `555777`
- **Typical Length**: 6 digits
- **Invalid**: Text strings, decimals, or alphanumeric codes

## Dial Code Format
The complete MTN Mobile Money dial code follows this structure:

```
*182*8*1*{MOMO_CODE}*{AMOUNT}#
```

### Example:
For a purchase of 25,000 RWF from a tenant with MoMo Code `828822`:
```
*182*8*1*828822*25000#
```

### Breakdown:
- `*182*8*1*` - MTN MoMo prefix (fixed)
- `828822` - Tenant's unique MoMo Code (integer)
- `25000` - Total amount to be paid
- `#` - Dial code terminator

## Database Schema

### Tenants Collection
```typescript
{
  momoCode: number;           // Unique integer identifier
  momoAccountName?: string;   // Business name for display
  momoPayCode?: string;       // Optional MTN merchant reference
  paymentMethod: 'momo_pay' | 'bank_transfer' | 'cash_on_delivery';
  totalRevenue: number;       // Auto-calculated
}
```

## Implementation

### Current Status
✅ **leo** tenant:
- MoMo Code: `828822`
- Account Name: "LEO"
- Status: Ready for payments

⚠️ **kylian** tenant:
- Needs unique MoMo Code configured
- Must be different from `828822`

## Migration Notes
- Old field `momoPayCode` (text) was migrated to `momoCode` (number)
- Existing numeric codes were preserved
- Tenants with duplicate codes need manual assignment of unique values

## Related Files
- `/src/collections/Tenants.ts` - Field definition (line 172-182)
- `/src/modules/checkout/server/procedures.ts` - Dial code generation (line 104)
- `/TENANT_MOMO_GUIDE.md` - User documentation

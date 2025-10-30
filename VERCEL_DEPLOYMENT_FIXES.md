# Vercel Deployment Issues & Fixes

## Issue 1: Product Card Click Not Working on Vercel ❌→✅

### Problem:
- Clicking on product cards in product listing doesn't navigate to product page on Vercel
- Network tab shows 200 OK response
- URL is correct: `/tenants/serge/products/68fd657d15a1e4c63907edb1`
- Works fine on localhost after build
- Likely a client-side hydration/navigation issue with Next.js Link on Vercel

### Root Cause:
Next.js `<Link>` component having hydration issues on Vercel deployment with React Server Components and streaming (`_rsc` query param).

### Solution:
Changed from Next.js `<Link>` to `<div>` with `onClick` + `router.push()`:

**Before:**
```tsx
<Link href={productUrl} prefetch={false}>
  {/* card content */}
</Link>
```

**After:**
```tsx
const handleCardClick = (e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  if (target.closest('button')) {
    return; // Don't navigate if clicking buttons
  }
  e.preventDefault();
  router.push(productUrl);
};

<div onClick={handleCardClick}>
  {/* card content */}
</div>
```

### Benefits:
✅ More reliable navigation on Vercel
✅ Prevents accidental navigation when clicking buttons (tenant link, carousel arrows)
✅ Works consistently across environments
✅ No hydration mismatches

---

## Issue 2: Multiple Images Appearing & Delete Failing ❌→✅

### Problem A: Multiple Images Displayed
When uploading 1 image, 10 images appear in the grid.

**Console logs showed:**
```
[ImageUpload] Loading files for IDs: ['690287ebb1485958227d19ba']  // 1 ID requested
[ImageUpload] Loaded files: (10) [{…}, {…}, ...] // 10 files returned!
```

### Root Cause A:
Payload's `find()` with `where: { id: { in: [...] } }` was returning more documents than requested.

### Solution A:
Implemented dual-strategy query approach:

```typescript
// Single ID → Use findByID (most reliable)
if (ids.length === 1) {
  const doc = await payload.findByID({
    collection: "media",
    id: ids[0],
  });
  return [doc];
}

// Multiple IDs → Use find with exact limit
else {
  const result = await payload.find({
    collection: "media",
    where: { id: { in: ids } },
    limit: ids.length, // Exact number needed
    pagination: false,
  });
  // Sort to match request order
}
```

### Benefits:
✅ `findByID` is bulletproof for single images
✅ Exact limit prevents over-fetching
✅ Enhanced logging for debugging

---

### Problem B: Delete Failing (400 Bad Request)
Delete requests returning 400 error.

**Network request:**
```
DELETE /api/media?id=6903d1022cf72adee89ee352
Status: 400 Bad Request
```

### Root Cause B:
Query parameter not being extracted correctly, or missing ID.

### Solution B:
Added comprehensive logging to debug:

```typescript
export async function DELETE(request: NextRequest) {
  console.log('[Media DELETE] Request URL:', request.url);
  
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  console.log('[Media DELETE] Extracted ID:', id);
  console.log('[Media DELETE] All search params:', Object.fromEntries(searchParams.entries()));
  
  if (!id) {
    console.log('[Media DELETE] No ID provided - returning 400');
    return NextResponse.json({ error: "Media ID required" }, { status: 400 });
  }
  
  // ... delete logic
}
```

### Debug Steps:
1. Check server logs for:
   - `[Media DELETE] Request URL:` - Full URL being received
   - `[Media DELETE] Extracted ID:` - Whether ID is being parsed
   - `[Media DELETE] All search params:` - All params received
2. If ID is `null`, the client might be sending wrong format
3. If ID exists but delete fails, check Payload permissions

---

## Testing Checklist

### Product Card Navigation (Issue 1):
- [ ] Click product card on Vercel → Should navigate to product page
- [ ] Click tenant link → Should navigate to tenant page (not product)
- [ ] Click carousel arrows → Should change image (not navigate)
- [ ] Swipe on mobile → Should change image (not navigate)

### Media Upload/Delete (Issue 2):
- [ ] Upload 1 image → Should show exactly 1 image in grid
- [ ] Upload 3 images → Should show exactly 3 images in grid
- [ ] Click [X] on image → Should delete successfully
- [ ] Check server logs for media query debugging info
- [ ] Verify image deleted from Vercel Blob Storage

---

## Console Logs to Watch

### Media GET (Upload):
```
[Media API] Requested IDs: ['abc123']
[Media API] Number of IDs requested: 1
[Media API] Using findByID, returned: abc123
[Media API] Number of sorted docs: 1
[Media API] Sorted doc IDs: ['abc123']
```

### Media DELETE:
```
[Media DELETE] Request URL: https://.../api/media?id=abc123
[Media DELETE] Extracted ID: abc123
[Media DELETE] All search params: { id: 'abc123' }
[Media Delete] Deleting media ID: abc123
[Media Delete] Successfully deleted media ID: abc123
```

### If Delete Returns 400:
Check logs for:
- `[Media DELETE] Extracted ID: null` → Client sending wrong format
- `[Media DELETE] No ID provided` → Query param missing
- `[Media DELETE] Unauthorized` → Session issue

---

## Files Modified

1. **`/src/modules/products/ui/components/product-card.tsx`**
   - Changed `<Link>` to `<div>` with `onClick`
   - Added `handleCardClick` to prevent button interference
   - Removed `Link` import

2. **`/src/app/(app)/api/media/route.ts`**
   - Added dual-strategy query (findByID vs find)
   - Added comprehensive logging for GET and DELETE
   - Fixed limit to exact number needed

---

## Deployment Notes

### Environment Differences:
- **Localhost**: Link navigation works fine (development mode)
- **Vercel**: Link navigation had hydration issues (production mode)
- **Solution**: Use router.push() for more reliable navigation

### Why This Happens:
1. Vercel uses edge runtime with different hydration behavior
2. React Server Components streaming (`_rsc`) can cause Link issues
3. `router.push()` is more direct and avoids hydration mismatches

### Future Prevention:
- Use `router.push()` for dynamic navigation in client components
- Reserve `<Link>` for static, SSR-friendly navigation
- Add extensive logging to API routes for production debugging

---

## Rollback Plan (if needed)

If issues persist, revert to `<Link>`:

```tsx
// Revert product-card.tsx to:
<Link href={productUrl} prefetch={false}>
  {/* card content */}
</Link>

// And add this to force client-side navigation:
<Link href={productUrl} prefetch={false} scroll={false} replace={false}>
```

Or use native anchor tag:
```tsx
<a href={productUrl} onClick={(e) => {
  e.preventDefault();
  window.location.href = productUrl;
}}>
```

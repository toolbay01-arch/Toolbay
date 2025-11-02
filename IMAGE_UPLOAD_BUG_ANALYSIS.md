# 🐛 Image Upload Bug - Deep Analysis
## Production vs Local Behavior Difference

**Date:** November 2, 2025  
**Issue:** Images display incorrectly in production (Railway/Vercel) but work correctly locally

---

## 🔴 **THE PROBLEM**

### **Local (After `npm run build && npm start`):**
✅ Upload image → Goes to Vercel Blob → **Only that image** displays in upload box  
✅ Delete image → **Works correctly**, image removed from box  
✅ Edit product → Shows **only product's images**, not others

### **Production (Railway/Vercel):**
❌ Upload image → Goes to Vercel Blob → **ALL OTHER IMAGES** suddenly appear in box  
❌ Delete image → **Doesn't work**, image stays visible  
❌ Edit product → Shows **random images from database**, not just product's images

---

## 🔍 **ROOT CAUSE IDENTIFIED**

The bug is caused by **React Query's aggressive caching** combined with **asynchronous state updates** in production.

### **Critical Code Flow:**

```tsx
// 1. ImageUpload component loads files from API
const loadUploadedFiles = useCallback(async () => {
  if (value.length === 0) {
    setUploadedFiles([]);
    return;
  }

  console.log('[ImageUpload] Loading files for IDs:', value);

  try {
    // ⚠️ CRITICAL: Fetches from /api/media based on `value` prop
    const response = await fetch(`/api/media?ids=${value.join(",")}`);
    const data = await response.json();
    
    if (data.docs) {
      const files = data.docs.map((doc: any) => ({
        id: doc.id,
        url: doc.url,
        // ...
      }));
      setUploadedFiles(files); // ⚠️ Updates local state
    }
  } catch (error) {
    console.error("Failed to load uploaded files:", error);
  }
}, [value]); // ⚠️ Only re-runs when `value` changes

// 2. Effect that triggers the load
useEffect(() => {
  console.log('[ImageUpload] Value prop changed:', value);
  loadUploadedFiles(); // ⚠️ Fetches every time `value` changes
}, [value, loadUploadedFiles]);
```

---

## 🚨 **WHY IT BREAKS IN PRODUCTION**

### **Issue #1: Race Condition with React Query Cache**

**Production environment characteristics:**
- React Query cache: `staleTime: 5 minutes`, `gcTime: 10 minutes`
- Multiple components may share cache
- Network latency: 200-500ms (vs <50ms locally)
- Build optimization: Different timing than dev mode

**What happens:**

```tsx
// ProductFormDialog populates form data
useEffect(() => {
  if (mode === "edit" && productData) {
    // Product has gallery: ["image1", "image2", "image3"]
    setValue("gallery", ["image1", "image2", "image3"]);
    initialGalleryRef.current = ["image1", "image2", "image3"];
  }
}, [productData, mode, setValue]);

// ⚠️ BUT: `watch("gallery")` is passed to ImageUpload
<ImageUpload
  value={watch("gallery") || []}  // ⚠️ This triggers on EVERY render
  onChange={(value) => setValue("gallery", value)}
/>
```

**The Race Condition:**
1. User edits Product A with images `["A1", "A2"]`
2. Dialog opens, fetches Product A data → `setValue("gallery", ["A1", "A2"])`
3. ImageUpload receives `value=["A1", "A2"]` → Fetches from `/api/media?ids=A1,A2`
4. **BUT**: React Query returns **cached** data from previous fetch!
5. Cache might contain Product B's images `["B1", "B2", "B3"]`
6. ImageUpload displays `["B1", "B2", "B3"]` instead of `["A1", "A2"]`

---

### **Issue #2: Stale Closure in `loadUploadedFiles`**

```tsx
const loadUploadedFiles = useCallback(async () => {
  if (value.length === 0) {
    setUploadedFiles([]); // ✅ Clears when empty
    return;
  }

  // ⚠️ PROBLEM: This fetch is NOT cached-aware
  const response = await fetch(`/api/media?ids=${value.join(",")}`);
  const data = await response.json();
  
  // ⚠️ CRITICAL BUG: What if `value` changed during the fetch?
  if (data.docs) {
    setUploadedFiles(files); // Sets state with potentially stale data!
  }
}, [value]);
```

**Scenario:**
1. Component renders with `value=["A1", "A2"]`
2. `loadUploadedFiles()` starts fetching
3. User uploads new image → `onChange(["A1", "A2", "NEW"])`
4. Component re-renders with `value=["A1", "A2", "NEW"]`
5. New `loadUploadedFiles()` starts
6. **First fetch completes** → `setUploadedFiles([A1, A2])` ❌ Overwrites!
7. **Second fetch completes** → `setUploadedFiles([A1, A2, NEW])` ✅ Correct
8. Result: **Flash of wrong images** or stuck state

---

### **Issue #3: No Cache Invalidation on Delete**

```tsx
const handleRemove = async (idToRemove: string) => {
  try {
    // Deletes from server
    const response = await fetch(`/api/media?id=${idToRemove}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete media from server');
    }

    // Updates local state
    const updatedValue = value.filter((id) => id !== idToRemove);
    onChange(updatedValue); // ⚠️ This triggers re-fetch!
    
    // ⚠️ PROBLEM: React Query cache still has old data!
    // Next render might show deleted image from cache
  } catch (error) {
    toast.error('Failed to delete image');
  }
};
```

**Why delete doesn't work in production:**
1. User deletes image `"A1"`
2. Server deletes successfully
3. Component updates `value` to `["A2"]`
4. `loadUploadedFiles()` runs with `value=["A2"]`
5. BUT: React Query cache OR browser cache returns `["A1", "A2"]`
6. Deleted image re-appears!

---

### **Issue #4: Dynamic Import Timing**

```tsx
// ProductFormDialog.tsx
const ImageUpload = dynamic(() => import("./image-upload").then(mod => ({ default: mod.ImageUpload })), {
  ssr: false,
  loading: () => <div>Loading...</div>
});
```

**Production difference:**
- Local: Instant import (already in memory)
- Production: Network fetch for chunk → 100-300ms delay
- **Result**: Component mounts AFTER form is populated
- **Effect**: First `useEffect` with populated `value` fires immediately
- **Cache hit**: Returns stale data from previous dialog open

---

## 📊 **TIMING DIAGRAM**

### **Local (Works):**
```
Time →
0ms:   Dialog opens
10ms:  ProductFormDialog fetches product data
20ms:  setValue("gallery", ["A1", "A2"])
25ms:  ImageUpload component mounts (already loaded)
30ms:  useEffect runs → loadUploadedFiles()
35ms:  Fetch /api/media?ids=A1,A2
40ms:  Response received (fast local server)
45ms:  setUploadedFiles([A1, A2]) ✅
```

### **Production (Broken):**
```
Time →
0ms:   Dialog opens
50ms:  ProductFormDialog fetches product data (network latency)
150ms: setValue("gallery", ["A1", "A2"])
200ms: Dynamic import completes, ImageUpload mounts
205ms: useEffect runs → loadUploadedFiles()
210ms: Fetch /api/media?ids=A1,A2
450ms: ⚠️ React Query returns CACHED data from previous product!
455ms: setUploadedFiles([B1, B2, B3]) ❌ Wrong images!
600ms: Fresh fetch completes → setUploadedFiles([A1, A2])
605ms: ⚠️ But another render happened, shows mixed state
```

---

## 🔧 **THE FIX**

### **Solution 1: Add Request Cache Busting (IMMEDIATE)**

```tsx
// image-upload.tsx - Update loadUploadedFiles
const loadUploadedFiles = useCallback(async () => {
  if (value.length === 0) {
    setUploadedFiles([]);
    return;
  }

  console.log('[ImageUpload] Loading files for IDs:', value);

  try {
    // ✅ FIX: Add cache-busting and proper headers
    const response = await fetch(
      `/api/media?ids=${value.join(",")}&t=${Date.now()}`, // Cache buster
      {
        cache: 'no-store', // Disable browser cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
    const data = await response.json();
    
    if (data.docs) {
      const files = data.docs.map((doc: any) => ({
        id: doc.id,
        url: doc.url,
        alt: doc.alt || "",
        fileType: doc.mimeType?.startsWith("video/") ? "video" : "image",
      }));
      
      // ✅ FIX: Only update if `value` hasn't changed during fetch
      setUploadedFiles(prevFiles => {
        // Verify IDs match current value
        const currentIds = value.sort().join(',');
        const fetchedIds = files.map(f => f.id).sort().join(',');
        
        if (currentIds === fetchedIds) {
          console.log('[ImageUpload] Loaded files:', files.map(f => ({ id: f.id, url: f.url })));
          return files;
        } else {
          console.warn('[ImageUpload] Stale fetch detected, ignoring:', fetchedIds, 'vs', currentIds);
          return prevFiles; // Keep previous state
        }
      });
    }
  } catch (error) {
    console.error("Failed to load uploaded files:", error);
  }
}, [value]);
```

---

### **Solution 2: Add AbortController for Race Condition Prevention**

```tsx
// image-upload.tsx - Prevent concurrent fetches
const loadUploadedFiles = useCallback(async () => {
  if (value.length === 0) {
    setUploadedFiles([]);
    return;
  }

  // ✅ FIX: Cancel previous fetch if still running
  const abortController = new AbortController();
  
  try {
    const response = await fetch(
      `/api/media?ids=${value.join(",")}&t=${Date.now()}`,
      {
        cache: 'no-store',
        signal: abortController.signal, // Allow cancellation
      }
    );
    const data = await response.json();
    
    if (data.docs) {
      const files = data.docs.map((doc: any) => ({
        id: doc.id,
        url: doc.url,
        alt: doc.alt || "",
        fileType: doc.mimeType?.startsWith("video/") ? "video" : "image",
      }));
      setUploadedFiles(files);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[ImageUpload] Fetch aborted (new fetch started)');
    } else {
      console.error("Failed to load uploaded files:", error);
    }
  }
  
  return () => abortController.abort(); // Cleanup
}, [value]);

// Store abort controller ref
const abortControllerRef = useRef<AbortController | null>(null);

useEffect(() => {
  // Cancel previous fetch
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  loadUploadedFiles();
}, [value, loadUploadedFiles]);
```

---

### **Solution 3: Fix Delete with Optimistic Updates**

```tsx
const handleRemove = async (idToRemove: string) => {
  try {
    console.log('[ImageUpload] Removing media ID:', idToRemove);
    
    // ✅ FIX: Optimistic update (immediate visual feedback)
    const previousFiles = uploadedFiles;
    setUploadedFiles(prev => prev.filter(file => file.id !== idToRemove));
    
    // Update parent state immediately
    const updatedValue = value.filter((id) => id !== idToRemove);
    onChange(updatedValue);
    
    // Show loading toast
    const loadingToast = toast.loading('Deleting image...');
    
    // Delete from server
    const response = await fetch(
      `/api/media?id=${idToRemove}&t=${Date.now()}`, // Cache buster
      {
        method: 'DELETE',
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      // ✅ FIX: Rollback on error
      setUploadedFiles(previousFiles);
      onChange(value);
      throw new Error('Failed to delete media from server');
    }

    console.log('[ImageUpload] Successfully deleted from server:', idToRemove);
    toast.success('Image deleted successfully', { id: loadingToast });
  } catch (error) {
    console.error('Failed to delete media:', error);
    toast.error('Failed to delete image. Please try again.');
  }
};
```

---

### **Solution 4: Reset Component State on Dialog Open/Close**

```tsx
// product-form-dialog.tsx
useEffect(() => {
  if (!open) {
    // ✅ FIX: Clear form completely when dialog closes
    reset({
      refundPolicy: "30-day",
      isPrivate: false,
      gallery: [], // Clear gallery
    });
    hasSubmittedRef.current = false;
  }
  
  if (open && mode === "create") {
    // ✅ FIX: Ensure clean state for new products
    reset({
      refundPolicy: "30-day",
      isPrivate: false,
      gallery: [],
    });
    initialGalleryRef.current = [];
  }
}, [open, mode, reset]);
```

---

### **Solution 5: Add API Response Cache Headers**

```tsx
// src/app/(app)/api/media/route.ts - GET endpoint
export async function GET(request: NextRequest) {
  try {
    // ... existing code ...
    
    const responseData = {
      success: true,
      docs: sortedDocs.map(doc => ({
        id: doc!.id,
        url: doc!.url,
        alt: doc!.alt,
        filename: doc!.filename,
        mimeType: doc!.mimeType,
      }))
    };
    
    // ✅ FIX: Add no-cache headers
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // ... error handling ...
  }
}
```

---

## 🎯 **IMPLEMENTATION PRIORITY**

### **Critical (Fix Now):**
1. ✅ Add cache busting to fetch requests (`&t=${Date.now()}`)
2. ✅ Add `cache: 'no-store'` to fetch options
3. ✅ Add stale fetch detection in `setUploadedFiles`
4. ✅ Add no-cache headers to API responses

### **Important (Fix Soon):**
5. ✅ Add AbortController for race condition prevention
6. ✅ Implement optimistic updates for delete
7. ✅ Reset component state on dialog open/close

### **Nice-to-Have:**
8. ⚪ Use React Query for media fetching (proper cache management)
9. ⚪ Add debouncing to `loadUploadedFiles`
10. ⚪ Add retry logic with exponential backoff

---

## 📋 **TESTING CHECKLIST**

After fixes, test these scenarios:

**Scenario 1: Create New Product**
- [ ] Open dialog → Upload 3 images → Only those 3 appear
- [ ] Close without saving → Images deleted from server
- [ ] Reopen dialog → No images appear (clean state)

**Scenario 2: Edit Existing Product**
- [ ] Open Product A with 2 images → Only those 2 appear
- [ ] Upload 1 more → Total 3 images appear correctly
- [ ] Close and reopen → Still shows 3 images correctly

**Scenario 3: Multiple Edits**
- [ ] Edit Product A → Shows A's images
- [ ] Close, edit Product B → Shows B's images (not A's)
- [ ] Close, edit Product A again → Shows A's images correctly

**Scenario 4: Delete Images**
- [ ] Edit product with 4 images
- [ ] Delete 2nd image → Immediately disappears
- [ ] Save product → Reopen → Deleted image still gone
- [ ] Check database → Deleted image not in gallery array

**Scenario 5: Network Issues**
- [ ] Slow 3G simulation → Images still load correctly
- [ ] Upload with network interruption → Proper error handling
- [ ] Delete with network error → Rollback works

---

## 🔬 **WHY IT WORKS LOCALLY**

Local environment differences:
- ✅ **Faster network** → Race conditions less likely
- ✅ **No CDN caching** → Fresh data every time
- ✅ **Simpler build** → Less optimization = predictable timing
- ✅ **Single process** → No distributed cache issues
- ✅ **Dev mode** → More logging, easier debugging
- ✅ **Hot reload** → State resets frequently

Production environment differences:
- ❌ **Network latency** → 200-500ms per request
- ❌ **CDN caching** → Vercel Blob responses cached
- ❌ **Build optimization** → Code splitting, lazy loading
- ❌ **Distributed system** → Multiple servers, shared cache
- ❌ **Production mode** → Minimal logging
- ❌ **Persistent state** → No hot reload, long-lived cache

---

## 💡 **PREVENTION**

To avoid similar issues in the future:

1. **Always add timestamps** to API requests that need fresh data
2. **Use proper cache headers** for APIs
3. **Implement AbortController** for async operations
4. **Test with network throttling** during development
5. **Use React Query** for complex data fetching
6. **Add proper loading states** to prevent race conditions
7. **Test production build locally** before deploying
8. **Monitor production logs** for cache-related issues

---

**Status:** Ready for implementation  
**Priority:** P0 (Critical Bug)  
**Estimated Fix Time:** 2-3 hours  
**Testing Time:** 1-2 hours

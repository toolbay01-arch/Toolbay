# Image Upload Feature Documentation

## Overview
The product management system now includes a comprehensive drag-and-drop image upload feature that allows tenants to upload multiple product images and videos directly from the Next.js storefront.

## Features

### 1. Drag & Drop Upload
- **Visual Interface**: Modern drag-and-drop zone with clear visual feedback
- **Multiple Files**: Upload multiple images and videos at once
- **File Validation**: 
  - Accepts images (all standard formats: JPG, PNG, WebP, etc.)
  - Accepts videos (MP4, MOV, etc.)
  - Maximum video size: 60MB (suitable for 1-minute videos)
  - Maximum 24 files total

### 2. User Experience
- **Helper Text**: "You can add up to 24 photos and a 1-minute video. Buyers want to see all details and angles."
- **Upload Methods**:
  - Drag and drop files into the upload zone
  - Click "Upload from computer" button
- **Progress Indicators**: Shows upload status and success/error messages
- **File Counter**: Displays current number of uploaded files (e.g., "5/24")

### 3. Image Gallery
- **Grid Layout**: Responsive grid showing all uploaded images
- **Thumbnails**: Preview thumbnails for images
- **Video Indicators**: Special icon for video files
- **Remove Action**: Hover to reveal delete button for each file
- **Reordering**: First image becomes the main product image

## Technical Implementation

### Components

#### ImageUpload Component
**Location**: `/src/modules/dashboard/ui/components/image-upload.tsx`

**Props**:
```typescript
interface ImageUploadProps {
  value: string[];        // Array of media IDs
  onChange: (value: string[]) => void;
  maxImages?: number;     // Default: 24
  maxVideoSize?: number;  // Default: 60MB
}
```

**Features**:
- Uploads files directly to Payload CMS Media collection
- Validates file types and sizes
- Shows real-time upload progress
- Manages uploaded files state
- Provides visual feedback for drag operations

### Database Schema

#### Products Collection - Gallery Field
```typescript
{
  name: "gallery",
  type: "array",
  maxRows: 24,
  fields: [
    {
      name: "media",
      type: "upload",
      relationTo: "media",
      required: true,
    },
  ],
}
```

### API Integration

#### Upload Endpoint
- **Endpoint**: `POST /api/media`
- **Method**: FormData upload
- **Fields**:
  - `file`: The image/video file
  - `alt`: Alt text (auto-generated from filename)

#### Product Creation/Update
The gallery data is automatically transformed:
- **Frontend Format**: `["media-id-1", "media-id-2", ...]`
- **Payload Format**: `[{ media: "media-id-1" }, { media: "media-id-2" }, ...]`

### Form Integration

#### ProductFormDialog Updates
**Location**: `/src/modules/dashboard/ui/components/product-form-dialog.tsx`

**Changes**:
1. Added `gallery?: string[]` to ProductFormData interface
2. Replaced manual image ID inputs with ImageUpload component
3. Auto-assigns first gallery image as main product image
4. Auto-assigns second gallery image as cover image (if available)

**Form Validation**:
```typescript
const onSubmit = (data: ProductFormData) => {
  // Automatically set the first gallery image as the main product image
  if (data.gallery && data.gallery.length > 0) {
    data.image = data.gallery[0]!;
    if (data.gallery.length > 1) {
      data.cover = data.gallery[1];
    }
  } else if (!data.image) {
    toast.error("Please upload at least one product image");
    return;
  }
  // ... submit logic
};
```

## Usage Flow

### Creating a Product with Images

1. **Navigate to My Products**: Click "My Products" in the navigation bar
2. **Click "Create Product"**: Opens the product creation dialog
3. **Fill Basic Info**: Enter product name, description, price, category
4. **Upload Images**:
   - Drag and drop images into the upload zone, OR
   - Click "Upload from computer" to browse files
   - Upload multiple files at once
   - First image becomes the main product image
5. **Review Gallery**: See all uploaded images in the preview grid
6. **Remove if Needed**: Hover over any image and click X to remove
7. **Submit**: Click "Create Product" to save

### Editing Product Images

1. **Navigate to My Products**
2. **Click "Edit" on a product**
3. **Modify Gallery**:
   - Existing images are pre-loaded
   - Add more images (up to 24 total)
   - Remove unwanted images
4. **Save Changes**: Updated gallery is saved to Payload CMS

## File Upload Details

### Upload Process
1. User selects/drops files
2. Component validates each file (type, size)
3. Creates FormData for each file
4. POSTs to `/api/media` endpoint
5. Payload CMS stores file and creates Media document
6. Returns media ID
7. Component adds ID to gallery array
8. Shows success toast notification

### Error Handling
- **Invalid File Type**: "filename is not a valid image or video file"
- **Video Too Large**: "Video filename exceeds 60MB limit (actual size)"
- **Max Files Reached**: "Maximum 24 files allowed"
- **Upload Failed**: Shows specific error message from server

## Data Flow

```
User Action (Drag/Drop or Click)
    ↓
File Validation (type, size, count)
    ↓
Upload to Payload CMS (/api/media)
    ↓
Media Document Created (returns ID)
    ↓
Add ID to Gallery Array
    ↓
Update Form State (setValue("gallery", [...]))
    ↓
On Submit:
  - Transform to Payload format: [{ media: "id" }, ...]
  - Set first image as main product image
  - Set second image as cover (optional)
    ↓
Save to Products Collection
```

## Styling

The ImageUpload component uses:
- **Tailwind CSS**: For responsive layout and styling
- **Drag States**: Visual feedback with border color changes
- **Grid Layout**: 6 columns on large screens, responsive down to 2 columns
- **Hover Effects**: Smooth transitions for delete button reveal
- **Loading States**: Disabled state during uploads

## Browser Compatibility

- ✅ Modern browsers with HTML5 File API support
- ✅ Drag & Drop API support
- ✅ FormData API for file uploads
- ✅ Mobile-friendly (includes "Upload from computer" button)

## Future Enhancements

Potential improvements:
- [ ] Image cropping/editing before upload
- [ ] Drag to reorder images in gallery
- [ ] Bulk upload with progress bars
- [ ] Image optimization (resize/compress) before upload
- [ ] Support for image captions/descriptions
- [ ] Preview mode to see how product will appear on storefront

## Related Files

- `/src/modules/dashboard/ui/components/image-upload.tsx` - Main upload component
- `/src/modules/dashboard/ui/components/product-form-dialog.tsx` - Form integration
- `/src/collections/Products.ts` - Product schema with gallery field
- `/src/modules/products/server/procedures.ts` - Product CRUD with gallery transformation
- `/src/collections/Media.ts` - Media collection schema

## Testing Checklist

- [x] Upload single image
- [x] Upload multiple images at once
- [x] Drag and drop images
- [x] Remove uploaded images
- [x] Validate file type restrictions
- [x] Validate file size limits
- [x] Validate max file count (24)
- [x] Create product with gallery
- [x] Edit product gallery (add/remove images)
- [x] Verify gallery saves to Payload CMS
- [ ] Test with video files
- [ ] Test mobile responsiveness
- [ ] Test with slow network connection
- [ ] Test error handling

## Notes

- The gallery field in Payload uses an array structure: `[{ media: "id" }]`
- Frontend uses simplified array: `["id1", "id2"]` for easier manipulation
- Transformation happens in the mutation layer (createProduct/updateProduct)
- First gallery image is automatically assigned as the main product image
- Second gallery image (if exists) is automatically assigned as the cover image
- The Media collection is accessible only to super-admins in the admin panel
- Tenants upload directly through the ImageUpload component in the storefront

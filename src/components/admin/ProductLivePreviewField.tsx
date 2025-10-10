'use client';

import React from 'react';
import { useFormFields } from '@payloadcms/ui';
import { ProductLivePreview } from './ProductLivePreview';

interface FormFields {
  image?: unknown;
  name?: string;
  description?: unknown;
  price?: number;
  category?: unknown;
  tags?: unknown[];
  [key: string]: unknown;
}

export default function ProductLivePreviewField() {
  // Simple approach - let the hook handle its own errors
  let fields: FormFields = {};
  
  try {
    const formData = useFormFields(([fields]) => fields);
    fields = formData || {};
  } catch (error) {
    console.error('[ProductLivePreviewField] Error using useFormFields:', error);
    // Return a basic component if the hook fails
    return (
      <div className="product-live-preview-field">
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>Live preview temporarily unavailable</p>
        </div>
      </div>
    );
  }

  // Debug logging
  console.log('[ProductLivePreviewField] Fields:', fields);
  console.log('[ProductLivePreviewField] Image field:', fields?.image);

  return (
    <div className="product-live-preview-field">
      <ProductLivePreview data={fields} />
    </div>
  );
}

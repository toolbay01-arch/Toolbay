'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EbayStyleProductForm } from './EbayStyleProductForm';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  image: File | null;
  cover: File | null;
  refundPolicy: string;
  content: string;
  isPrivate: boolean;
}

export const CustomProductCreation: React.FC = () => {
  const router = useRouter();

  const handleSubmit = async (data: ProductFormData) => {
    try {
      // Create FormData for file uploads
      const formData = new FormData();
      
      // Add all form fields
      formData.append('name', data.name);
      formData.append('description', data.description || '');
      formData.append('price', data.price.toString());
      formData.append('category', data.category || '');
      formData.append('refundPolicy', data.refundPolicy);
      formData.append('content', data.content || '');
      formData.append('isPrivate', data.isPrivate.toString());
      
      // Add tags as JSON array
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }
      
      // Add files if they exist
      if (data.image) {
        formData.append('image', data.image);
      }
      if (data.cover) {
        formData.append('cover', data.cover);
      }

      // Submit to Payload API
      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to the created product or products list
        router.push(`/admin/collections/products/${result.doc.id}`);
      } else {
        const error = await response.json();
        console.error('Error creating product:', error);
        alert('Failed to create product. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleCancel = () => {
    router.push('/admin/collections/products');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Create New Product</h1>
            <p className="text-gray-600 mt-1">Add your product with our easy step-by-step process</p>
          </div>
          
          <div className="p-6">
            <EbayStyleProductForm 
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomProductCreation;

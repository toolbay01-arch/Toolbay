'use client';

import React from 'react';
import { Button } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';

interface ProductsListViewProps {
  [key: string]: unknown;
}

export const ProductsListView: React.FC<ProductsListViewProps> = () => {
  const router = useRouter();

  const handleCreateProduct = () => {
    router.push('/admin/create-product');
  };

  return (
    <div className="p-6">
      {/* Custom Header with eBay-style Create Button */}
      <div className="flex justify-between items-center mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-2">Manage your product listings with ease</p>
        </div>
        <Button
          onClick={handleCreateProduct}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium flex items-center space-x-3 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <span className="text-xl">📸</span>
          <span className="text-lg">Create Product (eBay Style)</span>
        </Button>
      </div>
      
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Easy Creation</h3>
              <p className="text-sm text-gray-600">Step-by-step product creation</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">👁️</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Live Preview</h3>
              <p className="text-sm text-gray-600">See how customers will view your product</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📱</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Mobile Ready</h3>
              <p className="text-sm text-gray-600">Optimized for all devices</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to action if no products */}
      <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🛍️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to sell something amazing?</h2>
          <p className="text-gray-600 mb-8">
            Start by adding your first product. Our eBay-style creation process makes it easy to list your items with beautiful photos and detailed descriptions.
          </p>
          <Button
            onClick={handleCreateProduct}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg"
          >
            🚀 Create Your First Product
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductsListView;

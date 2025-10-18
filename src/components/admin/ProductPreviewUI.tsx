'use client'

import React, { useEffect } from 'react'
import { useWatchForm } from '@payloadcms/ui'

interface ProductPreviewUIProps {
  path?: string
}

interface RichTextNode {
  text?: string
  children?: RichTextNode[]
}

interface RichTextContent {
  root?: {
    children?: RichTextNode[]
  }
}

interface MediaItem {
  id?: string
  url?: string
  filename?: string
}

interface CategoryItem {
  id?: string
  name?: string
}

const ProductPreviewUI: React.FC<ProductPreviewUIProps> = () => {
  const { getDataByPath } = useWatchForm()

  // Get live form values
  const productName = getDataByPath('name') as string
  const productDescription = getDataByPath('description') as RichTextContent
  const productImage = getDataByPath('image') as MediaItem
  const productPrice = getDataByPath('price') as number
  const productCategory = getDataByPath('category') as CategoryItem

  // Helper function to extract text from rich text
  const extractTextFromRichText = (richText: RichTextContent): string => {
    if (!richText) return ''
    
    if (typeof richText === 'string') return richText
    
    if (richText.root && richText.root.children) {
      return richText.root.children
        .map((child: RichTextNode) => {
          if (child.children) {
            return child.children
              .map((textNode: RichTextNode) => textNode.text || '')
              .join('')
          }
          return child.text || ''
        })
        .join(' ')
    }
    
    return JSON.stringify(richText)
  }

  // Helper function to get image URL
  const getImageUrl = (image: MediaItem | string | null | undefined): string => {
    if (!image) return '/placeholder.png'
    
    // Handle string URLs
    if (typeof image === 'string') {
      if (image.startsWith('http') || image.startsWith('/')) {
        return image
      }
      return '/placeholder.png'
    }
    
    // Handle object with url property
    if (typeof image === 'object' && image.url) {
      if (image.url.startsWith('http') || image.url.startsWith('/')) {
        return image.url
      }
    }
    
    // Handle object with filename property
    if (typeof image === 'object' && image.filename) {
      return `/media/${image.filename}`
    }
    
    return '/placeholder.png'
  }

  // Helper function to get category name
  const getCategoryName = (category: CategoryItem): string => {
    if (!category) return 'Uncategorized'
    
    if (typeof category === 'string') return category
    if (category.name) return category.name
    
    return 'Uncategorized'
  }

  const formatPrice = (price: number): string => {
    if (!price && price !== 0) return 'Price not set'
    return `RWF ${price.toLocaleString()}`
  }
// testing the coment
  // Add CSS to create a two-column layout when this component is rendered
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      /* Fixed preview panel on the right - non-invasive */
      .product-preview-panel {
        position: fixed !important;
        right: 24px !important;
        top: 80px !important;
        width: 360px !important;
        max-height: calc(100vh - 120px) !important;
        overflow: auto !important;
        background: #ffffff !important;
        border: 2px solid #3b82f6 !important;
        border-radius: 12px !important;
        padding: 1.25rem !important;
        box-shadow: 0 6px 24px rgba(59, 130, 246, 0.15) !important;
        z-index: 9999 !important;
      }
      /* Keep preview internals isolated */
      .product-preview-panel * {
        box-sizing: border-box !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])

  console.log('ProductPreviewUI rendering with data:', {
    productName,
    hasDescription: !!productDescription,
    hasImage: !!productImage,
    productPrice,
    hasCategory: !!productCategory,
  })

  return (
    <div className="product-preview-panel">
      <div className="mb-6 border-b border-blue-200 pb-3">
        <h3 className="text-xl font-bold text-blue-600 mb-2 flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Live Preview
        </h3>
        <p className="text-sm text-gray-600">Updates automatically as you type</p>
      </div>

      {/* Product Image */}
            {/* Product Image */}
      <div className="mb-6 text-center">
        <div className="relative mx-auto max-w-xs">
          <img
            src={getImageUrl(productImage)}
            alt={productName || 'Product preview'}
            className="w-full h-48 rounded-lg border-2 border-gray-200 object-cover bg-gray-100"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/placeholder.png'
            }}
          />
          {!productImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500 mt-2">Upload an image</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="space-y-6">
        {/* Product Name and Category */}
        <div>
          <h4 className="text-xl font-bold mb-2" style={{
            color: productName ? '#1f2937' : '#9ca3af'
          }}>
            {productName || 'Enter product name...'}
          </h4>
          <div className="text-sm" style={{
            color: productCategory ? '#6b7280' : '#d1d5db'
          }}>
            <span>Category: {getCategoryName(productCategory) === 'Uncategorized' ? 'Select a category...' : getCategoryName(productCategory)}</span>
          </div>
        </div>

        {/* Product Price */}
        <div className="text-xl font-bold" style={{
          color: productPrice ? '#2563eb' : '#d1d5db'
        }}>
          {productPrice ? formatPrice(productPrice) : 'RWF 0'}
        </div>

        {/* Product Description */}
        <div>
          <h5 className="mb-3 font-semibold text-gray-900">
            Description
          </h5>
          <div 
            className="text-sm leading-relaxed p-3 rounded-lg border min-h-[120px]"
            style={{
              backgroundColor: productDescription ? '#f9fafb' : '#f3f4f6',
              color: productDescription ? '#374151' : '#9ca3af',
              borderColor: '#e5e7eb'
            }}
          >
            {extractTextFromRichText(productDescription) || 'Add a product description to help customers understand what you\'re selling...'}
          </div>
        </div>
      </div>

      {/* Preview Notice */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-blue-800">
            Live Preview
          </p>
        </div>
        <p className="text-xs text-blue-700">
          This preview updates automatically as you fill out the form fields above
        </p>
      </div>
    </div>
  )
}

export default ProductPreviewUI
'use client'

import React from 'react'

const ToolbayLogo = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Payload's actual SVG logo */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 25 25"
        style={{ width: '25px', height: '25px' }}
      >
        <path 
          d="M11.4373 3.50781C12.0919 3.17377 12.9081 3.17377 13.5627 3.50781L20.5627 7.32297C21.2173 7.65701 21.625 8.29773 21.625 9.00781V16.9922C21.625 17.7023 21.2173 18.343 20.5627 18.677L13.5627 22.4922C12.9081 22.8262 12.0919 22.8262 11.4373 22.4922L4.43726 18.677C3.78268 18.343 3.375 17.7023 3.375 16.9922V9.00781C3.375 8.29773 3.78268 7.65701 4.43726 7.32297L11.4373 3.50781Z" 
          fill="currentColor"
        />
      </svg>
      
      {/* Toolbay text */}
      <span style={{ 
        fontSize: '1.125rem',
        fontWeight: 700,
        letterSpacing: '-0.025em',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      }}>
        Toolbay
      </span>
    </div>
  )
}

export default ToolbayLogo


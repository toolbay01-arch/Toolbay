'use client'

import { useState } from 'react'

interface VerifyPaymentButtonProps {
  transactionId: string
  status: string
  paymentReference: string
  mtnTransactionId?: string
}

export function VerifyPaymentButton({
  transactionId,
  status,
  paymentReference,
  mtnTransactionId
}: VerifyPaymentButtonProps) {
  const [isVerifying, setIsVerifying] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [verifiedTxId, setVerifiedTxId] = useState(mtnTransactionId || '')
  const [error, setError] = useState('')

  // Only show button for transactions awaiting verification
  if (status !== 'awaiting_verification') {
    if (status === 'verified') {
      return <span className="text-green-600 font-semibold">✅ Verified</span>
    }
    if (status === 'rejected') {
      return <span className="text-red-600 font-semibold">❌ Rejected</span>
    }
    if (status === 'pending') {
      return <span className="text-gray-500">⏸️ Pending Payment</span>
    }
    return <span className="text-gray-400">{status}</span>
  }

  const handleVerify = async () => {
    if (!verifiedTxId.trim()) {
      setError('Please enter Mobile Money Transaction ID')
      return
    }

    if (!confirm(`Confirm verification of payment ${paymentReference}?\n\nThis will create orders for this transaction.`)) {
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/trpc/admin.verifyPayment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          json: {
            transactionId,
            verifiedMtnTransactionId: verifiedTxId
          }
        })
      })

      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error?.message || data.error?.json?.message || 'Verification failed')
      }

      alert('✅ Payment verified successfully! Orders have been created.')
      window.location.reload() // Reload to refresh the table
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed')
      console.error('Verification error:', err)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
      >
        ✓ Confirm Payment
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3 border border-green-200 rounded-md bg-green-50">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Enter Mobile Money Transaction ID"
          value={verifiedTxId}
          onChange={(e) => setVerifiedTxId(e.target.value)}
          className="flex-1 px-3 py-1 border border-gray-300 rounded-md text-sm"
          disabled={isVerifying}
        />
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium transition-colors"
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>
        <button
          onClick={() => {
            setShowForm(false)
            setError('')
          }}
          disabled={isVerifying}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md text-sm"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      <p className="text-xs text-gray-600">
        Check your Mobile Money dashboard to confirm this payment
      </p>
    </div>
  )
}

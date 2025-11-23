"use client"

import { useTRPC } from '@/trpc/client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { formatDistance } from 'date-fns'
import type { Transaction } from '@/payload-types'

export default function VerifyPaymentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment Verification</h1>
        <p className="text-gray-600">
          Verify customer payments by checking your MTN Mobile Money dashboard
        </p>
      </div>

      <PendingTransactionsList />
    </div>
  )
}

function PendingTransactionsList() {
  const trpc = useTRPC()
  const { data: transactions, isLoading, refetch } = useQuery(
    trpc.admin.getPendingTransactions.queryOptions()
  )

  if (isLoading) {
    return <LoadingState />
  }

  if (!transactions || transactions.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-1">
          Pending Verifications ({transactions.length})
        </h2>
        <p className="text-sm text-blue-700">
          Review customer payments and verify them in your MTN MoMo dashboard
        </p>
      </div>

      {transactions.map((transaction: Transaction) => (
        <TransactionCard 
          key={transaction.id} 
          transaction={transaction} 
          onVerified={() => refetch()}
        />
      ))}
    </div>
  )
}

interface TransactionCardProps {
  transaction: Transaction
  onVerified: () => void
}

function TransactionCard({ transaction, onVerified }: TransactionCardProps) {
  const trpc = useTRPC()
  const [showVerifyForm, setShowVerifyForm] = useState(false)
  const [verifiedTxId, setVerifiedTxId] = useState(transaction.mtnTransactionId || '')
  const [rejectionReason, setRejectionReason] = useState('')

  const verifyMutation = useMutation(
    trpc.admin.verifyPayment.mutationOptions({
      onSuccess: () => {
        alert('✅ Payment verified successfully! Orders have been created.')
        onVerified()
      },
      onError: (error) => {
        alert(`❌ Error: ${error.message}`)
      },
    })
  )

  const rejectMutation = useMutation(
    trpc.admin.rejectPayment.mutationOptions({
      onSuccess: () => {
        alert('❌ Payment rejected. Customer will be notified.')
        onVerified()
      },
      onError: (error) => {
        alert(`❌ Error: ${error.message}`)
      },
    })
  )

  const handleVerify = () => {
    if (!verifiedTxId.trim()) {
      alert('Please enter the MTN Transaction ID from your dashboard')
      return
    }

    if (confirm('Confirm that you have verified this payment in your MTN MoMo dashboard?')) {
      verifyMutation.mutate({
        transactionId: transaction.id,
        verifiedMtnTransactionId: verifiedTxId,
      })
    }
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    if (confirm('Are you sure you want to reject this payment?')) {
      rejectMutation.mutate({
        transactionId: transaction.id,
        reason: rejectionReason,
      })
    }
  }

  const expiresIn = transaction.expiresAt 
    ? formatDistance(new Date(transaction.expiresAt), new Date(), { addSuffix: true })
    : 'N/A'

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">
            Order #{transaction.paymentReference}
          </h3>
          <p className="text-sm text-yellow-600 font-medium mt-1">
            ⏳ Awaiting Your Verification
          </p>
        </div>
        <span className="text-xs text-gray-500">
          Expires {expiresIn}
        </span>
      </div>

      {/* Customer Info */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Customer Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Name:</span>{' '}
            <span className="font-medium">{transaction.customerName}</span>
          </div>
          <div>
            <span className="text-gray-600">Email:</span>{' '}
            <span className="font-medium">{transaction.customerEmail}</span>
          </div>
          <div>
            <span className="text-gray-600">Phone:</span>{' '}
            <span className="font-medium">{transaction.customerPhone || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
        <div className="space-y-1">
          {transaction.products?.map((item: { product: string | { id: string; name?: string }; price: number }, index: number) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-gray-700">
                • {typeof item.product === 'string' ? item.product : item.product?.name || 'Product'} x1
              </span>
              <span className="font-medium">{item.price?.toLocaleString()} RWF</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between font-semibold">
          <span>Total:</span>
          <span>{transaction.totalAmount?.toLocaleString()} RWF</span>
        </div>
      </div>

      {/* Transaction ID from Customer */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Customer&apos;s Transaction ID
        </h4>
        <div className="bg-gray-50 border border-gray-300 rounded px-4 py-3 font-mono text-sm">
          {transaction.mtnTransactionId || 'Not yet submitted'}
        </div>
      </div>

      {/* Payment Breakdown */}
      <div className="mb-4 pb-4 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Payment Breakdown</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount:</span>
            <span className="font-semibold text-green-600">
              {transaction.totalAmount?.toLocaleString()} RWF
            </span>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            You receive the full amount (no platform fees)
          </p>
        </div>
      </div>

      {/* MTN Dashboard Link */}
      <div className="mb-6">
        <a
          href="https://www.mtn.rw/momo-dashboard"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          📱 Open MTN MoMo Dashboard ↗
        </a>
        <p className="text-xs text-gray-500 mt-1">
          Verify the transaction ID exists in your MTN dashboard before approving
        </p>
      </div>

      {/* Action Buttons */}
      {!showVerifyForm ? (
        <div className="flex gap-3">
          <button
            onClick={() => setShowVerifyForm(true)}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ✅ Verify Payment
          </button>
          <button
            onClick={() => {
              const reason = prompt('Why are you rejecting this payment?')
              if (reason) {
                setRejectionReason(reason)
                handleReject()
              }
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            ❌ Reject
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold mb-3">Verify Payment</h4>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Verified Transaction ID (from MTN):
            </label>
            <input
              type="text"
              value={verifiedTxId}
              onChange={(e) => setVerifiedTxId(e.target.value)}
              placeholder="e.g., MP241022.1045.B3K7Y9"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the exact transaction ID from your MTN MoMo dashboard
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleVerify}
              disabled={verifyMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {verifyMutation.isPending ? 'Verifying...' : '✅ Confirm Verification'}
            </button>
            <button
              onClick={() => setShowVerifyForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-600">Loading pending verifications...</p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
      <div className="text-4xl mb-4">✅</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No Pending Verifications
      </h3>
      <p className="text-gray-600">
        All payments have been verified. New transactions will appear here.
      </p>
    </div>
  )
}

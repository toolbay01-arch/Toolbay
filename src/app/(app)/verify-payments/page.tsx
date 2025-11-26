"use client"

import { useTRPC } from '@/trpc/client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { formatDistance } from 'date-fns'
import type { Transaction } from '@/payload-types'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PackageIcon, Grid3x3, List, CreditCard, Truck } from 'lucide-react';

type TabType = 'payments' | 'orders'

export default function VerifyPaymentsPage() {
  const router = useRouter();
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<TabType>('payments')

  // Refetch on mount and window focus to catch logouts from other tabs
  const session = useQuery({
    ...trpc.auth.session.queryOptions(),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    staleTime: 0, // Always check fresh
  });
  const isTenant = session.data?.user?.roles?.includes('tenant');

  useEffect(() => {
    // Wait until session is fetched before redirecting
    if (!session.isFetched) return;
    
    // Not logged in -> redirect to sign-in
    if (!session.data?.user) {
      router.push('/sign-in?redirect=/verify-payments');
      return;
    }
    
    // Logged in but not a tenant -> redirect to home
    if (!session.data.user.roles?.includes('tenant')) {
      router.push('/');
      return;
    }
  }, [session.isFetched, session.data, router]);

  // Show loading while session is being fetched
  if (session.isLoading || !session.isFetched) {
    return <LoadingState />;
  }

  // Not authenticated or not a tenant - show loading while redirect happens
  if (!session.data?.user || !isTenant) {
    return <LoadingState />;
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Transactions</h1>
        <p className="text-gray-600">
          Verify customer payments and manage order fulfillment
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 text-sm ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span className="hidden sm:inline">Payment</span> Verification
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 text-sm ${
            activeTab === 'orders'
              ? 'border-green-600 text-green-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span className="hidden sm:inline">Order</span> Fulfillment
        </button>
      </div>

      {/* Content */}
      {activeTab === 'payments' && <PendingTransactionsList enabled={!!isTenant} />}
      {activeTab === 'orders' && <PendingOrdersList enabled={!!isTenant} />}
    </div>
  )
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-4 text-gray-600">Loading...</p>
    </div>
  )
}

function PendingTransactionsList({ enabled }: { enabled: boolean }) {
  const trpc = useTRPC();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data: transactions, isLoading, refetch } = useQuery({
    ...trpc.admin.getPendingTransactions.queryOptions(),
    refetchInterval: autoRefresh ? 5000 : false,
    enabled,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (isLoading) {
    return <LoadingState />;
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Transactions Found
        </h3>
        <p className="text-gray-600">
          Transaction history will appear here once customers make purchases.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-900 mb-1">
          All Transactions ({transactions.length})
        </h2>
        <p className="text-sm text-blue-700">
          View and manage payment transactions for your products
        </p>
      </div>

      {/* View & Auto-Refresh Toggle */}
      <div className="flex flex-wrap justify-end gap-2 pb-2">
        <button
          className={`gap-2 px-3 py-1 rounded border flex items-center ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
          onClick={() => setViewMode('grid')}
        >
          <Grid3x3 className="h-4 w-4" /> Grid
        </button>
        <button
          className={`gap-2 px-3 py-1 rounded border flex items-center ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-blue-600'}`}
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" /> List
        </button>
        <button
          className={`gap-2 px-3 py-1 rounded border flex items-center ${autoRefresh ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setAutoRefresh((v) => !v)}
        >
          {autoRefresh ? 'Auto-Refresh: On' : 'Auto-Refresh: Off'}
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Order Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">MTN TX ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction: Transaction) => (
                  <TransactionRow 
                    key={transaction.id} 
                    transaction={transaction} 
                    onVerified={() => refetch()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
          {transactions.map((transaction: Transaction) => (
            <div key={transaction.id} className="hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all border border-blue-600 rounded-lg bg-white overflow-hidden flex flex-col">
              <div className="p-2 flex flex-col gap-1 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <div className="font-mono text-[10px] text-blue-700 truncate">#{transaction.paymentReference}</div>
                  <TransactionStatusBadge status={transaction.status} />
                </div>
                <div className="font-medium text-sm text-gray-900 truncate">{transaction.customerName}</div>
                <div className="text-[10px] text-gray-500 truncate">{transaction.customerEmail}</div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-green-600 text-xs">{transaction.totalAmount?.toLocaleString()} RWF</span>
                  <span className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded truncate">{transaction.mtnTransactionId || 'Not submitted'}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {transaction.status === 'awaiting_verification' && (
                    <>
                      <button
                        onClick={() => window.confirm('Open verification modal in list view for this card.') && alert('Use list view to verify.')}
                        className="px-2 py-0.5 text-[10px] font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                      >
                        ✅ Verify
                      </button>
                      <button
                        onClick={() => window.confirm('Use list view to reject this payment.') && alert('Use list view to reject.')}
                        className="px-2 py-0.5 text-[10px] font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                  {transaction.status === 'verified' && (
                    <span className="text-[10px] text-green-600 font-medium">✅ Verified</span>
                  )}
                  {transaction.status === 'rejected' && (
                    <span className="text-[10px] text-red-600 font-medium">❌ Rejected</span>
                  )}
                  {transaction.status === 'expired' && (
                    <span className="text-[10px] text-gray-600 font-medium">⏱️ Expired</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface TransactionRowProps {
  transaction: Transaction
  onVerified: () => void
}

function TransactionRow({ transaction, onVerified }: TransactionRowProps) {
  const trpc = useTRPC()
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifiedTxId, setVerifiedTxId] = useState(transaction.mtnTransactionId || '')

  const verifyMutation = useMutation(
    trpc.admin.verifyPayment.mutationOptions({
      onSuccess: () => {
        alert('✅ Payment verified successfully! Orders have been created.')
        setShowVerifyModal(false)
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

  const firstProduct = transaction.products?.[0]
  const product = typeof firstProduct?.product === "string"
    ? undefined
    : firstProduct?.product
  const productImageUrl =
    typeof product?.image === "string"
      ? product.image
      : product?.image?.url
  const productName = product?.name || "Product"
  const productQuantity = firstProduct?.quantity || 0

  const handleReject = () => {
    const reason = prompt('Why are you rejecting this payment?')
    if (reason) {
      if (confirm('Are you sure you want to reject this payment?')) {
        rejectMutation.mutate({
          transactionId: transaction.id,
          reason: reason,
        })
      }
    }
  }

  return (
    <>
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded border bg-gray-100 flex items-center justify-center">
            {productImageUrl ? (
              <img
                src={productImageUrl}
                alt={productName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <span className="text-[0.6rem] uppercase tracking-widest text-gray-500">
                No image
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium truncate">{productName}</p>
            <p className="text-xs text-gray-500">Qty: {productQuantity}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">
          <div className="font-medium text-gray-900">
            #{transaction.paymentReference}
          </div>
          <div className="text-xs text-gray-500">
            {formatDistance(new Date(transaction.createdAt), new Date(), { addSuffix: true })}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="font-medium text-gray-900">{transaction.customerName}</div>
          <div className="text-xs text-gray-500">{transaction.customerEmail}</div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
            {transaction.mtnTransactionId || 'Not submitted'}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="font-semibold text-green-600">
            {transaction.totalAmount?.toLocaleString()} RWF
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <TransactionStatusBadge status={transaction.status} />
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex gap-2">
            {transaction.status === 'awaiting_verification' && (
              <>
                <button
                  onClick={() => setShowVerifyModal(true)}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
                >
                  ✅ Verify
                </button>
                <button
                  onClick={handleReject}
                  className="px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  ❌ Reject
                </button>
              </>
            )}
            {transaction.status === 'verified' && (
              <span className="text-xs text-green-600 font-medium">
                ✅ Verified
              </span>
            )}
            {transaction.status === 'rejected' && (
              <span className="text-xs text-red-600 font-medium">
                ❌ Rejected
              </span>
            )}
            {transaction.status === 'expired' && (
              <span className="text-xs text-gray-600 font-medium">
                ⏱️ Expired
              </span>
            )}
          </div>
        </td>
      </tr>

      {/* Verify Modal */}
      {showVerifyModal && (
        <tr>
          <td colSpan={6} className="px-4 py-4 bg-blue-50">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Verify Payment</h4>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  MTN Transaction ID (from your dashboard):
                </label>
                <input
                  type="text"
                  value={verifiedTxId}
                  onChange={(e) => setVerifiedTxId(e.target.value)}
                  placeholder="e.g., MP241122.1045.B3K7Y9"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              <div className="text-xs text-gray-600">
                <a
                  href="https://www.mtn.rw/momo-dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  📱 Open MTN MoMo Dashboard ↗
                </a>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleVerify}
                  disabled={verifyMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                >
                  {verifyMutation.isPending ? 'Verifying...' : '✅ Confirm Verification'}
                </button>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function PendingOrdersList({ enabled }: { enabled: boolean }) {
  const trpc = useTRPC();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const { data: orders, isLoading, refetch } = useQuery({
    ...trpc.sales.getPendingOrders.queryOptions(),
    refetchInterval: autoRefresh ? 5000 : false,
    enabled,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const updateOrderStatus = useMutation(
    trpc.sales.updateOrderStatus.mutationOptions({
      onSuccess: () => {
        alert('✅ Order status updated successfully!');
        refetch();
      },
      onError: (error) => {
        alert(`❌ Error: ${error.message}`);
      },
    })
  );

  if (isLoading) {
    return <LoadingState />;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-4xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No Orders to Fulfill
        </h3>
        <p className="text-gray-600 mb-4">
          Orders will appear here once payments are verified
        </p>
        <Link 
          href="/my-sales"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
        >
          View All Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-900 mb-1">
          Orders to Fulfill ({orders.length})
        </h2>
        <p className="text-sm text-green-700">
          Ship and deliver orders to your customers
        </p>
      </div>

      {/* View & Auto-Refresh Toggle */}
      <div className="flex flex-wrap justify-end gap-2 pb-2">
        <button
          className={`gap-2 px-3 py-1 rounded border flex items-center ${viewMode === 'grid' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setViewMode('grid')}
        >
          <Grid3x3 className="h-4 w-4" /> Grid
        </button>
        <button
          className={`gap-2 px-3 py-1 rounded border flex items-center ${viewMode === 'list' ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setViewMode('list')}
        >
          <List className="h-4 w-4" /> List
        </button>
        <button
          className={`gap-2 px-3 py-1 rounded border flex items-center ${autoRefresh ? 'bg-green-600 text-white' : 'bg-white text-green-600 border-green-600'}`}
          onClick={() => setAutoRefresh((v) => !v)}
        >
          {autoRefresh ? 'Auto-Refresh: On' : 'Auto-Refresh: Off'}
        </button>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {order.productImage && (
                          <img 
                            src={order.productImage} 
                            alt={order.productName}
                            className="w-12 h-12 object-cover rounded border border-gray-200"
                          />
                        )}
                        <div className="text-sm font-medium text-gray-900">
                          {order.productName}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-mono text-xs">
                        #{order.orderNumber || order.saleNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {order.quantity}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {order.totalAmount.toLocaleString()} RWF
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => {
                              if (confirm('Mark this order as shipped?')) {
                                updateOrderStatus.mutate({
                                  orderId: order.orderId,
                                  status: 'shipped',
                                });
                              }
                            }}
                            disabled={updateOrderStatus.isPending}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded transition-colors"
                          >
                            🚚 Ship
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => {
                              if (confirm('Mark this order as delivered?')) {
                                updateOrderStatus.mutate({
                                  orderId: order.orderId,
                                  status: 'delivered',
                                });
                              }
                            }}
                            disabled={updateOrderStatus.isPending}
                            className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                          >
                            📦 Deliver
                          </button>
                        )}
                        {order.status === 'delivered' && (
                          <span className="text-xs text-purple-600 font-medium">⏳ Awaiting confirmation</span>
                        )}
                        {order.status === 'completed' && (
                          <span className="text-xs text-green-600 font-medium">✅ Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {orders.map((order: any) => (
            <div key={order.id} className="hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all border-2 border-green-600 rounded-lg bg-white overflow-hidden flex flex-col">
              {order.productImage ? (
                <img src={order.productImage} alt={order.productName} className="aspect-square w-full object-cover border-b-2 border-green-600" />
              ) : (
                <div className="aspect-square w-full flex items-center justify-center bg-gray-100 border-b-2 border-green-600">
                  <PackageIcon className="h-16 w-16 text-gray-300" />
                </div>
              )}
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono text-xs text-green-700">#{order.orderNumber || order.saleNumber}</div>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div className="font-semibold text-lg text-gray-900 truncate">{order.productName}</div>
                <div className="text-xs text-gray-500 truncate">{order.customerName}</div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-600">{order.totalAmount.toLocaleString()} RWF</span>
                  <span className="text-xs text-gray-700">Qty: {order.quantity}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => {
                        if (confirm('Mark this order as shipped?')) {
                          updateOrderStatus.mutate({
                            orderId: order.orderId,
                            status: 'shipped',
                          });
                        }
                      }}
                      disabled={updateOrderStatus.isPending}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded transition-colors"
                    >
                      🚚 Ship
                    </button>
                  )}
                  {order.status === 'shipped' && (
                    <button
                      onClick={() => {
                        if (confirm('Mark this order as delivered?')) {
                          updateOrderStatus.mutate({
                            orderId: order.orderId,
                            status: 'delivered',
                          });
                        }
                      }}
                      disabled={updateOrderStatus.isPending}
                      className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                    >
                      📦 Deliver
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <span className="text-xs text-purple-600 font-medium">⏳ Awaiting confirmation</span>
                  )}
                  {order.status === 'completed' && (
                    <span className="text-xs text-green-600 font-medium">✅ Completed</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TransactionStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    awaiting_verification: { label: 'Awaiting', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    verified: { label: 'Verified', className: 'bg-green-100 text-green-800 border-green-300' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-800 border-red-300' },
    pending: { label: 'Pending', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    expired: { label: 'Expired', className: 'bg-gray-100 text-gray-800 border-gray-300' },
  }

  const statusConfig = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${statusConfig.className}`}>
      {statusConfig.label}
    </span>
  )
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    shipped: { label: 'Shipped', className: 'bg-blue-100 text-blue-800 border-blue-300' },
    delivered: { label: 'Delivered', className: 'bg-purple-100 text-purple-800 border-purple-300' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800 border-green-300' },
  }

  const statusConfig = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${statusConfig.className}`}>
      {statusConfig.label}
    </span>
  )
}

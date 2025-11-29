"use client"

import { useTRPC } from '@/trpc/client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { formatDistance } from 'date-fns'
import type { Transaction } from '@/payload-types'
import { useRouter } from 'next/navigation'
import { PackageIcon, Grid3x3, List, CreditCard, Truck, ChevronDown, ChevronUp } from 'lucide-react';

export default function VerifyPaymentsPage() {
  const router = useRouter();
  const trpc = useTRPC();

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
    
    // Not logged in -> redirect to homepage
    if (!session.data?.user) {
      router.push('/');
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
        <h1 className="text-3xl font-bold mb-2">Transactions & Orders</h1>
        <p className="text-gray-600">
          Verify customer payments and manage order fulfillment in one unified view
        </p>
      </div>

      <UnifiedTransactionsView enabled={!!isTenant} />
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

function UnifiedTransactionsView({ enabled }: { enabled: boolean }) {
  const trpc = useTRPC();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const { data: transactions, isLoading, refetch } = useQuery({
    ...trpc.admin.getPendingTransactions.queryOptions(),
    refetchInterval: autoRefresh ? 5000 : false,
    enabled,
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

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

  const toggleExpand = (transactionId: string) => {
    setExpandedTransactions(prev => {
      const next = new Set(prev);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

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
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Unified View: Payments & Orders ({transactions.length})
        </h2>
        <p className="text-sm text-gray-700">
          View transactions with their related orders. Verify payments and manage fulfillment all in one place.
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-8"></th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payment Ref</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">MTN TX ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payment Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((transaction: any) => (
                  <UnifiedTransactionRow 
                    key={transaction.id} 
                    transaction={transaction}
                    orders={transaction.orders || []}
                    isExpanded={expandedTransactions.has(transaction.id)}
                    onToggleExpand={() => toggleExpand(transaction.id)}
                    onVerified={() => refetch()}
                    onOrderStatusUpdate={() => refetch()}
                    updateOrderStatus={updateOrderStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactions.map((transaction: any) => (
            <UnifiedTransactionCard
              key={transaction.id}
              transaction={transaction}
              orders={transaction.orders || []}
              onVerified={() => refetch()}
              onOrderStatusUpdate={() => refetch()}
              updateOrderStatus={updateOrderStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface UnifiedTransactionRowProps {
  transaction: any;
  orders: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onVerified: () => void;
  onOrderStatusUpdate: () => void;
  updateOrderStatus: any;
}

function UnifiedTransactionRow({ 
  transaction, 
  orders, 
  isExpanded, 
  onToggleExpand,
  onVerified,
  onOrderStatusUpdate,
  updateOrderStatus
}: UnifiedTransactionRowProps) {
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

  const hasOrders = orders && orders.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3">
          {hasOrders && (
            <button
              onClick={onToggleExpand}
              className="text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </td>
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
          <div className="flex flex-col gap-1">
            <TransactionStatusBadge status={transaction.status} />
            {transaction.deliveryType && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                transaction.deliveryType === 'direct' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {transaction.deliveryType === 'direct' ? '📦 Pickup' : '🚚 Delivery'}
              </span>
            )}
          </div>
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
          <td colSpan={8} className="px-4 py-4 bg-blue-50">
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

      {/* Orders Section - Expanded */}
      {isExpanded && hasOrders && (
        <tr>
          <td colSpan={8} className="px-4 py-4 bg-green-50 border-t-2 border-green-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Orders ({orders.length})
                </h4>
                <button
                  onClick={onToggleExpand}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2">
                {orders.map((order: any) => {
                  const orderProduct = typeof order.product === 'object' ? order.product : null;
                  const orderProductImage = orderProduct?.image?.url || null;
                  const orderProductName = orderProduct?.name || 'Unknown Product';
                  
                  return (
                    <div key={order.id} className="bg-white border border-green-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {orderProductImage && (
                          <img 
                            src={orderProductImage} 
                            alt={orderProductName}
                            className="w-12 h-12 object-cover rounded border border-gray-200"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-sm text-gray-900">{orderProductName}</div>
                          <div className="text-xs text-gray-500">Order #{order.orderNumber}</div>
                          <div className="text-xs font-semibold text-green-600">{order.totalAmount?.toLocaleString()} RWF</div>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="flex gap-2 ml-4">
                        {(() => {
                          const deliveryType = order.deliveryType || 'delivery';
                          
                          if (order.status === 'pending') {
                            if (deliveryType === 'direct') {
                              return (
                                <span className="text-xs text-purple-600 font-medium">
                                  ✅ Ready for Pickup
                                </span>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => {
                                    if (confirm('Mark this order as shipped?')) {
                                      updateOrderStatus.mutate({
                                        orderId: order.id,
                                        status: 'shipped',
                                      });
                                    }
                                  }}
                                  disabled={updateOrderStatus.isPending}
                                  className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 rounded transition-colors"
                                >
                                  🚚 Ship
                                </button>
                              );
                            }
                          }
                          
                          if (order.status === 'shipped' && deliveryType === 'delivery') {
                            return (
                              <button
                                onClick={() => {
                                  if (confirm('Mark this order as delivered?')) {
                                    updateOrderStatus.mutate({
                                      orderId: order.id,
                                      status: 'delivered',
                                    });
                                  }
                                }}
                                disabled={updateOrderStatus.isPending}
                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded transition-colors"
                              >
                                📦 Deliver
                              </button>
                            );
                          }
                          
                          if (order.status === 'delivered') {
                            return (
                              <span className="text-xs text-purple-600 font-medium">⏳ Awaiting confirmation</span>
                            );
                          }
                          
                          if (order.status === 'completed') {
                            return (
                              <span className="text-xs text-green-600 font-medium">✅ Completed</span>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function UnifiedTransactionCard({ 
  transaction, 
  orders,
  onVerified,
  onOrderStatusUpdate,
  updateOrderStatus
}: {
  transaction: any;
  orders: any[];
  onVerified: () => void;
  onOrderStatusUpdate: () => void;
  updateOrderStatus: any;
}) {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [verifiedTxId, setVerifiedTxId] = useState(transaction.mtnTransactionId || '');
  const trpc = useTRPC();

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
  const product = typeof firstProduct?.product === "string" ? undefined : firstProduct?.product
  const productImageUrl = typeof product?.image === "string" ? product.image : product?.image?.url
  const productName = product?.name || "Product"
  const hasOrders = orders && orders.length > 0;

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-mono text-xs text-blue-700">#{transaction.paymentReference}</div>
          <div className="flex flex-col gap-1 items-end">
            <TransactionStatusBadge status={transaction.status} />
            {transaction.deliveryType && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                transaction.deliveryType === 'direct' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {transaction.deliveryType === 'direct' ? '📦 Pickup' : '🚚 Delivery'}
              </span>
            )}
          </div>
        </div>
        
        {productImageUrl && (
          <img src={productImageUrl} alt={productName} className="w-full h-32 object-cover rounded border" />
        )}
        
        <div>
          <div className="font-medium text-sm text-gray-900">{productName}</div>
          <div className="text-xs text-gray-500">{transaction.customerName}</div>
          <div className="font-semibold text-green-600 text-sm mt-1">
            {transaction.totalAmount?.toLocaleString()} RWF
          </div>
        </div>

        {transaction.status === 'awaiting_verification' && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowVerifyModal(true)}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded transition-colors"
            >
              ✅ Verify
            </button>
          </div>
        )}

        {hasOrders && (
          <div>
            <button
              onClick={() => setShowOrders(!showOrders)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
            >
              <span className="flex items-center gap-2">
                <Truck className="h-3 w-3" />
                Orders ({orders.length})
              </span>
              {showOrders ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            
            {showOrders && (
              <div className="mt-2 space-y-2">
                {orders.map((order: any) => {
                  const orderProduct = typeof order.product === 'object' ? order.product : null;
                  const orderProductName = orderProduct?.name || 'Unknown Product';
                  
                  return (
                    <div key={order.id} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs">
                      <div className="font-medium">{orderProductName}</div>
                      <div className="text-gray-500">#{order.orderNumber}</div>
                      <div className="flex items-center justify-between mt-2">
                        <OrderStatusBadge status={order.status} />
                        {(() => {
                          const deliveryType = order.deliveryType || 'delivery';
                          
                          if (order.status === 'pending') {
                            if (deliveryType === 'direct') {
                              return (
                                <span className="text-[10px] text-purple-600 font-medium">
                                  ✅ Ready for Pickup
                                </span>
                              );
                            } else {
                              return (
                                <button
                                  onClick={() => {
                                    if (confirm('Mark as shipped?')) {
                                      updateOrderStatus.mutate({
                                        orderId: order.id,
                                        status: 'shipped',
                                      });
                                    }
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                                >
                                  Ship
                                </button>
                              );
                            }
                          }
                          
                          if (order.status === 'shipped' && deliveryType === 'delivery') {
                            return (
                              <button
                                onClick={() => {
                                  if (confirm('Mark as delivered?')) {
                                    updateOrderStatus.mutate({
                                      orderId: order.id,
                                      status: 'delivered',
                                    });
                                  }
                                }}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                              >
                                Deliver
                              </button>
                            );
                          }
                          
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showVerifyModal && (
        <div className="border-t border-gray-200 p-4 bg-blue-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">Verify Payment</h4>
              <button onClick={() => setShowVerifyModal(false)} className="text-gray-500">✕</button>
            </div>
            <input
              type="text"
              value={verifiedTxId}
              onChange={(e) => setVerifiedTxId(e.target.value)}
              placeholder="MTN Transaction ID"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={handleVerify}
                disabled={verifyMutation.isPending}
                className="flex-1 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded"
              >
                {verifyMutation.isPending ? 'Verifying...' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="px-3 py-2 text-xs font-medium border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
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

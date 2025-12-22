'use client';

import React, { useEffect, useState } from 'react';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippedAt?: string;
  deliveredAt?: string;
  product?: {
    name?: string;
    image?: {
      url?: string;
    };
  };
}

interface TransactionOrdersFieldProps {
  data?: {
    id?: string;
    status?: string;
  };
}

export const TransactionOrdersField: React.FC<TransactionOrdersFieldProps> = ({ data }) => {
  const transactionId = data?.id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!transactionId) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await fetch(`/api/orders?where[transaction][equals]=${transactionId}&depth=2&limit=100`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setOrders(data.docs || []);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [transactionId]);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded border">
        <p className="text-sm text-gray-600">Loading orders...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded border">
        <p className="text-sm text-gray-600">No orders found for this transaction.</p>
        <p className="text-xs text-gray-500 mt-1">Orders will appear here after payment verification.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 rounded border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-green-900">
          Related Orders ({orders.length})
        </h3>
        <a
          href={`/admin/collections/orders?where[transaction][equals]=${transactionId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-green-700 hover:text-green-900 underline"
        >
          View All →
        </a>
      </div>
      
      <div className="space-y-2">
        {orders.map((order) => {
          const productName = typeof order.product === 'object' 
            ? order.product?.name || 'Unknown Product'
            : 'Unknown Product';
          
          const productImage = typeof order.product === 'object' 
            ? order.product?.image?.url 
            : null;

          const statusColors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            shipped: 'bg-blue-100 text-blue-800 border-blue-300',
            delivered: 'bg-purple-100 text-purple-800 border-purple-300',
            completed: 'bg-green-100 text-green-800 border-green-300',
            cancelled: 'bg-red-100 text-red-800 border-red-300',
          };

          return (
            <div
              key={order.id}
              className="bg-white border border-green-200 rounded p-3 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-3 flex-1">
                {productImage && (
                  <img
                    src={productImage}
                    alt={productName}
                    className="w-10 h-10 object-cover rounded border border-gray-200"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {productName}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">
                    #{order.orderNumber}
                  </div>
                  <div className="text-xs font-semibold text-green-600">
                    {order.totalAmount?.toLocaleString()} RWF
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                    statusColors[order.status] || 'bg-gray-100 text-gray-800 border-gray-300'
                  }`}
                >
                  {order.status}
                </span>
                <a
                  href={`/admin/collections/orders/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  View →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


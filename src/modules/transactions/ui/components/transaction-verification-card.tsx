"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Package, 
  User, 
  Phone, 
  MapPin,
  Loader2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  product: {
    id: string;
    name: string;
    price: number;
    image?: any;
  };
  quantity: number;
  price: number;
}

interface Transaction {
  id: string;
  paymentReference: string;
  mtnTransactionId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  totalAmount: number;
  products: Product[];
  shippingAddress?: {
    line1?: string;
    city?: string;
    country?: string;
  };
  createdAt: string;
  expiresAt: string;
}

interface TransactionVerificationCardProps {
  transaction: Transaction;
}

export function TransactionVerificationCard({ transaction }: TransactionVerificationCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const verifyMutation = useMutation(
    trpc.transactions.verifyTransaction.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        queryClient.invalidateQueries(trpc.transactions.getAwaitingVerification.queryFilter());
        queryClient.invalidateQueries(trpc.orders.getMyOrders.queryFilter());
        queryClient.invalidateQueries(trpc.sales.getMySales.queryFilter());
      },
      onError: (error) => {
        toast.error(error.message || "Failed to verify transaction");
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.transactions.rejectTransaction.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setShowRejectDialog(false);
        setRejectionReason("");
        queryClient.invalidateQueries(trpc.transactions.getAwaitingVerification.queryFilter());
      },
      onError: (error) => {
        toast.error(error.message || "Failed to reject transaction");
      },
    })
  );

  const handleVerify = () => {
    verifyMutation.mutate({ transactionId: transaction.id });
    setShowVerifyDialog(false);
  };

  const handleReject = () => {
    if (rejectionReason.trim().length < 10) {
      toast.error("Please provide a detailed reason (at least 10 characters)");
      return;
    }
    rejectMutation.mutate({ 
      transactionId: transaction.id,
      reason: rejectionReason 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "decimal",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + " RWF";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-RW", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isExpired = new Date() > new Date(transaction.expiresAt);
  const isProcessing = verifyMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <Card className={`${isExpired ? 'opacity-60 border-red-200' : 'border-green-200'}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                {transaction.paymentReference}
              </CardTitle>
              <CardDescription className="mt-1">
                Submitted {formatDate(transaction.createdAt)}
              </CardDescription>
            </div>
            <Badge variant={isExpired ? "destructive" : "default"} className="text-xs">
              {isExpired ? "Expired" : "Pending Verification"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* MTN Transaction ID - Prominent Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">MTN Transaction ID</h4>
            </div>
            <p className="text-2xl font-mono font-bold text-blue-900 tracking-wide">
              {transaction.mtnTransactionId || "Not provided"}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              ⚠️ Verify this ID matches the payment in your MTN MoMo dashboard
            </p>
          </div>

          {/* Customer Information */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700">Customer Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span>{transaction.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{transaction.customerPhone}</span>
              </div>
              {transaction.shippingAddress && (
                <div className="flex items-start gap-2 col-span-2">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span>
                    {transaction.shippingAddress.line1}, {transaction.shippingAddress.city}, {transaction.shippingAddress.country}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({transaction.products.length})
            </h4>
            <div className="space-y-2">
              {transaction.products.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-gray-600 text-xs">
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-base font-bold">
              <span className="text-green-700">Total Amount:</span>
              <span className="text-green-700">{formatCurrency(transaction.totalAmount)}</span>
            </div>
            <p className="text-xs text-gray-600">
              You receive the full amount (no platform fees)
            </p>
          </div>

          {/* Expiry Warning */}
          {!isExpired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs text-yellow-800">
              ⏰ Expires: {formatDate(transaction.expiresAt)}
            </div>
          )}

          {/* Action Buttons */}
          {!isExpired && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowVerifyDialog(true)}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Approve Payment
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowRejectDialog(true)}
                disabled={isProcessing}
                variant="destructive"
                className="flex-1"
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject Payment
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verify Confirmation Dialog */}
      <AlertDialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payment Verification</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>You are about to approve this payment:</p>
              <div className="bg-gray-100 p-3 rounded space-y-1 text-sm">
                <p><strong>Payment Ref:</strong> {transaction.paymentReference}</p>
                <p><strong>MTN TX ID:</strong> {transaction.mtnTransactionId}</p>
                <p><strong>Total Amount:</strong> {formatCurrency(transaction.totalAmount)}</p>
              </div>
              <p className="text-green-600 font-semibold">
                ✅ You will receive the full amount (no platform fees)
              </p>
              <p className="text-orange-600 font-semibold">
                ⚠️ This will create {transaction.products.length} order(s) and cannot be undone.
              </p>
              <p>Have you verified this payment in your MTN MoMo account?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVerify} className="bg-green-600 hover:bg-green-700">
              Yes, Approve Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Payment</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Please provide a reason for rejecting this payment:</p>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g., Transaction ID not found in MTN MoMo dashboard, incorrect amount, etc."
                rows={4}
                className="mt-2"
              />
              <p className="text-sm text-gray-600">
                The customer will be notified with this reason.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectionReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={rejectionReason.trim().length < 10}
            >
              Reject Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

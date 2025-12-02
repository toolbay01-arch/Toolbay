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
  AlertCircle,
  ChevronDown,
  ChevronUp
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
  viewMode?: 'grid' | 'list';
}

export function TransactionVerificationCard({ transaction, viewMode = 'grid' }: TransactionVerificationCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

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

  const firstProduct = transaction.products?.[0];
  const productImageUrl = firstProduct?.product?.image?.url;
  const productName = firstProduct?.product?.name || "Product";
  const productQuantity = firstProduct?.quantity || 0;

  const productPreview = (
    <div className="flex items-center gap-3">
      <div className="h-14 w-14 overflow-hidden rounded border bg-gray-100 flex items-center justify-center">
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
      <div className="flex flex-col">
        <p className="font-semibold text-sm truncate">{productName}</p>
        <p className="text-xs text-gray-500">Qty: {productQuantity}</p>
      </div>
    </div>
  );

  // List view with collapsible details
  if (viewMode === 'list') {
    return (
      <>
        <Card className={`${isExpired ? 'opacity-60 border-red-200' : 'border-green-200'}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <CardTitle className="text-lg truncate">{transaction.paymentReference}</CardTitle>
                  <Badge variant={isExpired ? "destructive" : "default"} className="text-xs shrink-0">
                    {isExpired ? "Expired" : "Pending"}
                  </Badge>
                </div>
                <div className="mt-3">
                  {productPreview}
                </div>
                
                {/* Essential Info - Always Visible */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{transaction.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{transaction.customerPhone}</span>
                  </div>
                </div>

                {/* MTN TX ID - Prominent */}
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-semibold text-blue-900">Mobile Money Transaction ID</span>
                  </div>
                  <p className="text-lg font-mono font-bold text-blue-900 truncate">
                    {transaction.mtnTransactionId || "Not provided"}
                  </p>
                </div>

                {/* Total Amount */}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-700">Total Amount:</span>
                  <span className="text-xl font-bold text-green-700">{formatCurrency(transaction.totalAmount)}</span>
                </div>
              </div>

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="shrink-0"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>
          </CardHeader>

          {/* Expandable Details */}
          {isExpanded && (
            <CardContent className="space-y-4 pt-0 border-t">
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

              {/* Shipping Address */}
              {transaction.shippingAddress && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </h4>
                  <div className="text-sm bg-gray-50 p-2 rounded">
                    {transaction.shippingAddress.line1}, {transaction.shippingAddress.city}, {transaction.shippingAddress.country}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-1 text-xs text-gray-600">
                <p>Submitted: {formatDate(transaction.createdAt)}</p>
                {!isExpired && <p className="text-yellow-600">Expires: {formatDate(transaction.expiresAt)}</p>}
              </div>

              <p className="text-xs text-gray-600 border-t pt-2">
                You receive the full amount (no platform fees)
              </p>
            </CardContent>
          )}

          {/* Action Buttons - Always Visible */}
          {!isExpired && (
            <CardContent className="pt-0 pb-4">
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowVerifyDialog(true)}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  {verifyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  {rejectMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Dialogs */}
        <VerifyDialog 
          open={showVerifyDialog}
          onOpenChange={setShowVerifyDialog}
          transaction={transaction}
          onConfirm={handleVerify}
          formatCurrency={formatCurrency}
        />
        <RejectDialog
          open={showRejectDialog}
          onOpenChange={setShowRejectDialog}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
          onConfirm={handleReject}
        />
      </>
    );
  }

  // Grid view - Full details always visible
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
          <div>{productPreview}</div>
          {/* MTN Transaction ID - Prominent Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Mobile Money Transaction ID</h4>
            </div>
            <p className="text-2xl font-mono font-bold text-blue-900 tracking-wide">
              {transaction.mtnTransactionId || "Not provided"}
            </p>
            <p className="text-sm text-blue-700 mt-2">
              ⚠️ Verify this ID matches the payment in your Mobile Money dashboard
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
      <VerifyDialog 
        open={showVerifyDialog}
        onOpenChange={setShowVerifyDialog}
        transaction={transaction}
        onConfirm={handleVerify}
        formatCurrency={formatCurrency}
      />

      {/* Reject Dialog */}
      <RejectDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        onConfirm={handleReject}
      />
    </>
  );
}

// Reusable Verify Dialog Component
function VerifyDialog({ 
  open, 
  onOpenChange, 
  transaction, 
  onConfirm, 
  formatCurrency 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  onConfirm: () => void;
  formatCurrency: (amount: number) => string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Payment Verification</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>You are about to approve this payment:</p>
            <div className="bg-gray-100 p-3 rounded space-y-1 text-sm">
              <p><strong>Payment Ref:</strong> {transaction.paymentReference}</p>
              <p><strong>MoMo TX ID:</strong> {transaction.mtnTransactionId}</p>
              <p><strong>Total Amount:</strong> {formatCurrency(transaction.totalAmount)}</p>
            </div>
            <p className="text-green-600 font-semibold">
              ✅ You will receive the full amount (no platform fees)
            </p>
            <p className="text-orange-600 font-semibold">
              ⚠️ This will create {transaction.products.length} order(s) and cannot be undone.
            </p>
            <p>Have you verified this payment in your Mobile Money account?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-green-600 hover:bg-green-700">
            Yes, Approve Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Reusable Reject Dialog Component
function RejectDialog({
  open,
  onOpenChange,
  rejectionReason,
  setRejectionReason,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reject Payment</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>Please provide a reason for rejecting this payment:</p>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Transaction ID not found in Mobile Money dashboard, incorrect amount, etc."
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
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
            disabled={rejectionReason.trim().length < 10}
          >
            Reject Payment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

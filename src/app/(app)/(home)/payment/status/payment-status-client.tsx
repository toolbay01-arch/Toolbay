"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2,
  Home,
  RefreshCw
} from "lucide-react";

export function PaymentStatusClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("transactionId");

  const trpc = useTRPC();

  // Poll transaction status every 5 seconds
  const { data: transaction, isLoading, refetch } = useQuery(
    trpc.transactions.getStatus.queryOptions(
      { transactionId: transactionId || "" },
      { 
        enabled: !!transactionId,
        refetchInterval: 5000, // Auto-refresh every 5 seconds
      }
    )
  );

  if (!transactionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Invalid transaction ID</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Transaction not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (transaction.status) {
      case "pending":
        return {
          icon: <Clock className="h-16 w-16 text-orange-500" />,
          color: "border-orange-200 bg-orange-50",
          title: "Payment Pending",
          description: "Please complete the Mobile Money payment to continue",
          message: "You haven't submitted your Transaction ID yet. Go back to enter it.",
        };
      case "awaiting_verification":
        return {
          icon: <Clock className="h-16 w-16 text-blue-500 animate-pulse" />,
          color: "border-blue-200 bg-blue-50",
          title: "Awaiting Verification",
          description: "Your transaction ID has been submitted",
          message: "The merchant is verifying your payment. This usually takes a few minutes.",
        };
      case "verified":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          color: "border-green-200 bg-green-50",
          title: "Payment Verified! 🎉",
          description: "Your payment has been confirmed",
          message: "Your order has been created successfully. You can now access your products.",
        };
      case "rejected":
        return {
          icon: <XCircle className="h-16 w-16 text-red-500" />,
          color: "border-red-200 bg-red-50",
          title: "Payment Rejected",
          description: "Your payment could not be verified",
          message: transaction.rejectionReason || "Please contact the merchant for assistance.",
        };
      case "expired":
        return {
          icon: <AlertCircle className="h-16 w-16 text-gray-500" />,
          color: "border-gray-200 bg-gray-50",
          title: "Transaction Expired",
          description: "The 48-hour payment window has passed",
          message: "Please create a new order to purchase these products.",
        };
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-gray-500" />,
          color: "border-gray-200 bg-gray-50",
          title: "Unknown Status",
          description: "Unable to determine transaction status",
          message: "Please contact support for assistance.",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Card */}
        <Card className={`border-2 shadow-lg ${statusConfig.color}`}>
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="flex justify-center">
              {statusConfig.icon}
            </div>
            <div>
              <CardTitle className="text-3xl mb-2">{statusConfig.title}</CardTitle>
              <CardDescription className="text-base">{statusConfig.description}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription className="text-center text-base">
                {statusConfig.message}
              </AlertDescription>
            </Alert>

            {/* Transaction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <div className="bg-white/80 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Transaction Reference</p>
                <code className="text-sm font-mono font-semibold break-all">
                  {transaction.paymentReference}
                </code>
              </div>
              <div className="bg-white/80 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Amount</p>
                <p className="text-2xl font-bold">
                  {transaction.totalAmount.toLocaleString()} RWF
                </p>
              </div>
              <div className="bg-white/80 p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <p className="text-lg font-semibold capitalize">
                  {transaction.status.replace(/_/g, " ")}
                </p>
              </div>
              {transaction.mtnTransactionId && (
                <div className="bg-white/80 p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Mobile Money Transaction ID</p>
                  <code className="text-sm font-mono break-all">
                    {transaction.mtnTransactionId}
                  </code>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {transaction.status === "verified" && (
                <>
                  <Button 
                    onClick={() => router.push("/library")} 
                    className="flex-1"
                    size="lg"
                  >
                    <Home className="mr-2 h-5 w-5" />
                    Go to My Library
                  </Button>
                  <Button 
                    onClick={() => router.push("/")} 
                    variant="outline"
                    className="flex-1"
                    size="lg"
                  >
                    Continue Shopping
                  </Button>
                </>
              )}

              {transaction.status === "pending" && (
                <Button 
                  onClick={() => router.push(`/payment/instructions?transactionId=${transactionId}`)} 
                  className="w-full"
                  size="lg"
                >
                  Complete Payment
                </Button>
              )}

              {(transaction.status === "rejected" || transaction.status === "expired") && (
                <Button 
                  onClick={() => router.push("/")} 
                  className="w-full"
                  size="lg"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Back to Home
                </Button>
              )}

              {transaction.status === "awaiting_verification" && (
                <Button 
                  onClick={() => refetch()} 
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Refresh Status
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Auto-refresh indicator */}
        {transaction.status === "awaiting_verification" && (
          <div className="text-center text-sm text-muted-foreground">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Auto-refreshing every 5 seconds...</span>
            </div>
          </div>
        )}

        {/* Help Section */}
        {transaction.status === "awaiting_verification" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">⏰ What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• The merchant will verify your payment within a few minutes</p>
              <p>• You&apos;ll see the status update automatically on this page</p>
              <p>• Once verified, you can access your purchased products in your library</p>
              <p>• Keep this page open or bookmark it to check back later</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

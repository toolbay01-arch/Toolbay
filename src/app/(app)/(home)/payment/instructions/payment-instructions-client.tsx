"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PaymentInstructionsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("transactionId");
  
  const [mtnTransactionId, setMtnTransactionId] = useState("");
  const [copied, setCopied] = useState(false);

  const trpc = useTRPC();

  // Get transaction details
  const { data: transaction, isLoading } = useQuery(
    trpc.transactions.getStatus.queryOptions(
      { transactionId: transactionId || "" },
      { enabled: !!transactionId }
    )
  );

  // Submit transaction ID mutation
  const submitMutation = useMutation(
    trpc.transactions.submitTransactionId.mutationOptions({
      onSuccess: () => {
        toast.success("Transaction ID submitted successfully!");
        router.push(`/payment/status?transactionId=${transactionId}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = () => {
    if (!mtnTransactionId.trim()) {
      toast.error("Please enter your MTN Transaction ID");
      return;
    }

    if (!transactionId) {
      toast.error("Invalid transaction");
      return;
    }

    submitMutation.mutate({
      transactionId,
      mtnTransactionId: mtnTransactionId.trim(),
    });
  };

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

  const expiresAt = new Date(transaction.expiresAt);
  const isExpired = new Date() > expiresAt;

  // Extract tenant data safely
  const tenant = transaction.tenant && typeof transaction.tenant === 'object' ? transaction.tenant : null;
  const momoCode = tenant && 'momoCode' in tenant ? tenant.momoCode : '';
  const momoAccountName = tenant && 'momoAccountName' in tenant ? tenant.momoAccountName : '';
  const dialCode = `*182*8*1*${momoCode}*${transaction.totalAmount}#`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Complete Your Payment</h1>
          <p className="text-muted-foreground">
            Follow the instructions below to pay via MTN Mobile Money
          </p>
        </div>

        {/* Payment Instructions Card */}
        <Card className="border-2 border-primary shadow-lg">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-2xl">📱 Step 1: Dial This Code</CardTitle>
            <CardDescription className="text-base">
              On your MTN Mobile Money phone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Seller Name Display */}
            {momoAccountName && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-muted-foreground mb-1">Paying to:</p>
                <p className="text-xl font-bold text-blue-900">
                  {momoAccountName}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Please verify this name matches the one shown in your MTN Mobile Money confirmation
                </p>
              </div>
            )}

            {/* Dial Code */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">Dial on your MTN phone:</p>
                  <code className="text-2xl md:text-3xl font-bold text-green-700 break-all">
                    {dialCode}
                  </code>
                </div>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => copyToClipboard(dialCode)}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Amount & Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-muted-foreground mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold text-blue-700">
                  {transaction.totalAmount.toLocaleString()} RWF
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-muted-foreground mb-1">Payment Reference</p>
                <code className="text-lg font-mono font-semibold text-purple-700">
                  {transaction.paymentReference}
                </code>
              </div>
            </div>

            {/* Alternative Instructions */}
            <Alert>
              <AlertDescription>
                <p className="font-semibold mb-2">Alternative: Manual Dial Steps</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Dial *182*8*1# on your MTN phone</li>
                  <li>Enter MoMo Code: <strong>{momoCode}</strong></li>
                  <li>Enter Amount: <strong>{transaction.totalAmount}</strong></li>
                  <li>Enter your PIN to confirm</li>
                  <li>Save the Transaction ID from your SMS</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Expiry Warning */}
            {!isExpired && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⏰ <strong>Payment window:</strong> {expiresAt.toLocaleString()}
                </p>
              </div>
            )}

            {isExpired && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This transaction has expired. Please create a new order.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Transaction ID Submission Card */}
        <Card className="border-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">💳 Step 2: Enter Transaction ID</CardTitle>
            <CardDescription>
              After completing the payment, you&apos;ll receive an SMS from MTN with your Transaction ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mtnTxId" className="text-base">
                MTN Transaction ID *
              </Label>
              <Input
                id="mtnTxId"
                placeholder="e.g., MP241021.1234.A56789"
                value={mtnTransactionId}
                onChange={(e) => setMtnTransactionId(e.target.value)}
                className="font-mono text-lg h-12"
                disabled={isExpired || submitMutation.isPending}
              />
              <p className="text-sm text-muted-foreground">
                Check your SMS from MTN Mobile Money for the transaction ID
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!mtnTransactionId.trim() || isExpired || submitMutation.isPending}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Transaction ID"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">❓ Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Make sure you have enough balance in your MTN Mobile Money account</p>
            <p>• The amount will be deducted from your MTN Mobile Money balance</p>
            <p>• You&apos;ll receive a confirmation SMS with the Transaction ID</p>
            <p>• Keep your Transaction ID safe for future reference</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

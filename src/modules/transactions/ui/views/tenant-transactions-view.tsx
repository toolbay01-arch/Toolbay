"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Loader2, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionVerificationCard } from "../components/transaction-verification-card";

export function TenantTransactionsView() {
  const router = useRouter();
  const trpc = useTRPC();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Check authentication and tenant status
  const { data: session, isLoading: sessionLoading } = useQuery(
    trpc.auth.session.queryOptions()
  );

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.push("/sign-in?redirect=/dashboard/transactions");
    } else if (!sessionLoading && session?.user && !session.user.roles?.includes('tenant')) {
      router.push("/");
    }
  }, [session, sessionLoading, router]);

  // Fetch transactions awaiting verification
  const { data, isLoading, refetch, isRefetching } = useQuery(
    trpc.transactions.getAwaitingVerification.queryOptions({
      limit: 20,
      page: 1,
    })
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      refetch();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  if (sessionLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session?.user || !session.user.roles?.includes('tenant')) {
    return null;
  }

  const transactions = data?.docs || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div>
                <h1 className="text-3xl font-bold">Payment Verification</h1>
                <p className="text-gray-600 mt-1">
                  Review and approve customer payments
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? "border-green-500 text-green-700" : ""}
              >
                {autoRefresh ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Auto-refresh ON
                  </>
                ) : (
                  "Auto-refresh OFF"
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                {isRefetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900 space-y-1">
                <p className="font-semibold">How to verify payments:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Check the <strong>MTN Transaction ID</strong> in your MTN MoMo account/dashboard</li>
                  <li>Verify the <strong>amount</strong> matches what you received</li>
                  <li>Click <strong>"Approve Payment"</strong> to create orders and process fulfillment</li>
                  <li>If the payment doesn't match, click <strong>"Reject"</strong> with a reason</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center border-2 border-dashed rounded-lg p-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
            <p className="text-muted-foreground max-w-md">
              No payments awaiting verification. New transactions will appear here when customers submit their payment details.
            </p>
            {autoRefresh && (
              <p className="text-sm text-green-600 mt-4">
                🔄 Auto-refreshing every 30 seconds...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {transactions.length} payment{transactions.length !== 1 ? 's' : ''} awaiting verification
              </p>
              {autoRefresh && (
                <p className="text-xs text-green-600">
                  🔄 Auto-refreshing every 30 seconds...
                </p>
              )}
            </div>

            {transactions.map((transaction: any) => (
              <TransactionVerificationCard
                key={transaction.id}
                transaction={transaction}
              />
            ))}

            {/* Pagination Info */}
            {data?.totalDocs && data.totalDocs > transactions.length && (
              <div className="text-center text-sm text-muted-foreground pt-4">
                Showing {transactions.length} of {data.totalDocs} transactions
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

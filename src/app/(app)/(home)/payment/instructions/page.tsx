import { Suspense } from "react";
import { PaymentInstructionsClient } from "./payment-instructions-client";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PaymentInstructionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentInstructionsClient />
    </Suspense>
  );
}

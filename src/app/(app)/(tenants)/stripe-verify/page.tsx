"use client";

import { useEffect } from "react";

const Page = () => {
  useEffect(() => {
    // Redirect to tenant dashboard instead of Stripe verification
    window.location.href = "/dashboard";
  }, []);

  //   window.location.href = "/verify-tenants";
  // }, []);

  return ( 
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Rwanda Verification System</h1>
        <p className="text-gray-600">Please wait while we redirect you to the new verification dashboard...</p>
      </div>
    </div>
  );
}
 
export default Page;

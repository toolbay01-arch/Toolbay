"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const trpc = useTRPC();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  const verifyEmail = useMutation(trpc.auth.verifyEmail.mutationOptions({
    onError: (error) => {
      setStatus("error");
      toast.error(error.message);
    },
    onSuccess: () => {
      setStatus("success");
      toast.success("Email verified successfully!");
    },
  }));

  useEffect(() => {
    if (token) {
      verifyEmail.mutate({ token });
    } else {
      setStatus("error");
    }
  }, [token]);

  if (status === "verifying") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <Link href="/">
              <span className={cn("text-2xl font-semibold", poppins.className)}>
                Toolbay
              </span>
            </Link>
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-black" />
            </div>
            <h1 className="mt-6 text-3xl font-medium">
              Verifying Your Email...
            </h1>
            <p className="text-gray-600">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
        <div
          className="h-screen w-full lg:col-span-2 hidden lg:block"
          style={{
            backgroundImage: "url('/auth-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <Link href="/">
              <span className={cn("text-2xl font-semibold", poppins.className)}>
                Toolbay
              </span>
            </Link>
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="mt-6 text-3xl font-medium text-green-600">
              Email Verified!
            </h1>
            <p className="text-gray-600">
              Your email has been successfully verified. You can now access all features of your account.
            </p>
            <div className="mt-8 space-y-4">
              <Button
                onClick={() => router.push("/sign-in")}
                size="lg"
                className="w-full bg-black text-white hover:bg-pink-400 hover:text-primary"
              >
                Continue to Login
              </Button>
            </div>
          </div>
        </div>
        <div
          className="h-screen w-full lg:col-span-2 hidden lg:block"
          style={{
            backgroundImage: "url('/auth-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5">
      <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <Link href="/">
            <span className={cn("text-2xl font-semibold", poppins.className)}>
              Toolbay
            </span>
          </Link>
          <div className="flex justify-center">
            <XCircle className="h-16 w-16 text-red-600" />
          </div>
          <h1 className="mt-6 text-3xl font-medium text-red-600">
            Verification Failed
          </h1>
          <p className="text-gray-600">
            This verification link is invalid or has expired.
          </p>
          <div className="mt-8 space-y-4">
            <Button
              onClick={() => router.push("/sign-up")}
              variant="default"
              size="lg"
              className="w-full"
            >
              Create New Account
            </Button>
            <Button
              onClick={() => router.push("/sign-in")}
              variant="ghost"
              size="lg"
              className="w-full underline"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
      <div
        className="h-screen w-full lg:col-span-2 hidden lg:block"
        style={{
          backgroundImage: "url('/auth-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>
  );
}

export const VerifyEmailView = () => {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 flex items-center justify-center">
          <p>Loading...</p>
        </div>
        <div
          className="h-screen w-full lg:col-span-2 hidden lg:block"
          style={{
            backgroundImage: "url('/auth-bg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
};

"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import { resetPasswordSchema } from "../../schemas";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const trpc = useTRPC();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetPassword = useMutation(trpc.auth.resetPassword.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Password reset successfully! You can now log in with your new password.");
      router.push("/sign-in");
    },
  }));

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    mode: "all",
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token,
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: z.infer<typeof resetPasswordSchema>) => {
    resetPassword.mutate(values);
  };

  if (!token) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 text-center">
            <Link href="/">
              <span className={cn("text-2xl font-semibold", poppins.className)}>
                Toolbay
              </span>
            </Link>
            <h1 className="mt-6 text-3xl font-medium text-red-600">
              Invalid Reset Link
            </h1>
            <p className="mt-4 text-gray-600">
              This password reset link is invalid or has expired.
            </p>
            <div className="mt-8 space-y-4">
              <Button asChild variant="default" className="w-full">
                <Link href="/forgot-password">
                  Request New Reset Link
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full underline">
                <Link href="/sign-in">
                  Back to Login
                </Link>
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
      <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 overflow-y-auto">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-8 p-4 lg:p-16"
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <span className={cn("text-2xl font-semibold", poppins.className)}>
                  Toolbay
                </span>
              </Link>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-base border-none underline"
              >
                <Link prefetch href="/sign-in">
                  Back to Login
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-medium">
              Reset Your Password
            </h1>
            <p className="text-gray-600 -mt-4">
              Enter your new password below.
            </p>
            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} type={showPassword ? "text" : "password"} placeholder="••••••••" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Must be at least 6 characters
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Confirm New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Re-enter your new password
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={resetPassword.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary touch-manipulation"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {resetPassword.isPending ? "Resetting Password..." : "Reset Password"}
            </Button>
          </form>
        </Form>
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

export const ResetPasswordView = () => {
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
      <ResetPasswordContent />
    </Suspense>
  );
};

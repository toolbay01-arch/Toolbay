"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

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

import { forgotPasswordSchema } from "../../schemas";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

export const ForgotPasswordView = () => {
  const router = useRouter();
  const trpc = useTRPC();
  const [emailSent, setEmailSent] = useState(false);

  const forgotPassword = useMutation(trpc.auth.forgotPassword.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      setEmailSent(true);
      toast.success("Password reset link sent! Check your email.");
    },
  }));

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    mode: "all",
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = (values: z.infer<typeof forgotPasswordSchema>) => {
    forgotPassword.mutate(values);
  };

  if (emailSent) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <Link href="/">
                <span className={cn("text-2xl font-semibold", poppins.className)}>
                  Toolbay
                </span>
              </Link>
              <h1 className="mt-6 text-3xl font-medium">
                Check Your Email
              </h1>
              <p className="mt-4 text-gray-600 leading-relaxed">
                We've sent a password reset link to <strong>{form.getValues("email")}</strong>.
                Please check your inbox and click the link to reset your password.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Didn't receive the email? Check your spam folder or{" "}
                <button
                  onClick={() => setEmailSent(false)}
                  className="text-black underline hover:text-pink-600"
                >
                  try again
                </button>
                .
              </p>
              <div className="mt-8">
                <Button asChild variant="ghost" className="underline">
                  <Link href="/sign-in">
                    Back to Login
                  </Link>
                </Button>
              </div>
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
              Forgot Password?
            </h1>
            <p className="text-gray-600 -mt-4">
              No worries! Enter your email address and we'll send you a link to reset your password.
            </p>
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Email Address</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="your@email.com" />
                  </FormControl>
                  <FormDescription>
                    Enter the email address associated with your account
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              disabled={forgotPassword.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary touch-manipulation"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {forgotPassword.isPending ? "Sending..." : "Send Reset Link"}
            </Button>
            <div className="text-center text-sm text-gray-600">
              Remember your password?{" "}
              <Link href="/sign-in" className="text-black underline hover:text-pink-600">
                Sign in
              </Link>
            </div>
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
};

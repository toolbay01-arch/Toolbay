"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { loginSchema } from "../../schemas";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

export const SignInView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const registered = searchParams.get("registered"); // Check if user just registered
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const resendVerification = useMutation(trpc.auth.resendVerification.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: () => {
      toast.success("Verification email sent! Please check your inbox.");
      setUnverifiedEmail(null);
    },
  }));

  const login = useMutation(trpc.auth.login.mutationOptions({
    onError: (error) => {
      // Check if error is about unverified email
      if (error.message.includes("verify your email")) {
        setUnverifiedEmail(form.getValues("email"));
      }
      toast.error(error.message);
    },
    onSuccess: async (data) => {
      // Immediately update the session cache with the logged-in user
      // This prevents flash of logged-out state
      if (data?.user) {
        queryClient.setQueryData(
          trpc.auth.session.queryKey(),
          { user: data.user, permissions: {} }
        );
      }
      
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      
      // Navigate to the redirect URL if provided, otherwise go to homepage
      const redirectUrl = redirect || "/";
      
      // Prefetch the redirect URL for instant navigation
      router.prefetch(redirectUrl);
      
      // Small delay to ensure cache is updated before navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate smoothly
      router.push(redirectUrl);
      router.refresh();
    },
  }));

  const form = useForm<z.infer<typeof loginSchema>>({
    mode: "all",
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true, // Default to keeping users signed in
    },
  });

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    login.mutate(values)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5">
      <div className="bg-[#F4F4F0] h-screen w-full lg:col-span-3 overflow-y-auto">
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
                <Link prefetch href="/sign-up">
                  Sign up
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-medium">
              Welcome back to Toolbay.
            </h1>
            
            {/* Registration Success Notice */}
            {registered && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-blue-800">Registration Successful!</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Please check your email inbox and click the verification link to activate your account. Once verified, you can log in here.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Email Verification Notice */}
            {unverifiedEmail && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-yellow-800">Email Verification Required</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      Please verify your email address before logging in. Check your inbox for the verification link.
                    </p>
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={resendVerification.isPending}
                        onClick={() => resendVerification.mutate({ email: unverifiedEmail })}
                        className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
                      >
                        {resendVerification.isPending ? "Sending..." : "Resend Verification Email"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Email or Username</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="email@example.com or Username" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-base">Password</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-gray-600 hover:text-black underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} type={showPassword ? "text" : "password"} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-base font-normal cursor-pointer">
                      Keep me signed in
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            <Button
              disabled={login.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary touch-manipulation"
              style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            >
              {login.isPending ? "Logging in..." : "Log in"}
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
};

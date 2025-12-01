"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const login = useMutation(trpc.auth.login.mutationOptions({
    onError: (error) => {
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
                  Toolboxx
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
              Welcome back to Toolboxx.
            </h1>
            <FormField
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Email</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Password</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
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

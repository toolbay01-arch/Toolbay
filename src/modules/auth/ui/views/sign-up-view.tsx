"use client";

import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { Poppins } from "next/font/google";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { registerSchema } from "../../schemas";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

export const SignUpView = () => {
  const router = useRouter();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const register = useMutation(trpc.auth.register.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      // Ensure server-side content is refreshed after registering
      router.push("/");
      router.refresh();
    },
  }));

  const form = useForm<z.infer<typeof registerSchema>>({
    mode: "all",
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
      tinNumber: "",
      storeManagerId: "",
      paymentMethod: "bank_transfer" as const,
      bankName: "",
      bankAccountNumber: "",
      momoPayCode: "",
    },
  });

  const onSubmit = (values: z.infer<typeof registerSchema>) => {
    register.mutate(values)
  }

  const username = form.watch("username");
  const usernameErrors = form.formState.errors.username;

  const showPreview = username && !usernameErrors;

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
                <Link prefetch href="/sign-in">
                  Sign in
                </Link>
              </Button>
            </div>
            <h1 className="text-4xl font-medium">
              Join over 1,580 construction suppliers earning money on Toolboxx.
            </h1>
            <FormField
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription
                    className={cn("hidden", showPreview && "block")}
                  >
                    Your store will be available at&nbsp;
                    {/* TODO: Use proper method to generate preview url */}
                    <strong>{username}</strong>.shop.com
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            
            {/* Rwanda-specific fields */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-medium mb-4">Business Information</h2>
              
              <FormField
                name="tinNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">TIN Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tax Identification Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                name="storeManagerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Store Manager ID/Passport *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ID or Passport Number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment method selection */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-medium mb-4">Payment Information</h2>
              
              <FormField
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Payment Method *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="momo_pay">Mobile Money (MOMO)</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("paymentMethod") === "bank_transfer" && (
                <>
                  <FormField
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Bank Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Bank of Kigali" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    name="bankAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Bank Account Number *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Your bank account number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {form.watch("paymentMethod") === "momo_pay" && (
                <FormField
                  name="momoPayCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">MOMO Pay Code *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Your Mobile Money code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
              <p className="text-sm text-yellow-800">
                <strong>Next Steps:</strong> After creating your account, you&apos;ll need to upload your RDB Registration Certificate and other documents for verification. Only verified stores can start supplying construction materials.
              </p>
            </div>

            <Button
              disabled={register.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary"
            >
              Create account
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

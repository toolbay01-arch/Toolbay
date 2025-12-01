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

import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, ShoppingBag } from "lucide-react";

import { registerSchema } from "../../schemas";
import { registerClientSchema } from "../../schemas-client";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["700"],
});

type AccountType = "client" | "tenant";

export const SignUpView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [accountType, setAccountType] = useState<AccountType | null>(null);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Tenant (seller) registration
  const registerTenant = useMutation(trpc.auth.register.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async (data) => {
      toast.success("Account created successfully!");
      
      // Immediately update the session cache with the logged-in user
      if (data?.user) {
        queryClient.setQueryData(
          trpc.auth.session.queryKey(),
          { user: data.user, permissions: {} }
        );
      }
      
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      
      // Small delay to ensure cache is updated
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate to the redirect URL if provided, otherwise go to homepage
      const redirectUrl = redirect || "/";
      router.push(redirectUrl);
      router.refresh();
    },
  }));

  // Client (buyer) registration
  const registerClient = useMutation(trpc.auth.registerClient.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async (data) => {
      toast.success("Account created successfully!");
      
      // Immediately update the session cache with the logged-in user
      if (data?.user) {
        queryClient.setQueryData(
          trpc.auth.session.queryKey(),
          { user: data.user, permissions: {} }
        );
      }
      
      // Also invalidate to ensure fresh data
      await queryClient.invalidateQueries(trpc.auth.session.queryFilter());
      
      // Small delay to ensure cache is updated
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Navigate to the redirect URL if provided, otherwise go to homepage
      const redirectUrl = redirect || "/";
      router.push(redirectUrl);
      router.refresh();
    },
  }));

  // Tenant form
  const tenantForm = useForm<z.infer<typeof registerSchema>>({
    mode: "all",
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
      tinNumber: "",
      storeManagerId: "",
      category: "retailer" as const,
      location: "",
      paymentMethod: "bank_transfer" as const,
      bankName: "",
      bankAccountNumber: "",
      momoPayCode: "",
    },
  });

  // Client form
  const clientForm = useForm<z.infer<typeof registerClientSchema>>({
    mode: "all",
    resolver: zodResolver(registerClientSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const onTenantSubmit = (values: z.infer<typeof registerSchema>) => {
    registerTenant.mutate(values);
  };

  const onClientSubmit = (values: z.infer<typeof registerClientSchema>) => {
    registerClient.mutate(values);
  };

  // Account type selection view
  if (!accountType) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 overflow-y-auto">
          <div className="flex flex-col gap-8 p-4 lg:p-16">
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

            <div className="max-w-2xl mx-auto w-full">
              <h1 className="text-2xl md:text-4xl font-medium mb-2 md:mb-4">
                Join Toolboxx
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground mb-6 md:mb-12">
                Choose how you want to use our platform
              </p>

              <div className="grid gap-4 md:gap-6 md:grid-cols-2">
                {/* Client (Buyer) Card */}
                <Card 
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-lg"
                  onClick={() => setAccountType("client")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-100 shrink-0">
                        <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                      </div>
                      <CardTitle className="text-xl md:text-2xl">I want to buy</CardTitle>
                    </div>
                    <CardDescription className="text-sm md:text-base hidden md:block">
                      Browse and purchase construction materials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Quick registration</span>
                      </li>
                      <li className="flex items-start gap-2 hidden md:flex">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Browse thousands of products</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Track your orders</span>
                      </li>
                      <li className="flex items-start gap-2 hidden md:flex">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>No business verification needed</span>
                      </li>
                    </ul>
                    <Button className="w-full mt-4 md:mt-6" size="lg">
                      Continue as Buyer
                    </Button>
                  </CardContent>
                </Card>

                {/* Tenant (Seller) Card */}
                <Card 
                  className="cursor-pointer hover:border-primary transition-all hover:shadow-lg border-2"
                  onClick={() => setAccountType("tenant")}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-pink-100 shrink-0">
                        <Store className="h-6 w-6 md:h-8 md:w-8 text-pink-600" />
                      </div>
                      <CardTitle className="text-xl md:text-2xl">I want to sell</CardTitle>
                    </div>
                    <CardDescription className="text-sm md:text-base hidden md:block">
                      Start supplying construction materials
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Get your own store</span>
                      </li>
                      <li className="flex items-start gap-2 hidden md:flex">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Manage products and inventory</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Track sales and revenue</span>
                      </li>
                      <li className="flex items-start gap-2 hidden md:flex">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>Requires business verification (TIN, RDB)</span>
                      </li>
                    </ul>
                    <Button className="w-full mt-4 md:mt-6" size="lg" variant="default">
                      Start Supplying
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-8">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-primary hover:underline font-medium">
                  Sign in here
                </Link>
              </p>
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

  // Client (Buyer) Registration Form
  if (accountType === "client") {
    const username = clientForm.watch("username");
    const usernameErrors = clientForm.formState.errors.username;
    const showPreview = username && !usernameErrors;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 overflow-y-auto">
          <Form {...clientForm}>
            <form
              onSubmit={clientForm.handleSubmit(onClientSubmit)}
              className="flex flex-col gap-8 p-4 lg:p-16"
            >
              <div className="flex items-center justify-between mb-8">
                <Link href="/">
                  <span className={cn("text-2xl font-semibold", poppins.className)}>
                    Toolboxx
                  </span>
                </Link>
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAccountType(null)}
                    className="text-base"
                  >
                    ← Back
                  </Button>
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
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-medium">Create Buyer Account</h1>
                  <p className="text-muted-foreground">Quick and easy - start shopping today</p>
                </div>
              </div>

              <FormField
                name="username"
                control={clientForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Username</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="johndoe" />
                    </FormControl>
                    <FormDescription
                      className={cn("hidden", showPreview && "block")}
                    >
                      Your username: <strong>{username}</strong>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="email"
                control={clientForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="john@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="password"
                control={clientForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="••••••••" />
                    </FormControl>
                    <FormDescription>
                      Must be at least 6 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="border-t pt-6">
                <h2 className="text-xl font-medium mb-4">Additional Information (Optional)</h2>

                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                    name="firstName"
                    control={clientForm.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">First Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="lastName"
                    control={clientForm.control}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Doe" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  name="phone"
                  control={clientForm.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+250 XXX XXX XXX" />
                      </FormControl>
                      <FormDescription>
                        Rwanda phone number format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                disabled={registerClient.isPending}
                type="submit"
                size="lg"
                variant="elevated"
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                {registerClient.isPending ? "Creating account..." : "Create Buyer Account"}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Want to sell instead?{" "}
                <button
                  type="button"
                  onClick={() => setAccountType("tenant")}
                  className="text-primary hover:underline font-medium"
                >
                  Register as a seller
                </button>
              </p>
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

  // Tenant (Seller) Registration Form
  const username = tenantForm.watch("username");
  const usernameErrors = tenantForm.formState.errors.username;
  const showPreview = username && !usernameErrors;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5">
      <div className="bg-[#F4F4F0] min-h-screen w-full lg:col-span-3 overflow-y-auto">
        <Form {...tenantForm}>
          <form
            onSubmit={tenantForm.handleSubmit(onTenantSubmit)}
            className="flex flex-col gap-8 p-4 lg:p-16"
          >
            <div className="flex items-center justify-between mb-8">
              <Link href="/">
                <span className={cn("text-2xl font-semibold", poppins.className)}>
                  Toolboxx
                </span>
              </Link>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAccountType(null)}
                  className="text-base"
                >
                  ← Back
                </Button>
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
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-100">
                <Store className="h-6 w-6 text-pink-600" />
              </div>
              <div>
                <h1 className="text-3xl font-medium">Start Supplying on Toolboxx</h1>
                <p className="text-muted-foreground">Join over 1,580 construction suppliers</p>
              </div>
            </div>
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
                name="category"
                control={tenantForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Business Category *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your business category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="retailer">Retailer</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="industry">Industry</SelectItem>
                        <SelectItem value="renter">Renter</SelectItem>
                        <SelectItem value="logistics">Logistics</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Business Location *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Kigali, Nyarugenge District" />
                    </FormControl>
                    <FormDescription>
                      Enter your business address or location
                    </FormDescription>
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

              {tenantForm.watch("paymentMethod") === "bank_transfer" && (
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

              {tenantForm.watch("paymentMethod") === "momo_pay" && (
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
              disabled={registerTenant.isPending}
              type="submit"
              size="lg"
              variant="elevated"
              className="bg-black text-white hover:bg-pink-400 hover:text-primary"
            >
              {registerTenant.isPending ? "Creating account..." : "Create Seller Account"}
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Just want to buy?{" "}
              <button
                type="button"
                onClick={() => setAccountType("client")}
                className="text-primary hover:underline font-medium"
              >
                Register as a buyer
              </button>
            </p>
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

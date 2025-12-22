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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Store, ShoppingBag, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>("");

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Tenant (seller) registration
  const registerTenant = useMutation(trpc.auth.register.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async (data) => {
      // Store the registered email and show success dialog
      setRegisteredEmail(data.user.email);
      setShowSuccessDialog(true);
    },
  }));

  // Client (buyer) registration
  const registerClient = useMutation(trpc.auth.registerClient.mutationOptions({
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: async (data) => {
      // Store the registered email and show success dialog
      setRegisteredEmail(data.user.email);
      setShowSuccessDialog(true);
    },
  }));

  // Tenant form
  const tenantForm = useForm<z.infer<typeof registerSchema>>({
    mode: "all",
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      storeName: "",
      // TIN and Store Manager ID removed - will be added by super admin during verification
      category: "retailer" as const,
      location: "",
      contactPhone: "",
      currency: "RWF" as const,
      paymentMethod: "bank_transfer" as const,
      bankName: "",
      bankAccountNumber: "",
        momoCode: "",
      momoProviderName: "",
      momoAccountName: "",
    },
  });

  // Client form
  const clientForm = useForm<z.infer<typeof registerClientSchema>>({
    mode: "all",
    resolver: zodResolver(registerClientSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
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
                  Sign in
                </Link>
              </Button>
            </div>

            <div className="max-w-2xl mx-auto w-full">
              <h1 className="text-2xl md:text-4xl font-medium mb-2 md:mb-4">
                Join Toolbay
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
                        <span>Requires business verification</span>
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
                    Toolbay
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
                control={clientForm.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Confirm Password</FormLabel>
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
                      Re-enter your password
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
  const storeName = tenantForm.watch("storeName");
  const storeNameErrors = tenantForm.formState.errors.storeName;
  
  // Generate slug preview from store name
  const generateSlugPreview = (name: string): string => {
    if (!name) return "";
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };
  
  const slugPreview = generateSlugPreview(storeName || "");
  const showPreview = storeName && !storeNameErrors && slugPreview;

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
                  Toolbay
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
                <h1 className="text-3xl font-medium">Start Supplying on Toolbay</h1>
                <p className="text-muted-foreground">Join over 1,580 construction suppliers</p>
              </div>
            </div>
            <FormField
              name="storeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Store Name *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., My Company Ltd" />
                  </FormControl>
                  <FormDescription
                    className={cn("hidden", showPreview && "block")}
                  >
                    Your store will be available at:&nbsp;
                    <strong>{slugPreview}.toolbay.store</strong>
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
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input {...field} type={showConfirmPassword ? "text" : "password"} />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Rwanda-specific fields */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-medium mb-4">Business Information</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Note: TIN Number and Store Manager ID will be added by our team during verification
              </p>
              
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

              <FormField
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Contact Phone Number *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+250788888888" />
                    </FormControl>
                    <FormDescription>
                      Phone number with country code for customer contact
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Currency *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "RWF"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                        <SelectItem value="RWF">Rwandan Franc (RWF)</SelectItem>
                        <SelectItem value="UGX">Ugandan Shilling (UGX)</SelectItem>
                        <SelectItem value="TZS">Tanzanian Shilling (TZS)</SelectItem>
                        <SelectItem value="BIF">Burundian Franc (BIF)</SelectItem>
                        <SelectItem value="KSH">Kenyan Shilling (KSH)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      All prices in your store will be in this currency
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
                          <Input {...field} placeholder="e.g., Bank Name" />
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
                <>
                  <FormField
                    name="momoProviderName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Mobile Money Provider *</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="w-full p-3 border border-gray-300 rounded-md"
                          >
                            <option value="">Select provider</option>
                            <option value="MTN Mobile Money">MTN Mobile Money</option>
                            <option value="Airtel Money">Airtel Money</option>
                          </select>
                        </FormControl>
                        <FormDescription>
                          Select your mobile money service provider
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    name="momoAccountName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Account Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Name registered with your MoMo account" />
                        </FormControl>
                        <FormDescription>
                          The name associated with your mobile money account
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <FormField
                      name="momoCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">MOMO Code *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 828822" type="number" />
                          </FormControl>
                          <FormDescription>
                            Your mobile money code (digits) for receiving payments
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </>
              )}
            </div>

            {/* <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-6">
              <p className="text-sm text-yellow-800">
                <strong>Next Steps:</strong> After creating your account, you may  need to upload your RDB Registration Certificate and other documents for verification. Only verified stores can start supplying construction materials.
              </p>
            </div> */}

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
      
      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center text-xl">
              Account Created Successfully!
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{registeredEmail}</span>
                </div>
                <p className="text-base">
                  We&apos;ve sent a verification email to your inbox. Please click the verification link to activate your account.
                </p>
                <p className="text-sm text-muted-foreground">
                  Once verified, you&apos;ll be able to log in and access all features.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                router.push("/sign-in?registered=true");
                router.refresh();
              }}
              className="w-full sm:w-auto"
            >
              Okay, Got It!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

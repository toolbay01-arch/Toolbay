import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email or company name is required"), // Can be email or slug
  password: z.string(),
  rememberMe: z.boolean().optional().default(true), // Default to true for persistent sessions
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  confirmPassword: z.string().min(3),
  storeName: z
    .string()
    .min(3, "Store name must be at least 3 characters")
    .max(100, "Store name must be less than 100 characters"),
  // Rwanda-specific fields - TIN and Store Manager ID are now optional (added by super admin during verification)
  category: z.enum(["retailer", "wholesale", "industry", "renter", "logistics"]),
  location: z.string().min(5, "Location must be at least 5 characters"),
  contactPhone: z
    .string()
    .min(1, "Contact phone number is required")
    .regex(/^\+\d{10,15}$/, "Phone number must start with + and contain 10-15 digits (e.g., +250788888888)"),
  currency: z.enum(["USD", "RWF", "UGX", "TZS", "BIF", "KSH"], {
    required_error: "Please select a currency",
  }),
  paymentMethod: z.enum(["bank_transfer", "momo_pay"]),
  // Conditional fields based on payment method
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  // MoMo inputs: provider name, account name, and numeric code (entered as string in the form)
  momoProviderName: z.string().optional(), // e.g., "MTN Mobile Money", "Airtel Money"
  momoAccountName: z.string().optional(), // Name associated with the MoMo code
  momoCode: z.string().optional(), // Will be converted to number on the server
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.paymentMethod === "bank_transfer") {
    return data.bankName && data.bankAccountNumber;
  }
  if (data.paymentMethod === "momo_pay") {
    return data.momoCode && data.momoProviderName && data.momoAccountName;
  }
  return true;
}, {
  message: "Payment method details are required",
  path: ["paymentMethod"],
});

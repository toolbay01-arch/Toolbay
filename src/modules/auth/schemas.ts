import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(63, "Username must be less than 63 characters")
    .regex(
      /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
      "Username can only contain lowercase letters, numbers and hyphens. It must start and end with a letter or number"
    )
    .refine(
      (val) => !val.includes("--"),
      "Username cannot contain consecutive hyphens"
    )
    .transform((val) => val.toLowerCase()),
  // Rwanda-specific fields
  tinNumber: z.string().min(9, "TIN Number must be at least 9 characters"),
  storeManagerId: z.string().min(5, "Store Manager ID/Passport must be at least 5 characters"),
  category: z.enum(["retailer", "wholesale", "industry", "renter", "logistics"]),
  location: z.string().min(5, "Location must be at least 5 characters"),
  paymentMethod: z.enum(["bank_transfer", "momo_pay"]),
  // Conditional fields based on payment method
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  momoPayCode: z.string().optional(),
}).refine((data) => {
  if (data.paymentMethod === "bank_transfer") {
    return data.bankName && data.bankAccountNumber;
  }
  if (data.paymentMethod === "momo_pay") {
    return data.momoPayCode;
  }
  return true;
}, {
  message: "Payment method details are required",
  path: ["paymentMethod"],
});

import { z } from "zod";

export const uploadDocumentsSchema = z.object({
  rdbCertificate: z.instanceof(File, { message: "RDB Certificate is required" }),
});

export const verifyTenantSchema = z.object({
  tenantId: z.string(),
  verificationStatus: z.enum(["document_verified", "physically_verified", "rejected"]),
  verificationNotes: z.string().optional(),
  canAddMerchants: z.boolean().optional(),
});

export const physicalVerificationSchema = z.object({
  tenantId: z.string(),
  verificationImages: z.array(z.instanceof(File)).min(3).max(8),
  signedConsent: z.instanceof(File),
  verificationNotes: z.string().optional(),
});

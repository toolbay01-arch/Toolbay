import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateTenantURL(tenantSlug: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const isSubdomainRoutingEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";

  // In development or subdomain routing disabled mode, use normal routing
  if (isDevelopment || !isSubdomainRoutingEnabled) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/tenants/${tenantSlug}`;
  }

  const protocol = "https";
  const domain = process.env.NEXT_PUBLIC_ROOT_DOMAIN!;

  // In production, use subdomain routing
  return `${protocol}://${tenantSlug}.${domain}`;
};

export function formatCurrency(value: number | string) {
  const num = Number(value);
  if (isNaN(num)) return "RWF 0";
  
  // Use a simple format that's consistent between server and client
  return `RWF ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

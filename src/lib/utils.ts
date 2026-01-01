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

/**
 * Generate a tenant-specific path
 * When subdomain routing is enabled, returns just the path (e.g., /products/123)
 * When subdomain routing is disabled, returns the full tenant path (e.g., /tenants/store-2/products/123)
 */
export function generateTenantPath(tenantSlug: string, path: string) {
  const isSubdomainRoutingEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";
  
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // In subdomain routing mode, just return the path
  if (isSubdomainRoutingEnabled) {
    return cleanPath;
  }
  
  // Otherwise, include the tenant slug in the path
  return `/tenants/${tenantSlug}${cleanPath}`;
}

/**
 * Generate a full URL for a tenant-specific resource
 * Combines generateTenantURL and generateTenantPath
 */
export function generateTenantResourceURL(tenantSlug: string, path: string) {
  const baseURL = generateTenantURL(tenantSlug);
  const isSubdomainRoutingEnabled = process.env.NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING === "true";
  
  // Remove leading slash from path if present
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // In subdomain routing mode, the base URL already points to the tenant subdomain
  // so we just append the path
  if (isSubdomainRoutingEnabled) {
    return `${baseURL}${cleanPath}`;
  }
  
  // Otherwise, the path already includes /tenants/[slug]
  return `${baseURL}${cleanPath}`;
}

export function formatCurrency(value: number | string) {
  const num = Number(value);
  if (isNaN(num)) return "RWF 0";
  
  // Use a simple format that's consistent between server and client
  return `RWF ${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
};

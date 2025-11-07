"use client";

import Link from "next/link";
import { usePrefetchOnHover } from "./prefetch-on-hover";
import type { ComponentProps } from "react";

/**
 * Optimized Link component that prefetches routes on hover
 * Drop-in replacement for Next.js Link to improve navigation performance
 */
export function OptimizedLink({
  href,
  prefetch = true,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const hrefString = typeof href === 'string' ? href : href.pathname ?? undefined;
  const { handleMouseEnter, handleMouseLeave } = usePrefetchOnHover(
    prefetch ? hrefString : undefined
  );

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </Link>
  );
}

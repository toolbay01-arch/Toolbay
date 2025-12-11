"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * Custom hook to track product views
 * - Tracks total views on every page load
 * - Tracks unique views once per session
 * - Uses sessionStorage to prevent duplicate unique views
 * 
 * @param productId - The ID of the product to track
 */
export const useTrackProductView = (productId: string) => {
  const trpc = useTRPC();
  const hasTracked = useRef(false);
  const trackView = useMutation(trpc.products.trackView.mutationOptions());

  useEffect(() => {
    // Prevent tracking on SSR and prevent duplicate tracking
    if (typeof window === 'undefined' || !productId || hasTracked.current) {
      return;
    }

    // Mark as tracked for this component mount
    hasTracked.current = true;

    // Check if this product was viewed in this session
    const viewedKey = `viewed_product_${productId}`;
    const hasViewedInSession = sessionStorage.getItem(viewedKey);
    
    // Track the view
    trackView.mutate({
      productId,
      isUnique: !hasViewedInSession, // Mark as unique if not viewed in this session
    });
    
    // Mark as viewed in this session
    if (!hasViewedInSession) {
      sessionStorage.setItem(viewedKey, "true");
    }
  }, [productId]);

  return {
    isTracking: trackView.isPending,
  };
};

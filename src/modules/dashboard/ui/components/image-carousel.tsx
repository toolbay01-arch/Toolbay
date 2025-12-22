"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface ImageCarouselProps {
  images: Array<{ url: string; alt: string }>;
  className?: string;
  sizes?: string;
  loading?: "lazy" | "eager";
  priority?: boolean;
  quality?: number;
}

export const ImageCarousel = ({
  images,
  className = "",
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  loading = "lazy",
  priority = false,
  quality = 75,
}: ImageCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [loadingImages, setLoadingImages] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Preload adjacent images
  useEffect(() => {
    const preloadImage = (index: number) => {
      if (index < 0 || index >= images.length || loadedImages.has(index)) return;
      
      setLoadingImages(prev => new Set(prev).add(index));
      
      const img = new window.Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(index));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      };
      img.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      };
      img.src = images[index]?.url || "";
    };

    // Preload current, next, and previous images
    preloadImage(currentIndex);
    preloadImage((currentIndex + 1) % images.length);
    preloadImage((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images, loadedImages]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection('next');
    // Disable animation temporarily, reset offset, change index
    setShouldAnimate(false);
    setSwipeOffset(0);
    setCurrentIndex((prev) => (prev + 1) % images.length);
    // Re-enable animation on next frame
    requestAnimationFrame(() => setShouldAnimate(true));
  }, [images.length, isTransitioning]);

  const goToPrevious = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection('prev');
    // Disable animation temporarily, reset offset, change index
    setShouldAnimate(false);
    setSwipeOffset(0);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    // Re-enable animation on next frame
    requestAnimationFrame(() => setShouldAnimate(true));
  }, [images.length, isTransitioning]);

  // Reset transition state after animation completes
  useEffect(() => {
    if (direction && isTransitioning) {
      const timer = setTimeout(() => {
        setDirection(null);
        setIsTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, direction, isTransitioning]);

  // Handle button clicks with smooth animation like swipe
  const handleNextClick = useCallback(() => {
    if (isTransitioning) return;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    setShouldAnimate(true);
    setSwipeOffset(-containerWidth);
    setTimeout(() => {
      goToNext();
    }, 300);
  }, [isTransitioning, goToNext]);

  const handlePreviousClick = useCallback(() => {
    if (isTransitioning) return;
    const containerWidth = containerRef.current?.offsetWidth || 0;
    setShouldAnimate(true);
    setSwipeOffset(containerWidth);
    setTimeout(() => {
      goToPrevious();
    }, 300);
  }, [isTransitioning, goToPrevious]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setSwipeOffset(0);
    setIsSwiping(true);
    const touch = e.targetTouches[0];
    if (touch) setTouchStart(touch.clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchEnd(touch.clientX);
      
      // Calculate swipe offset for visual feedback
      if (touchStart !== null && containerRef.current) {
        const offset = touch.clientX - touchStart;
        // Show the full sliding effect without limits during swipe
        setSwipeOffset(offset);
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    setIsSwiping(false);
    
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      // Only prevent navigation if user actually swiped
      e.preventDefault();
      e.stopPropagation();
      
      if (isLeftSwipe) {
        // Animate swipe to completion, then change index
        const containerWidth = containerRef.current?.offsetWidth || 0;
        setSwipeOffset(-containerWidth);
        setTimeout(() => {
          goToNext();
        }, 300); // Wait for animation to complete
      } else if (isRightSwipe) {
        // Animate swipe to completion, then change index
        const containerWidth = containerRef.current?.offsetWidth || 0;
        setSwipeOffset(containerWidth);
        setTimeout(() => {
          goToPrevious();
        }, 300); // Wait for animation to complete
      }
    } else {
      // Snap back if swipe was too short
      setSwipeOffset(0);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePreviousClick();
      if (e.key === "ArrowRight") handleNextClick();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextClick, handlePreviousClick]);

  // If only one image, render without carousel controls
  if (images.length <= 1) {
    return (
      <div className={`relative ${className}`}>
        <Image
          alt={images[0]?.alt || "Product image"}
          fill
          src={images[0]?.url || "/placeholder.png"}
          className="object-cover"
          sizes={sizes}
          loading={loading}
          quality={quality}
          priority={priority}
        />
      </div>
    );
  }

  const isCurrentImageLoaded = loadedImages.has(currentIndex);
  const isCurrentImageLoading = loadingImages.has(currentIndex);

  // Calculate which images to show during swipe
  const getAdjacentIndex = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      return (currentIndex + 1) % images.length;
    } else {
      return (currentIndex - 1 + images.length) % images.length;
    }
  };

  const nextIndex = getAdjacentIndex('next');
  const prevIndex = getAdjacentIndex('prev');
  const isPrevImageLoaded = loadedImages.has(prevIndex);
  const isNextImageLoaded = loadedImages.has(nextIndex);

  return (
    <div
      ref={containerRef}
      className={`relative group ${className} overflow-hidden`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Images Container - All images move together */}
      <div 
        className={`relative flex w-full h-full ${
          shouldAnimate && !isSwiping ? 'transition-transform duration-300 ease-out' : ''
        }`}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
        }}
      >
        {/* Previous Image (positioned to the left) */}
        <div 
          className="absolute inset-0 w-full h-full flex-shrink-0"
          style={{ 
            left: '-100%',
          }}
        >
          <Image
            alt={images[prevIndex]?.alt || "Product image"}
            fill
            src={images[prevIndex]?.url || "/placeholder.png"}
            className={`object-cover ${
              isPrevImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes={sizes}
            loading="eager"
            quality={quality}
          />
          {/* Loading spinner for previous image */}
          {!isPrevImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
            </div>
          )}
        </div>

        {/* Current Image (center position) */}
        <div className="absolute inset-0 w-full h-full flex-shrink-0">
          <Image
            alt={images[currentIndex]?.alt || "Product image"}
            fill
            src={images[currentIndex]?.url || "/placeholder.png"}
            className={`object-cover transition-opacity duration-300 ${
              isCurrentImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes={sizes}
            loading={loading}
            quality={quality}
            priority={priority || currentIndex === 0}
            onLoad={() => {
              setLoadedImages(prev => new Set(prev).add(currentIndex));
              setLoadingImages(prev => {
                const newSet = new Set(prev);
                newSet.delete(currentIndex);
                return newSet;
              });
            }}
          />
        </div>

        {/* Next Image (positioned to the right) */}
        <div 
          className="absolute inset-0 w-full h-full flex-shrink-0"
          style={{ 
            left: '100%',
          }}
        >
          <Image
            alt={images[nextIndex]?.alt || "Product image"}
            fill
            src={images[nextIndex]?.url || "/placeholder.png"}
            className={`object-cover ${
              isNextImageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes={sizes}
            loading="eager"
            quality={quality}
          />
          {/* Loading spinner for next image */}
          {!isNextImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Loading Spinner for current image */}
      {(isCurrentImageLoading || !isCurrentImageLoaded) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-20">
          <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
        </div>
      )}

      {/* Navigation Arrows - Desktop */}
      <>
        {/* Previous Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handlePreviousClick();
          }}
          disabled={isTransitioning}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
          aria-label="Previous image"
          type="button"
        >
          <ChevronLeft className="w-5 h-5 text-gray-800" />
        </button>

        {/* Next Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleNextClick();
          }}
          disabled={isTransitioning}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed z-10"
          aria-label="Next image"
          type="button"
        >
          <ChevronRight className="w-5 h-5 text-gray-800" />
        </button>
      </>

      {/* Image Counter Dots */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isTransitioning && index !== currentIndex) {
                const containerWidth = containerRef.current?.offsetWidth || 0;
                setShouldAnimate(true);
                
                // Determine direction and animate
                if (index > currentIndex) {
                  // Going forward
                  setSwipeOffset(-containerWidth);
                  setTimeout(() => {
                    setIsTransitioning(true);
                    setDirection('next');
                    setShouldAnimate(false);
                    setSwipeOffset(0);
                    setCurrentIndex(index);
                    requestAnimationFrame(() => setShouldAnimate(true));
                    setTimeout(() => {
                      setDirection(null);
                      setIsTransitioning(false);
                    }, 300);
                  }, 300);
                } else {
                  // Going backward
                  setSwipeOffset(containerWidth);
                  setTimeout(() => {
                    setIsTransitioning(true);
                    setDirection('prev');
                    setShouldAnimate(false);
                    setSwipeOffset(0);
                    setCurrentIndex(index);
                    requestAnimationFrame(() => setShouldAnimate(true));
                    setTimeout(() => {
                      setDirection(null);
                      setIsTransitioning(false);
                    }, 300);
                  }, 300);
                }
              }
            }}
            disabled={isTransitioning}
            className={`w-1.5 h-1.5 rounded-full transition-all disabled:cursor-not-allowed ${
              index === currentIndex
                ? "bg-white w-4"
                : "bg-white/60 hover:bg-white/80"
            }`}
            aria-label={`Go to image ${index + 1}`}
            type="button"
          />
        ))}
      </div>
    </div>
  );
};

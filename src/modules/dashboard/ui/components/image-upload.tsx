"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, FileVideo, Plus } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

// Type guard to ensure we're in browser environment
const isBrowser = typeof window !== 'undefined';

interface ImageUploadProps {
  value: string[]; // Array of media IDs
  onChange: (value: string[]) => void;
  maxImages?: number;
  maxVideoSize?: number; // in MB
}

interface UploadedFile {
  id: string;
  url: string;
  alt: string;
  fileType: "image" | "video";
}

interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export const ImageUpload = ({
  value = [],
  onChange,
  maxImages = 24,
  maxVideoSize = 60, // 60MB for 1-minute video
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded files from media IDs
  const loadUploadedFiles = useCallback(async () => {
    if (value.length === 0) {
      setUploadedFiles([]);
      return;
    }

    // Validate that all values are strings (media IDs)
    const validIds = value.filter(id => typeof id === 'string' && id.length > 0);
    if (validIds.length === 0) {
      console.warn('[ImageUpload] No valid media IDs to load');
      setUploadedFiles([]);
      return;
    }

    if (validIds.length !== value.length) {
      console.warn('[ImageUpload] Some invalid media IDs filtered out:', 
        value.filter(id => !validIds.includes(id))
      );
    }

    try {
      // Add cache busting and proper cache control headers
      // Use relative URL to work in both localhost and production
      const response = await fetch(
        `/api/media?ids=${validIds.join(",")}&t=${Date.now()}`, // Cache buster
        {
          cache: 'no-store', // Disable browser cache
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        }
      );
      
      if (!response.ok) {
        console.error('[ImageUpload] Failed to fetch media:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[ImageUpload] Error response:', errorText);
        throw new Error(`Failed to fetch media: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.docs) {
        const files = data.docs.map((doc: any) => ({
          id: doc.id,
          url: doc.url,
          alt: doc.alt || "",
          fileType: doc.mimeType?.startsWith("video/") ? "video" : "image",
        }));
        
        // Update state - sort files to match the order of value array
        const sortedFiles = value
          .map(id => files.find((f: any) => f.id === id))
          .filter(Boolean); // Remove any undefined (shouldn't happen)
        
        // Verify we got all expected files
        if (sortedFiles.length === value.length) {
          setUploadedFiles(sortedFiles as UploadedFile[]);
        } else {
          console.warn('[ImageUpload] Missing files in response. Expected:', value.length, 'Got:', sortedFiles.length);
          // Still update with what we got - better than showing nothing
          setUploadedFiles(sortedFiles as UploadedFile[]);
        }
      }
    } catch (error) {
      console.error("Failed to load uploaded files:", error);
    }
  }, [value]);

  // Resize image to max dimensions while maintaining aspect ratio
  // Only optimizes if image is large enough to benefit from it
  const resizeImage = async (file: File, maxWidth = 1920, maxHeight = 1920, quality = 0.9): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new window.Image();
        
        img.onload = () => {
          // Get original dimensions
          const originalWidth = img.width;
          const originalHeight = img.height;
          
          // Calculate new dimensions
          let width = originalWidth;
          let height = originalHeight;
          let needsResize = false;
          
          if (width > maxWidth || height > maxHeight) {
            needsResize = true;
            const aspectRatio = width / height;
            
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // If image doesn't need resizing and file is already small, return original
          if (!needsResize && file.size < 500 * 1024) {
            console.log(`Image is already optimized (${(file.size / 1024).toFixed(0)}KB, ${originalWidth}x${originalHeight}), skipping compression`);
            resolve(file);
            return;
          }
          
          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Determine quality based on file size
          let finalQuality = quality;
          const fileSizeKB = file.size / 1024;
          
          if (fileSizeKB < 200) {
            // Small files: use high quality to preserve detail
            finalQuality = 0.95;
          } else if (fileSizeKB < 500) {
            // Medium files: use good quality
            finalQuality = 0.9;
          } else if (fileSizeKB < 2000) {
            // Large files: balance quality and size
            finalQuality = 0.85;
          } else {
            // Very large files: prioritize size reduction
            finalQuality = 0.8;
          }
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }
              
              // Create new file from blob
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              
              console.log(`Image optimized: ${(file.size / 1024).toFixed(0)}KB → ${(resizedFile.size / 1024).toFixed(0)}KB (${originalWidth}x${originalHeight} → ${Math.round(width)}x${Math.round(height)})`);
              resolve(resizedFile);
            },
            file.type,
            finalQuality
          );
        };
        
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Upload a single file with progress tracking using XHR
  const uploadSingleFile = (file: File, fileName: string): Promise<string | null> => {
    return new Promise((resolve) => {
      // Validate file before upload
      if (!file || !file.name) {
        toast.error(`Invalid file: ${fileName}`);
        resolve(null);
        return;
      }

      const formData = new FormData();
      formData.append("file", file, file.name); // Explicitly set filename
      formData.append("alt", fileName.replace(/\.[^/.]+$/, "")); // Remove extension

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(prev => 
            prev.map(p => 
              p.fileName === fileName 
                ? { ...p, progress: percentComplete, status: 'uploading' }
                : p
            )
          );
        }
      });

      // Handle completion
      xhr.addEventListener("load", async () => {
        // Accept both 200 (OK) and 201 (Created) as success
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const contentType = xhr.getResponseHeader("content-type");
            
            if (contentType && contentType.includes("application/json")) {
              const data = JSON.parse(xhr.responseText);
              
              // Mark as processing (server-side processing complete)
              setUploadProgress(prev => 
                prev.map(p => 
                  p.fileName === fileName 
                    ? { ...p, progress: 100, status: 'complete' }
                    : p
                )
              );

              toast.success(`${fileName} uploaded successfully`);
              resolve(data.doc.id);
            } else {
              console.error("Non-JSON response from /api/media:", xhr.responseText);
              setUploadProgress(prev => 
                prev.map(p => 
                  p.fileName === fileName 
                    ? { ...p, status: 'error', error: `Upload failed: ${xhr.status}` }
                    : p
                )
              );
              toast.error(`Upload failed: ${xhr.status} ${xhr.statusText}`);
              resolve(null);
            }
          } catch (error) {
            console.error("Upload parse error:", error);
            setUploadProgress(prev => 
              prev.map(p => 
                p.fileName === fileName 
                  ? { ...p, status: 'error', error: 'Failed to parse response' }
                  : p
              )
            );
            toast.error(`Failed to upload ${fileName}`);
            resolve(null);
          }
        } else {
          // Error response - try to parse error message
          let errorMessage = `HTTP ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // Ignore parse errors, use default message
          }
          
          setUploadProgress(prev => 
            prev.map(p => 
              p.fileName === fileName 
                ? { ...p, status: 'error', error: errorMessage }
                : p
            )
          );
          toast.error(`Failed to upload ${fileName}: ${errorMessage}`);
          resolve(null);
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        setUploadProgress(prev => 
          prev.map(p => 
            p.fileName === fileName 
              ? { ...p, status: 'error', error: 'Network error' }
              : p
          )
        );
        toast.error(`Network error uploading ${fileName}`);
        resolve(null);
      });

      xhr.addEventListener("abort", () => {
        setUploadProgress(prev => 
          prev.map(p => 
            p.fileName === fileName 
              ? { ...p, status: 'error', error: 'Upload cancelled' }
              : p
          )
        );
        resolve(null);
      });

      // Send the request
      xhr.open("POST", "/api/media");
      xhr.send(formData);
    });
  };

  // Upload files to Payload CMS
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    const newMediaIds: string[] = [];

    try {
      for (let file of files) {
        // Check file type
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");

        if (!isImage && !isVideo) {
          toast.error(`${file.name} is not a valid image or video file`);
          continue;
        }

        // Check video size
        if (isVideo && file.size > maxVideoSize * 1024 * 1024) {
          toast.error(
            `Video ${file.name} exceeds ${maxVideoSize}MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`
          );
          continue;
        }

        // Check if we're at max capacity
        if (value.length + newMediaIds.length >= maxImages) {
          toast.error(`Maximum ${maxImages} files allowed`);
          break;
        }

        let processedFile = file;
        const originalFileName = file.name;

        // Optimize image before uploading (skip videos and small images)
        if (isImage) {
          const fileSizeKB = file.size / 1024;
          const shouldOptimize = fileSizeKB > 200; // Only optimize files larger than 200KB
          
          if (shouldOptimize) {
            try {
              // Add processing status
              setUploadProgress(prev => [...prev, {
                fileName: originalFileName,
                progress: 0,
                status: 'processing'
              }]);

              const originalSize = file.size;
              processedFile = await resizeImage(file, 1920, 1920, 0.9);
              
              // Only show toast if there was significant reduction
              const reductionPercent = ((originalSize - processedFile.size) / originalSize) * 100;
              if (reductionPercent > 10) {
                toast.info(`${originalFileName} optimized: ${(originalSize / 1024).toFixed(0)}KB → ${(processedFile.size / 1024).toFixed(0)}KB (${reductionPercent.toFixed(0)}% smaller)`);
              }

              // Update to uploading status
              setUploadProgress(prev => 
                prev.map(p => 
                  p.fileName === originalFileName 
                    ? { ...p, status: 'uploading' }
                    : p
                )
              );
            } catch (error) {
              console.error('Image optimization error:', error);
              // If optimization fails, continue with original file
              toast.warning(`Could not optimize ${originalFileName}, uploading original`);
              
              // Add to progress with uploading status
              setUploadProgress(prev => [...prev, {
                fileName: originalFileName,
                progress: 0,
                status: 'uploading'
              }]);
            }
          } else {
            // Small image - skip optimization, upload directly
            console.log(`Skipping optimization for ${originalFileName} (${fileSizeKB.toFixed(0)}KB - already small)`);
            setUploadProgress(prev => [...prev, {
              fileName: originalFileName,
              progress: 0,
              status: 'uploading'
            }]);
          }
        } else {
          // Video - add to progress directly (no client-side compression for videos)
          setUploadProgress(prev => [...prev, {
            fileName: originalFileName,
            progress: 0,
            status: 'uploading'
          }]);
        }

        // Upload with progress tracking
        const mediaId = await uploadSingleFile(processedFile, originalFileName);
        
        if (mediaId) {
          newMediaIds.push(mediaId);
        }
      }

      // Update the value with new media IDs (append to end to maintain grid stability)
      if (newMediaIds.length > 0) {
        const updatedValue = [...value, ...newMediaIds];
        onChange(updatedValue);
      }

      // Clear progress after 2 seconds
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
      
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (mobileInputRef.current) {
      mobileInputRef.current.value = "";
    }
  };

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  // Remove file - deletes from server and updates state
  const handleRemove = async (idToRemove: string) => {
    try {
      // Optimistic update (immediate visual feedback)
      const previousFiles = uploadedFiles;
      const previousValue = value;
      
      setUploadedFiles(prev => prev.filter(file => file.id !== idToRemove));
      
      // Update parent state immediately
      const updatedValue = value.filter((id) => id !== idToRemove);
      onChange(updatedValue);
      
      // Show loading toast
      const loadingToast = toast.loading('Deleting image...');
      
      // Delete from server - use query param only (DELETE requests shouldn't have bodies)
      const response = await fetch(
        `/api/media?id=${encodeURIComponent(idToRemove)}`,
        {
          method: 'DELETE',
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        // Rollback on error
        setUploadedFiles(previousFiles);
        onChange(previousValue);
        throw new Error('Failed to delete media from server');
      }

      // Update toast
      toast.success('Image deleted successfully', { id: loadingToast });
    } catch (error) {
      console.error('Failed to delete media:', error);
      toast.error('Failed to delete image. Please try again.');
    }
  };

  // Load files when value changes
  useEffect(() => {
    loadUploadedFiles();
  }, [value, loadUploadedFiles]);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768; // Also consider screen width
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Create slots array - always show all 24 slots (uploaded + empty)
  const slots = [...uploadedFiles];
  const emptySlots = maxImages - slots.length;
  
  for (let i = 0; i < emptySlots; i++) {
    slots.push(null as any);
  }

  return (
    <div className="space-y-1.5">
      {/* Header section */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Photos & Video</h3>
        <p className="text-sm text-gray-600 mb-1">
          You can add up to 24 photos and a 1-minute video. <strong>The first photo will be your cover image.</strong> Buyers want to see all details and angles.
        </p>
        <a href="#" className="text-sm text-blue-600 hover:underline">
          Tips for taking pro photos
        </a>
      </div>

      {/* Counter (only show when there are images) */}
      {uploadedFiles.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {uploadedFiles.length}/{maxImages}
          </span>
          <button type="button" className="text-sm text-blue-600 hover:underline">
            Select
          </button>
        </div>
      )}

      {/* Show large upload area when no images */}
      {uploadedFiles.length === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center transition-colors
            ${isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"}
            ${isUploading ? "opacity-50 pointer-events-none" : ""}
          `}
        >
          <div className="flex flex-col items-center gap-4">
            {/* Upload icon */}
            <div className="p-4 bg-gray-100 rounded-full">
              <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium text-lg">Drag and drop files</p>
              <p className="text-sm text-gray-500">First image will be your cover photo</p>
              {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
            </div>

            <div className="flex flex-col gap-2 w-full max-w-xs">
              {isMobile ? (
                /* Mobile: Show camera/gallery button */
                <button
                  type="button"
                  onClick={() => mobileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full px-6 py-3 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload from mobile
                </button>
              ) : (
                /* Desktop: Show computer upload button */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full px-6 py-3 border border-gray-300 rounded-full font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload from computer
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Grid layout when images exist - Show all 24 slots with scroll */
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-1.5 bg-white">
          <div className="max-h-[200px] md:max-h-[400px] overflow-y-auto pr-1">
            <div className="grid grid-cols-4 md:grid-cols-6 gap-1">
              {slots.map((file, index) => (
              <div 
                key={file?.id || `empty-${index}`} 
                className={`
                  relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 hover:border-gray-400 transition-colors
                  ${index === 0 
                    ? 'col-span-2 row-span-2 aspect-square md:col-span-2 md:row-span-2' // Cover photo: 2x2 grid (4 slots)
                    : 'col-span-1 row-span-1 aspect-square' // Other photos: 1x1 grid
                  }
                `}
              >
              {file ? (
                <>
                  {/* Uploaded file */}
                  {file.fileType === "image" ? (
                    <Image
                      src={file.url}
                      alt={file.alt}
                      fill
                      className="object-cover"
                      sizes={index === 0 
                        ? "(max-width: 768px) 100vw, 400px" // Larger size for cover
                        : "(max-width: 768px) 50vw, 200px" // Smaller for others
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <FileVideo className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Cover badge for first image */}
                  {index === 0 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full shadow-lg">
                        Cover Photo
                      </span>
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(file.id)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>

                  {/* Video indicator */}
                  {file.fileType === "video" && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                        Video
                      </span>
                    </div>
                  )}
                </>
              ) : (
                /* Empty slot with Add button */
                <button
                  type="button"
                  onClick={() => {
                    if (isMobile) {
                      mobileInputRef.current?.click();
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  disabled={isUploading || uploadedFiles.length >= maxImages}
                  className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className={`p-3 rounded-full ${isDragging ? 'bg-blue-100' : 'bg-gray-200'}`}>
                    <Plus className={`${index === 0 ? 'w-8 h-8' : 'w-6 h-6'} text-gray-600`} />
                  </div>
                  <span className="text-sm text-gray-600">{index === 0 ? 'Add Cover' : 'Add'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      {/* Desktop/Computer file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Mobile file input with camera capture */}
      <input
        ref={mobileInputRef}
        type="file"
        multiple
        accept="image/*,video/*"
        capture="environment" // This enables camera on mobile
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload Progress Indicators */}
      {uploadProgress.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
          {uploadProgress.map((progress, index) => (
            <div
              key={`${progress.fileName}-${index}`}
              className="bg-white rounded-lg shadow-lg border border-gray-200 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Icon based on status */}
                <div className="flex-shrink-0 mt-1">
                  {progress.status === 'processing' && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {progress.status === 'uploading' && (
                    <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  {progress.status === 'complete' && (
                    <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                  {progress.status === 'error' && (
                    <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Progress info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {progress.fileName}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {progress.status === 'processing' && 'Optimizing...'}
                    {progress.status === 'uploading' && `Uploading ${Math.round(progress.progress)}%`}
                    {progress.status === 'complete' && 'Upload complete'}
                    {progress.status === 'error' && (progress.error || 'Upload failed')}
                  </p>

                  {/* Progress bar for uploading */}
                  {progress.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

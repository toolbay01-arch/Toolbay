"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, FileVideo, Plus } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

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

export const ImageUpload = ({
  value = [],
  onChange,
  maxImages = 24,
  maxVideoSize = 60, // 60MB for 1-minute video
}: ImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  // Load uploaded files from media IDs
  const loadUploadedFiles = useCallback(async () => {
    if (value.length === 0) {
      setUploadedFiles([]);
      return;
    }

    try {
      const response = await fetch(`/api/media?ids=${value.join(",")}`);
      const data = await response.json();
      
      if (data.docs) {
        const files = data.docs.map((doc: any) => ({
          id: doc.id,
          url: doc.url,
          alt: doc.alt || "",
          fileType: doc.mimeType?.startsWith("video/") ? "video" : "image",
        }));
        setUploadedFiles(files);
      }
    } catch (error) {
      console.error("Failed to load uploaded files:", error);
    }
  }, [value]);

  // Upload files to Payload CMS
  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    const newMediaIds: string[] = [];

    try {
      for (const file of files) {
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

        // Create form data
        const formData = new FormData();
        formData.append("file", file);
        formData.append("alt", file.name.replace(/\.[^/.]+$/, "")); // Remove extension

        // Upload to Payload CMS
        const response = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });

        // Handle non-JSON responses (e.g., error pages from Vercel)
        let data;
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          // Not JSON - likely an error page or text response
          const text = await response.text();
          console.error("Non-JSON response from /api/media:", text);
          toast.error(`Upload failed: ${response.status} ${response.statusText}`);
          continue;
        }

        if (!response.ok) {
          const errorMsg = data.error || `Failed to upload ${file.name}`;
          console.error("Upload error:", errorMsg, data);
          toast.error(errorMsg);
          continue;
        }

        newMediaIds.push(data.doc.id);
        
        toast.success(`${file.name} uploaded successfully`);
      }

      // Update the value with new media IDs
      if (newMediaIds.length > 0) {
        const updatedValue = [...value, ...newMediaIds];
        onChange(updatedValue);
      }
      
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
    console.log("Files selected:", files.length, files.map(f => ({ name: f.name, size: f.size, type: f.type })));
    
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

  // Remove file
  const handleRemove = (idToRemove: string) => {
    const updatedValue = value.filter((id) => id !== idToRemove);
    onChange(updatedValue);
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

  // Create slots array (uploaded files + empty slots up to visible limit)
  const visibleSlots = 8; // Show 8 slots initially
  const slots = [...uploadedFiles];
  const emptySlots = Math.min(visibleSlots - slots.length, maxImages - slots.length);
  
  for (let i = 0; i < emptySlots; i++) {
    slots.push(null as any);
  }

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div>
        <h3 className="text-xl font-semibold mb-2">Photos & Video</h3>
        <p className="text-sm text-gray-600 mb-1">
          You can add up to 24 photos and a 1-minute video. Buyers want to see all details and angles.
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
        /* Grid layout when images exist */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {slots.map((file, index) => (
            <div 
              key={file?.id || `empty-${index}`} 
              className="relative aspect-square border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 hover:border-gray-400 transition-colors"
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
                      sizes="(max-width: 768px) 50vw, 200px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gray-200">
                      <FileVideo className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Main badge for first image */}
                  {index === 0 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-gray-700 text-white text-xs font-medium rounded-full">
                        Main
                      </span>
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemove(file.id)}
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors"
                    aria-label="Remove image"
                  >
                    <X className="w-4 h-4 text-gray-700" />
                  </button>

                  {/* Video indicator */}
                  {file.fileType === "video" && (
                    <div className="absolute top-2 left-2">
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
                    <Plus className="w-6 h-6 text-gray-600" />
                  </div>
                  <span className="text-sm text-gray-600">Add</span>
                </button>
              )}
            </div>
          ))}
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
    </div>
  );
};

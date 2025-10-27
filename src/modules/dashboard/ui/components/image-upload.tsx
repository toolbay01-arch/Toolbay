"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, X, ImageIcon, FileVideo } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || `Failed to upload ${file.name}`;
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
    if (files.length > 0) {
      uploadFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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

  const videoCount = uploadedFiles.filter((f) => f.fileType === "video").length;
  const imageCount = uploadedFiles.filter((f) => f.fileType === "image").length;

  return (
    <div className="space-y-4">
      {/* Info text */}
      <div className="text-sm text-gray-600">
        You can add up to 24 photos and a 1-minute video. Buyers want to see all details and angles.
      </div>

      {/* File counter */}
      <div className="text-sm font-medium">
        {imageCount}/{maxImages}
      </div>

      {/* Upload area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? "border-black bg-gray-50" : "border-gray-300"}
          ${isUploading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-100 rounded-full">
            <Upload className="w-8 h-8 text-gray-600" />
          </div>
          
          <div className="space-y-2">
            <p className="font-medium">Drag and drop files</p>
            {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              Upload from computer
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Uploaded files grid */}
      {uploadedFiles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {uploadedFiles.map((file) => (
            <div key={file.id} className="relative group aspect-square border rounded-lg overflow-hidden bg-gray-100">
              {file.fileType === "image" ? (
                <Image
                  src={file.url}
                  alt={file.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 200px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FileVideo className="w-12 h-12 text-gray-400" />
                </div>
              )}
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(file.id)}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              >
                <X className="w-4 h-4 text-red-600" />
              </button>
              
              {/* File type indicator */}
              <div className="absolute bottom-2 left-2">
                {file.fileType === "video" && (
                  <div className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                    Video
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

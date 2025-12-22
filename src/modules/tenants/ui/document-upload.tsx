"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, CheckCircle, AlertCircle, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tenant } from "@/payload-types";

interface DocumentUploadProps {
  tenant: Tenant;
  onUploadComplete?: () => void;
}

export const DocumentUpload = ({ tenant, onUploadComplete }: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRequestingPhysical, setIsRequestingPhysical] = useState(false);



  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.includes("pdf") && !file.type.includes("image")) {
        toast.error("Please upload a PDF or image file");
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("rdbCertificate", selectedFile);

      const response = await fetch("/api/tenants/upload-documents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Documents uploaded successfully!");
        setSelectedFile(null);
        // Refresh page or call callback to update data
        onUploadComplete?.();
      } else {
        toast.error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhysicalVerificationRequest = async () => {
    setIsRequestingPhysical(true);
    
    try {
      const response = await fetch("/api/tenants/request-physical-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Physical verification requested successfully!");
        onUploadComplete?.();
      } else {
        toast.error(result.error || "Failed to request physical verification");
      }
    } catch (error) {
      console.error("Physical verification request error:", error);
      toast.error("Failed to request physical verification. Please try again.");
    } finally {
      setIsRequestingPhysical(false);
    }
  };

  const getStatusIcon = () => {
    switch (tenant.verificationStatus) {
      case "pending":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case "document_verified":
      case "physically_verified":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (tenant.verificationStatus) {
      case "pending":
        return tenant.rdbCertificate ? "Documents submitted - pending review" : "Documents required for verification";
      case "document_verified":
        return "Documents verified - you can now add products";
      case "physically_verified":
        return "Fully verified - you can add products and merchants";
      case "rejected":
        return "Verification rejected - please contact support";
      default:
        return "Unknown status";
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Tenant Verification
        </CardTitle>
        <CardDescription>
          {getStatusText()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">Current Status</h3>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium capitalize">{tenant.verificationStatus?.replace('_', ' ')}</span>
          </p>
          {tenant.verificationNotes && (
            <p className="text-sm text-gray-600 mt-1">
              Admin Notes: {tenant.verificationNotes}
            </p>
          )}
        </div>

        {/* Document Upload */}
        {!tenant.rdbCertificate && tenant.verificationStatus === "pending" && (
          <div className="space-y-4">
            <h3 className="font-medium">Upload Required Documents</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-sm font-medium">RDB Registration Certificate</p>
                <p className="text-xs text-gray-500">PDF or image files only, max 10MB</p>
                
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="rdb-upload"
                />
                <label
                  htmlFor="rdb-upload"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </label>
                
                {selectedFile && (
                  <p className="text-xs text-green-600 mt-2">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
            </div>

            {selectedFile && (
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? "Uploading..." : "Upload Documents"}
              </Button>
            )}
          </div>
        )}

        {/* Already uploaded */}
        {tenant.rdbCertificate && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-800">Documents Uploaded</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your documents have been submitted and are being reviewed by our admin team.
            </p>
          </div>
        )}

        {/* Physical Verification Section */}
        {tenant.rdbCertificate && tenant.verificationStatus === "document_verified" && (
          <div className="space-y-4">
            <h3 className="font-medium">Physical Verification</h3>
            
            {!tenant.physicalVerificationRequested ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-800 mb-2">Request Physical Verification</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Get fully verified by requesting a physical verification visit. This will enable you to:
                    </p>
                    <ul className="text-sm text-blue-700 space-y-1 mb-4">
                      <li>• Add and manage merchant accounts</li>
                      <li>• Access advanced store features</li>
                      <li>• Increase customer trust</li>
                    </ul>
                    <Button
                      onClick={handlePhysicalVerificationRequest}
                      disabled={isRequestingPhysical}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isRequestingPhysical ? "Requesting..." : "Request Physical Verification"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <span className="font-medium text-yellow-800">Physical Verification Requested</span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Your request for physical verification has been submitted. Our team will contact you to schedule a visit.
                </p>
                {tenant.physicalVerificationRequestedAt && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Requested on: {new Date(tenant.physicalVerificationRequestedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Next Steps */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">What&apos;s Next?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Upload your RDB Registration Certificate</li>
            <li>• Wait for admin verification (usually 1-2 business days)</li>
            <li>• Once verified, you can start adding products to your store</li>
            <li>• Verified tenants can also add merchant accounts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

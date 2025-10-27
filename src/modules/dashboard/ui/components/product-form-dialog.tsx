"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { useTRPC } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageUpload } from "./image-upload";

interface ProductFormData {
  name: string;
  description?: string;
  price: number;
  category: string;
  image: string;
  cover?: string;
  gallery?: string[];
  refundPolicy: "30-day" | "14-day" | "7-day" | "3-day" | "1-day" | "no-refunds";
  isPrivate: boolean;
}

interface ProductFormDialogProps {
  open: boolean;
  onClose: () => void;
  productId?: string | null;
  mode: "create" | "edit";
}

export const ProductFormDialog = ({
  open,
  onClose,
  productId,
  mode,
}: ProductFormDialogProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      refundPolicy: "30-day",
      isPrivate: false,
    },
  });

  // Fetch product data if editing
  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    ...trpc.products.getOne.queryOptions({ id: productId || "" }),
    enabled: mode === "edit" && !!productId,
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery(
    trpc.categories.getMany.queryOptions()
  );

  // Populate form when editing
  useEffect(() => {
    if (mode === "edit" && productData) {
      setValue("name", productData.name);
      setValue("description", JSON.stringify(productData.description) || "");
      setValue("price", productData.price);
      setValue("category", typeof productData.category === "string" ? productData.category : productData.category?.id || "");
      setValue("refundPolicy", (productData.refundPolicy as ProductFormData["refundPolicy"]) || "30-day");
      setValue("isPrivate", productData.isPrivate || false);
      
      if (productData.image) {
        const imageId = typeof productData.image === "string" ? productData.image : productData.image.id;
        setValue("image", imageId);
      }
      
      if (productData.cover) {
        const coverId = typeof productData.cover === "string" ? productData.cover : productData.cover.id;
        setValue("cover", coverId);
      }

      // Handle gallery field (type assertion needed until payload-types regenerated)
      const productDataWithGallery = productData as any;
      if (productDataWithGallery.gallery && Array.isArray(productDataWithGallery.gallery)) {
        const galleryIds = productDataWithGallery.gallery.map((item: any) => {
          if (typeof item === "string") return item;
          if (item.media) {
            return typeof item.media === "string" ? item.media : item.media.id;
          }
          return null;
        }).filter(Boolean);
        setValue("gallery", galleryIds);
      }
    }
  }, [productData, mode, setValue]);

  // Create mutation
  const createMutation = useMutation(trpc.products.createProduct.mutationOptions({
    onSuccess: () => {
      toast.success("Product created successfully!");
      queryClient.invalidateQueries({ queryKey: [["products"]] });
      onClose();
      reset();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create product");
    },
  }));

  // Update mutation
  const updateMutation = useMutation(trpc.products.updateProduct.mutationOptions({
    onSuccess: () => {
      toast.success("Product updated successfully!");
      queryClient.invalidateQueries({ queryKey: [["products"]] });
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update product");
    },
  }));

  const onSubmit = (data: ProductFormData) => {
    // Automatically set the first gallery image as the main product image
    if (data.gallery && data.gallery.length > 0) {
      data.image = data.gallery[0]!;
      // Optionally set second image as cover
      if (data.gallery.length > 1) {
        data.cover = data.gallery[1];
      }
    } else if (!data.image) {
      toast.error("Please upload at least one product image");
      return;
    }

    if (mode === "create") {
      createMutation.mutate(data);
    } else if (mode === "edit" && productId) {
      updateMutation.mutate({ id: productId, ...data });
    }
  };

  const categories = categoriesData || [];

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create New Product" : "Edit Product"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Add a new product to your store"
              : "Update product information"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingProduct && mode === "edit" ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                {...register("name", { required: "Product name is required" })}
                placeholder="Enter product name"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Describe your product"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="price">Price (RWF) *</Label>
              <Input
                id="price"
                type="number"
                step="100"
                {...register("price", { 
                  required: "Price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be positive" }
                })}
                placeholder="0"
              />
              {errors.price && (
                <p className="text-sm text-red-600 mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.flatMap((cat) => [
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>,
                    ...(cat.subcategories || []).map((sub) => (
                      <SelectItem key={sub.id} value={sub.id} className="pl-6">
                        ↳ {sub.name}
                      </SelectItem>
                    ))
                  ])}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600 mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <Label>Product Photos & Videos</Label>
              <ImageUpload
                value={watch("gallery") || []}
                onChange={(value) => setValue("gallery", value)}
                maxImages={24}
              />
              {errors.gallery && (
                <p className="text-sm text-red-600 mt-1">{errors.gallery.message as string}</p>
              )}
            </div>

            <div>
              <Label htmlFor="refundPolicy">Refund Policy</Label>
              <Select
                value={watch("refundPolicy")}
                onValueChange={(value) => setValue("refundPolicy", value as ProductFormData["refundPolicy"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-day">30-day refund</SelectItem>
                  <SelectItem value="14-day">14-day refund</SelectItem>
                  <SelectItem value="7-day">7-day refund</SelectItem>
                  <SelectItem value="3-day">3-day refund</SelectItem>
                  <SelectItem value="1-day">1-day refund</SelectItem>
                  <SelectItem value="no-refunds">No refunds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrivate"
                checked={watch("isPrivate")}
                onCheckedChange={(checked) => setValue("isPrivate", checked as boolean)}
              />
              <Label htmlFor="isPrivate" className="cursor-pointer">
                Make this product private (only visible on your store)
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {mode === "create" ? "Create Product" : "Update Product"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};


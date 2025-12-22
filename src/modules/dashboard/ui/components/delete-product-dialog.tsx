"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface DeleteProductDialogProps {
  productId: string | null;
  productName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteProductDialog = ({
  productId,
  productName,
  open,
  onOpenChange,
}: DeleteProductDialogProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  const deleteMutation = useMutation(trpc.products.deleteProduct.mutationOptions({
    onSuccess: () => {
      toast.success("Product archived successfully");
      queryClient.invalidateQueries({ queryKey: [["products"]] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to archive product");
    },
  }));

  const handleDelete = () => {
    if (!productId) return;
    deleteMutation.mutate({ id: productId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive Product</DialogTitle>
          <DialogDescription>
            Are you sure you want to archive {productName ? `"${productName}"` : "this product"}? 
            This action will hide the product from your storefront, but it can be restored later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Archiving..." : "Archive Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

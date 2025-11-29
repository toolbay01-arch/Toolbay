"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { QuantitySelector } from "@/components/quantity-selector";

interface BuyNowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CheckoutData) => void;
  isLoading?: boolean;
  productName: string;
  productPrice: number;
  minOrderQuantity?: number;
  maxOrderQuantity?: number;
  unit?: string;
}

export interface CheckoutData {
  name: string;
  phone: string;
  email: string;
  deliveryType: 'direct' | 'delivery';
  addressLine1: string;
  city: string;
  country: string;
  quantity: number;
}

export function BuyNowDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  productName,
  productPrice,
  minOrderQuantity = 1,
  maxOrderQuantity,
  unit = "unit",
}: BuyNowDialogProps) {
  const [selectedQuantity, setSelectedQuantity] = useState(minOrderQuantity);
  const [formData, setFormData] = useState<Omit<CheckoutData, "quantity">>({
    name: "",
    phone: "",
    email: "",
    deliveryType: "direct",
    addressLine1: "",
    city: "",
    country: "Rwanda",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Omit<CheckoutData, "quantity">, string>>>({});

  const handleChange = (field: keyof Omit<CheckoutData, "quantity">) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDeliveryTypeChange = (deliveryType: 'direct' | 'delivery') => {
    setFormData(prev => ({ ...prev, deliveryType }));
    // Clear address errors when switching to direct
    if (deliveryType === 'direct') {
      setErrors(prev => ({ 
        ...prev, 
        addressLine1: undefined,
        city: undefined,
        country: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Omit<CheckoutData, "quantity">, string>> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number (e.g., +250781234567)";
    }

    // Email validation (optional but validated if provided)
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    // Address validation - only required for delivery
    if (formData.deliveryType === 'delivery') {
      if (!formData.addressLine1.trim()) {
        newErrors.addressLine1 = "Address is required for delivery";
      }

      if (!formData.city.trim()) {
        newErrors.city = "City is required for delivery";
      }

      if (!formData.country.trim()) {
        newErrors.country = "Country is required for delivery";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isLoading) {
      return;
    }

    if (validateForm()) {
      onSubmit({ ...formData, quantity: selectedQuantity });
    }
  };

  const formatCurrency = (amount: number) => {
    return (
      new Intl.NumberFormat("en-RW", {
        style: "decimal",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + " RWF"
    );
  };

  const totalAmount = productPrice * selectedQuantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Your Purchase</DialogTitle>
          <DialogDescription>
            Enter your delivery information to proceed with payment
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Product:</span> {productName}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-medium">Quantity:</span>
                <QuantitySelector
                  value={selectedQuantity}
                  onChange={setSelectedQuantity}
                  min={minOrderQuantity}
                  max={maxOrderQuantity}
                  unit={unit}
                  size="sm"
                />
              </div>
              <p>
                <span className="font-medium">Price per {unit}:</span> {formatCurrency(productPrice)}
              </p>
              <div className="border-t pt-2 mt-2">
                <p className="text-lg font-bold text-primary">
                  Total: {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={formData.name}
                onChange={handleChange("name")}
                className={errors.name ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+250781234567"
                value={formData.phone}
                onChange={handleChange("phone")}
                className={errors.phone ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={handleChange("email")}
                className={errors.email ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>
          </div>

          {/* Delivery Type Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Delivery Option</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="direct-buy"
                  name="deliveryType"
                  value="direct"
                  checked={formData.deliveryType === 'direct'}
                  onChange={() => handleDeliveryTypeChange('direct')}
                  className="h-4 w-4 text-primary"
                  disabled={isLoading}
                />
                <Label htmlFor="direct-buy" className="font-normal cursor-pointer">
                  Direct Payment (Pickup at store - No shipping)
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="delivery-buy"
                  name="deliveryType"
                  value="delivery"
                  checked={formData.deliveryType === 'delivery'}
                  onChange={() => handleDeliveryTypeChange('delivery')}
                  className="h-4 w-4 text-primary"
                  disabled={isLoading}
                />
                <Label htmlFor="delivery-buy" className="font-normal cursor-pointer">
                  Delivery (Shipping required)
                </Label>
              </div>
            </div>
          </div>

          {/* Shipping Address - Conditional */}
          {formData.deliveryType === 'delivery' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Shipping Address</h3>

              <div className="space-y-2">
                <Label htmlFor="addressLine1">
                  Address Line 1 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="addressLine1"
                  type="text"
                  placeholder="123 Main Street"
                  value={formData.addressLine1}
                  onChange={handleChange("addressLine1")}
                  className={errors.addressLine1 ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.addressLine1 && (
                  <p className="text-sm text-red-500">{errors.addressLine1}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    type="text"
                    placeholder="Kigali"
                    value={formData.city}
                    onChange={handleChange("city")}
                    className={errors.city ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="Rwanda"
                    value={formData.country}
                    onChange={handleChange("country")}
                    className={errors.country ? "border-red-500" : ""}
                    disabled={isLoading}
                  />
                  {errors.country && <p className="text-sm text-red-500">{errors.country}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Proceed to Payment"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

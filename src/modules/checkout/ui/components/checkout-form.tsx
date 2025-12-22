"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface CheckoutFormProps {
  cartItems: Array<{
    id: string
    name: string
    price: number
    quantity?: number
  }>
  totalAmount: number
  onSubmitAction: (formData: CheckoutFormData) => void
  isSubmitting?: boolean
}

export interface CheckoutFormData {
  email: string
  phone: string
  name: string
  deliveryType: 'direct' | 'delivery'
  addressLine1: string
  city: string
  country: string
}

export function CheckoutForm({ 
  cartItems, 
  totalAmount, 
  onSubmitAction, 
  isSubmitting 
}: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    email: "",
    phone: "",
    name: "",
    deliveryType: "direct",
    addressLine1: "",
    city: "",
    country: "Rwanda",
  })

  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutFormData, string>>>({})

  const handleChange = (field: keyof CheckoutFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleDeliveryTypeChange = (deliveryType: 'direct' | 'delivery') => {
    setFormData(prev => ({ ...prev, deliveryType }))
    // Clear address errors when switching to direct
    if (deliveryType === 'direct') {
      setErrors(prev => ({ 
        ...prev, 
        addressLine1: undefined,
        city: undefined,
        country: undefined
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CheckoutFormData, string>> = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email"
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = "Please enter a valid phone number (e.g., +250781234567)"
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required"
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Name must be at least 3 characters"
    }

    // Address validation - only required for delivery
    if (formData.deliveryType === 'delivery') {
      if (!formData.addressLine1.trim()) {
        newErrors.addressLine1 = "Address is required for delivery"
      }

      if (!formData.city.trim()) {
        newErrors.city = "City is required for delivery"
      }

      if (!formData.country.trim()) {
        newErrors.country = "Country is required for delivery"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Prevent double submission
    if (isSubmitting) {
      return
    }
    
    if (validateForm()) {
      onSubmitAction(formData)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' RWF'
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Checkout Form - Left Side */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Checkout Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Contact Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={handleChange("email")}
                    className={errors.email ? "border-red-500" : ""}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
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
                    disabled={isSubmitting}
                  />
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                </div>

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
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Delivery Type Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Delivery Option</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="direct"
                      name="deliveryType"
                      value="direct"
                      checked={formData.deliveryType === 'direct'}
                      onChange={() => handleDeliveryTypeChange('direct')}
                      className="h-4 w-4 text-primary"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="direct" className="font-normal cursor-pointer">
                      Direct Payment (Pickup at store - No shipping)
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="delivery"
                      name="deliveryType"
                      value="delivery"
                      checked={formData.deliveryType === 'delivery'}
                      onChange={() => handleDeliveryTypeChange('delivery')}
                      className="h-4 w-4 text-primary"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="delivery" className="font-normal cursor-pointer">
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
                      disabled={isSubmitting}
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
                        disabled={isSubmitting}
                      />
                      {errors.city && (
                        <p className="text-sm text-red-500">{errors.city}</p>
                      )}
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
                        disabled={isSubmitting}
                      />
                      {errors.country && (
                        <p className="text-sm text-red-500">{errors.country}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Payment"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Cart Summary - Right Side */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Cart Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cart Items */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {cartItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex justify-between items-start pb-3 border-b last:border-b-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm line-clamp-2">{item.name}</p>
                    {item.quantity && item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    )}
                  </div>
                  <p className="font-semibold text-sm ml-2 whitespace-nowrap">
                    {formatCurrency(item.price * (item.quantity || 1))}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">Total</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                🔒 Secure payment via Mobile Money
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

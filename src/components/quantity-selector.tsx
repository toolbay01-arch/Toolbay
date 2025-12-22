"use client";

import { MinusIcon, PlusIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  unit = "unit",
  disabled = false,
  size = "md",
  className,
}: QuantitySelectorProps) {
  const handleIncrement = () => {
    if (!max || value < max) {
      onChange(value + 1);
    }
  };

  const handleDecrement = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value);
    if (!isNaN(newValue)) {
      const clampedValue = Math.max(min, max ? Math.min(max, newValue) : newValue);
      onChange(clampedValue);
    }
  };

  const handleBlur = () => {
    // Ensure value is within bounds
    if (value < min) {
      onChange(min);
    } else if (max && value > max) {
      onChange(max);
    }
  };

  const sizeClasses = {
    sm: "h-8",
    md: "h-10",
    lg: "h-12",
  };

  const buttonSizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const inputSizeClasses = {
    sm: "h-8 w-12 text-sm",
    md: "h-10 w-16 text-base",
    lg: "h-12 w-20 text-lg",
  };

  const canDecrement = value > min && !disabled;
  const canIncrement = (!max || value < max) && !disabled;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDecrement}
        disabled={!canDecrement}
        className={cn(buttonSizeClasses[size], "shrink-0")}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="h-4 w-4" />
      </Button>

      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          disabled={disabled}
          className={cn(
            inputSizeClasses[size],
            "text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
          aria-label="Quantity"
        />
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleIncrement}
        disabled={!canIncrement}
        className={cn(buttonSizeClasses[size], "shrink-0")}
        aria-label="Increase quantity"
      >
        <PlusIcon className="h-4 w-4" />
      </Button>

      {unit && unit !== "unit" && (
        <span className="text-sm text-muted-foreground ml-1">
          {unit}{value !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// Stock status badge component
interface StockStatusBadgeProps {
  stockStatus: "in_stock" | "low_stock" | "out_of_stock" | "pre_order";
  quantity?: number;
  className?: string;
}

export function StockStatusBadge({ stockStatus, quantity, className }: StockStatusBadgeProps) {
  const statusConfig = {
    in_stock: {
      label: "In Stock",
      className: "bg-green-100 text-green-800 border-green-200",
    },
    low_stock: {
      label: quantity ? `Only ${quantity} left` : "Low Stock",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    },
    out_of_stock: {
      label: "Out of Stock",
      className: "bg-red-100 text-red-800 border-red-200",
    },
    pre_order: {
      label: "Pre-Order",
      className: "bg-blue-100 text-blue-800 border-blue-200",
    },
  };

  const config = statusConfig[stockStatus];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border shrink-0",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}

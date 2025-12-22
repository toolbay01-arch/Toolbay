import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Eye, Star, Heart, ShoppingCart, ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string;
  parent?: string | null;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  category: string;
  tags: string[];
  image: File | null;
  cover: File | null;
  refundPolicy: string;
  content: string;
  isPrivate: boolean;
}

interface ProductPreviewProps {
  formData: ProductFormData;
  imagePreview: string | null;
  coverPreview: string | null;
}

const ProductPreview: React.FC<ProductPreviewProps> = ({ formData, imagePreview }) => {
  return (
    <div className="w-full max-w-sm mx-auto bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
        {imagePreview ? (
          <Image 
            src={imagePreview} 
            alt={formData.name || 'Product'} 
            width={400}
            height={400}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <ImageIcon size={48} />
            <span className="text-sm mt-2">No image selected</span>
          </div>
        )}
        
        {/* Wishlist button */}
        <button className="absolute top-2 right-2 p-2 bg-white/80 rounded-full hover:bg-white transition-colors">
          <Heart size={16} className="text-gray-600" />
        </button>
        
        {/* Private badge */}
        {formData.isPrivate && (
          <Badge className="absolute top-2 left-2 bg-red-500 text-white">
            Private
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg line-clamp-2 mb-2">
          {formData.name || 'Product Name'}
        </h3>
        
        <p className="text-gray-600 text-sm line-clamp-3 mb-3">
          {formData.description || 'Product description will appear here...'}
        </p>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl font-bold text-green-600">
            {formData.price ? `${formData.price.toLocaleString()} RWF` : '0 RWF'}
          </span>
          
          {/* Rating placeholder */}
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} size={12} className="text-yellow-400 fill-current" />
            ))}
            <span className="text-xs text-gray-500 ml-1">(0)</span>
          </div>
        </div>

        {/* Tags */}
        {formData.tags && formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {formData.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {formData.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{formData.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Refund policy */}
        {formData.refundPolicy && (
          <div className="text-xs text-gray-500 mb-3">
            📅 {formData.refundPolicy} return policy
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-2">
          <Button size="sm" className="flex-1">
            <ShoppingCart size={14} className="mr-1" />
            Add to Cart
          </Button>
          <Button size="sm" variant="outline">
            <Eye size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface EbayStyleProductFormProps {
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const EbayStyleProductForm: React.FC<EbayStyleProductFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: '',
      tags: [],
      image: null,
      cover: null,
      refundPolicy: '30-day',
      content: '',
      isPrivate: false,
    }
  });

  const watchedValues = watch();

  // Fetch categories and tags on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        
        // Fetch categories
        const categoriesResponse = await fetch('/api/categories');
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json();
          setCategories(categoriesData.docs || []);
        }

        // Fetch tags  
        const tagsResponse = await fetch('/api/tags');
        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          setTags(tagsData.docs || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const steps = [
    { id: 0, title: 'Add Photos', icon: '📸' },
    { id: 1, title: 'Product Details', icon: '📝' },
    { id: 2, title: 'Pricing & Policy', icon: '💰' },
    { id: 3, title: 'Review & Publish', icon: '✅' },
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'cover') => {
    const file = event.target.files?.[0];
    if (file) {
      setValue(type, file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (type === 'image') {
          setImagePreview(e.target?.result as string);
        } else {
          setCoverPreview(e.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Let&apos;s start with photos</h3>
              <p className="text-gray-600">Great photos help your product stand out. Add up to 2 photos.</p>
            </div>

            {/* Main Product Image */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                {imagePreview ? (
                  <div className="relative">
                    <Image src={imagePreview} alt="Preview" width={300} height={200} className="max-h-48 mx-auto rounded" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById('main-image')?.click()}
                    >
                      Change Photo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('main-image')?.click()}
                      >
                        Add Main Photo
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">JPEG, PNG up to 10MB</p>
                  </div>
                )}
                <input
                  id="main-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'image')}
                />
              </div>

              {/* Cover Image */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
                {coverPreview ? (
                  <div className="relative">
                    <Image src={coverPreview} alt="Cover Preview" width={200} height={120} className="max-h-32 mx-auto rounded" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById('cover-image')?.click()}
                    >
                      Change Cover
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('cover-image')?.click()}
                      >
                        Add Cover Photo (Optional)
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">Additional product image</p>
                  </div>
                )}
                <input
                  id="cover-image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, 'cover')}
                />
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Tell us about your product</h3>
              <p className="text-gray-600">Add details that help buyers find and understand your product.</p>
              {loadingData && (
                <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading categories and tags...
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product Name *</label>
                <Input
                  {...register('name', { required: 'Product name is required' })}
                  placeholder="What are you selling?"
                  className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  {...register('description')}
                  placeholder="Describe your product's key features, condition, and what makes it special..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <Select onValueChange={(value) => setValue('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? "Loading categories..." : "Choose a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingData ? (
                      <SelectItem value="" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2 inline" />
                        Loading...
                      </SelectItem>
                    ) : (
                      <>
                        {categories
                          .filter(cat => !cat.parent) // Only show parent categories
                          .map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center">
                                {category.color && (
                                  <div 
                                    className="w-3 h-3 rounded-full mr-2" 
                                    style={{ backgroundColor: category.color }}
                                  />
                                )}
                                {category.name}
                              </div>
                            </SelectItem>
                          ))
                        }
                        {categories.length === 0 && !loadingData && (
                          <SelectItem value="other">Other</SelectItem>
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <div className="space-y-2">
                  <Input
                    placeholder="Add tags (comma separated) or select from suggestions below"
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
                      setValue('tags', tags);
                    }}
                  />
                  {!loadingData && tags.length > 0 && (
                    <div className="max-h-32 overflow-y-auto">
                      <p className="text-xs text-gray-500 mb-2">Popular tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 12).map((tag) => (
                          <Button
                            key={tag.id}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => {
                              const currentTags = watchedValues.tags || [];
                              if (!currentTags.includes(tag.name)) {
                                setValue('tags', [...currentTags, tag.name]);
                              }
                            }}
                          >
                            <div className="flex items-center">
                              {tag.color && (
                                <div 
                                  className="w-2 h-2 rounded-full mr-1" 
                                  style={{ backgroundColor: tag.color }}
                                />
                              )}
                              {tag.name}
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Show selected tags */}
                  {watchedValues.tags && watchedValues.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {watchedValues.tags.map((tag, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="text-xs flex items-center gap-1"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = watchedValues.tags.filter((_, i) => i !== index);
                              setValue('tags', newTags);
                            }}
                            className="ml-1 text-gray-500 hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Set your price and policies</h3>
              <p className="text-gray-600">Choose competitive pricing and customer-friendly policies.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Price (RWF) *</label>
                <Input
                  type="number"
                  {...register('price', { 
                    required: 'Price is required',
                    min: { value: 1, message: 'Price must be greater than 0' }
                  })}
                  placeholder="0"
                  className={cn(errors.price && 'border-red-500')}
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Return Policy</label>
                <Select onValueChange={(value) => setValue('refundPolicy', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="30-day" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30-day">30-day returns</SelectItem>
                    <SelectItem value="14-day">14-day returns</SelectItem>
                    <SelectItem value="7-day">7-day returns</SelectItem>
                    <SelectItem value="3-day">3-day returns</SelectItem>
                    <SelectItem value="1-day">1-day returns</SelectItem>
                    <SelectItem value="no-refunds">No returns</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Additional Content (Post-Purchase)</label>
                <Textarea
                  {...register('content')}
                  placeholder="Add downloadable files, guides, or bonus content that buyers will access after purchase..."
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">This content will only be visible to customers after they purchase.</p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPrivate"
                  {...register('isPrivate')}
                  className="rounded"
                />
                <label htmlFor="isPrivate" className="text-sm">
                  Keep this listing private (won&apos;t appear in public search)
                </label>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold mb-2">Review your listing</h3>
              <p className="text-gray-600">Make sure everything looks good before publishing.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Form Summary */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Listing Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Name:</span> {watchedValues.name || 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">Price:</span> {watchedValues.price ? `${watchedValues.price.toLocaleString()} RWF` : 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {watchedValues.category || 'Not set'}
                    </div>
                    <div>
                      <span className="font-medium">Return Policy:</span> {watchedValues.refundPolicy || '30-day'}
                    </div>
                    <div>
                      <span className="font-medium">Visibility:</span> {watchedValues.isPrivate ? 'Private' : 'Public'}
                    </div>
                    {watchedValues.tags && watchedValues.tags.length > 0 && (
                      <div>
                        <span className="font-medium">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {watchedValues.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Live Preview */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Customer View Preview</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPreview(true)}
                  >
                    <Eye size={14} className="mr-1" />
                    Full Preview
                  </Button>
                </div>
                <ProductPreview
                  formData={watchedValues}
                  imagePreview={imagePreview}
                  coverPreview={coverPreview}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                index <= currentStep
                  ? "bg-blue-500 border-blue-500 text-white"
                  : "border-gray-300 text-gray-500"
              )}
            >
              <span className="text-lg">{step.icon}</span>
            </div>
            <div className="ml-3 hidden sm:block">
              <p className={cn(
                "text-sm font-medium",
                index <= currentStep ? "text-blue-600" : "text-gray-500"
              )}>
                {step.title}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-4 transition-colors",
                index < currentStep ? "bg-blue-500" : "bg-gray-300"
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={currentStep === 0 ? onCancel : prevStep}
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </Button>

        <div className="flex space-x-3">
          {/* Live Preview Button - Available on all steps */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline">
                <Eye size={16} className="mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>How customers will see your product</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <ProductPreview
                  formData={watchedValues}
                  imagePreview={imagePreview}
                  coverPreview={coverPreview}
                />
              </div>
            </DialogContent>
          </Dialog>

          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={nextStep}
              disabled={currentStep === 0 && !imagePreview}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Publishing...' : 'Publish Listing'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EbayStyleProductForm;

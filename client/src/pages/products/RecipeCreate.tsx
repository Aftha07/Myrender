import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Plus, Trash2, Upload, Image, X } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { z } from "zod";

const recipeSchema = insertProductSchema.extend({
  type: z.literal("recipe"),
  nameEnglish: z.string().min(1, "Name in English is required"),
  nameArabic: z.string().optional(),
  productId: z.string().min(1, "Recipe ID is required"),
  category: z.string().default("Default Category"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  barcode: z.string().optional(),
  tax: z.string().default("Vat 15%"),
  image: z.string().optional(),
  sellingPrice: z.string().min(0, "Selling price must be 0 or greater"),
  salesAccount: z.string().default("Sales"),
  additionalCost: z.string().min(0, "Additional cost must be 0 or greater"),
  additionalCostAccount: z.string().default("Dependent"),
  inventoryItem: z.boolean().default(true),
  warehouse: z.string().default("Warehouse"),
  containedProducts: z.array(z.object({
    productId: z.string(),
    description: z.string(),
    unit: z.string(),
    quantity: z.number(),
    cost: z.number()
  })).default([])
});

type RecipeFormData = z.infer<typeof recipeSchema>;

export default function RecipeCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [containedProducts, setContainedProducts] = useState([
    { productId: "none", description: "", unit: "0", quantity: 1, cost: 0 }
  ]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch units from database
  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Fetch products for contained products dropdown
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  const form = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      type: "recipe",
      nameEnglish: "",
      nameArabic: "",
      productId: "",
      category: "Default Category",
      description: "",
      unit: "",
      barcode: "",
      tax: "Vat 15%",
      image: "",
      sellingPrice: "0",
      salesAccount: "Sales",
      additionalCost: "0",
      additionalCostAccount: "Dependent",
      inventoryItem: true,
      warehouse: "Warehouse",
      containedProducts: []
    },
  });

  const createRecipe = useMutation({
    mutationFn: async (data: RecipeFormData) => {
      let imageUrl = data.image;
      
      // If we have a file, upload it first
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.url;
        }
      }
      
      const submitData = {
        ...data,
        image: imageUrl,
        containedProducts
      };
      const response = await apiRequest("POST", "/api/products", submitData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create recipe');
      }
      return await response.json();
    },
    onSuccess: (newRecipe) => {
      // Optimistic update - add the new recipe to the cache immediately
      queryClient.setQueryData(["/api/products"], (oldData: any) => {
        if (oldData) {
          return [newRecipe, ...oldData];
        }
        return [newRecipe];
      });
      
      // Also invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Success",
        description: "Recipe created successfully",
      });
      setLocation("/products/services");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create recipe",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecipeFormData) => {
    createRecipe.mutate(data);
  };

  const addNewProduct = () => {
    setContainedProducts([...containedProducts, { productId: "none", description: "", unit: "0", quantity: 1, cost: 0 }]);
  };

  const removeProduct = (index: number) => {
    setContainedProducts(containedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: string, value: any) => {
    const updated = [...containedProducts];
    updated[index] = { ...updated[index], [field]: value };
    setContainedProducts(updated);
  };

  const clearAll = () => {
    setContainedProducts([{ productId: "none", description: "", unit: "0", quantity: 1, cost: 0 }]);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChooseFile = () => {
    fileInputRef.current?.click();
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    form.setValue('image', '');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Products-Services</span>
            <span>/</span>
            <span>Product List</span>
            <span>/</span>
            <span className="text-teal-600 font-medium">New Recipe</span>
          </div>

        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Link href="/products/services">
            <Button variant="outline" size="sm" className="mr-4">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="flex gap-8">
          {/* Left Column */}
          <div className="flex-1 max-w-lg">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Name in Arabic */}
                <FormField
                  control={form.control}
                  name="nameArabic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Name in Arabic</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Name in English */}
                <FormField
                  control={form.control}
                  name="nameEnglish"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Name in English</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-10" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* ID */}
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">ID</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="Enter recipe ID manually"
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category */}
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Default Category">Default Category</SelectItem>
                          <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                          <SelectItem value="Recipes">Recipes</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ""}
                          rows={4}
                          className="resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit */}
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Unit</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {units.map((unit: any) => (
                            <SelectItem key={unit.id} value={unit.name}>
                              {unit.name} ({unit.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Barcode */}
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Barcode</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          value={field.value || ""}
                          className="h-10"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Taxes */}
                <FormField
                  control={form.control}
                  name="tax"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Taxes</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select tax" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Vat 15%">Vat 15%</SelectItem>
                          <SelectItem value="Vat 5%">Vat 5%</SelectItem>
                          <SelectItem value="No Tax">No Tax</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center relative">
                    {imagePreview ? (
                      <div className="w-24 h-24 mx-auto mb-4 rounded border overflow-hidden relative">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                          onClick={handleRemoveImage}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-b from-blue-100 to-green-200 rounded border flex items-center justify-center">
                        <div className="w-16 h-12 bg-gradient-to-b from-blue-200 to-green-300 rounded flex items-center justify-center">
                          <Image className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Image</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input 
                              {...field} 
                              value={field.value || ""}
                              className="h-10 flex-1"
                              placeholder="Image URL"
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // If URL is provided, show preview
                                if (e.target.value) {
                                  setImagePreview(e.target.value);
                                  setImageFile(null);
                                }
                              }}
                            />
                          </FormControl>
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="border-gray-300"
                            onClick={handleChooseFile}
                          >
                            Choose file
                          </Button>
                          <Button 
                            type="button" 
                            className="bg-teal-600 hover:bg-teal-700 text-white"
                            onClick={handleBrowse}
                          >
                            Browse
                          </Button>
                          {(imagePreview || imageFile) && (
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={handleRemoveImage}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          accept="image/*"
                          className="hidden"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Selling Price */}
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Selling Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => {
                            // Only allow numbers and decimal point
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          className="h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selling Account */}
                <FormField
                  control={form.control}
                  name="salesAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Selling Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Product Sales">Product Sales</SelectItem>
                          <SelectItem value="Recipe Sales">Recipe Sales</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Additional Cost */}
                <FormField
                  control={form.control}
                  name="additionalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Additional Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          value={field.value || ""}
                          onChange={(e) => {
                            // Only allow numbers and decimal point
                            const value = e.target.value;
                            if (value === "" || /^\d*\.?\d*$/.test(value)) {
                              field.onChange(value);
                            }
                          }}
                          onBlur={field.onBlur}
                          name={field.name}
                          className="h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Additional Cost Account */}
                <FormField
                  control={form.control}
                  name="additionalCostAccount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Additional Cost Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dependent">Dependent</SelectItem>
                          <SelectItem value="Manufacturing Cost">Manufacturing Cost</SelectItem>
                          <SelectItem value="Labor Cost">Labor Cost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end pt-6">
                  <Button 
                    type="submit" 
                    disabled={createRecipe.isPending}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-8"
                  >
                    {createRecipe.isPending ? "Creating..." : "Create Recipe"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          {/* Right Column - Accounting Alignment */}
          <div className="flex-1 max-w-md">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Accounting Alignment:</h3>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    checked={form.watch('inventoryItem')}
                    onCheckedChange={(checked) => form.setValue('inventoryItem', !!checked)}
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Inventory Item
                  </label>
                  <Select 
                    value={form.watch('warehouse')} 
                    onValueChange={(value) => form.setValue('warehouse', value)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                      <SelectItem value="Store A">Store A</SelectItem>
                      <SelectItem value="Store B">Store B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contained Products */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contained products</h3>
              
              <div className="bg-white rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">#</TableHead>
                      <TableHead className="text-xs">Products</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">Cost</TableHead>
                      <TableHead className="text-xs w-8"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containedProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs">{index + 1}</TableCell>
                        <TableCell>
                          <Select
                            value={product.productId}
                            onValueChange={(value) => updateProduct(index, 'productId', value)}
                          >
                            <SelectTrigger className="h-8 text-xs border-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Select Product</SelectItem>
                              {products.filter((p: any) => p.type !== 'recipe').map((product: any) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.nameEnglish} ({product.productId})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={product.description}
                            onChange={(e) => updateProduct(index, 'description', e.target.value)}
                            className="h-8 text-xs border-none p-1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={product.unit}
                            onChange={(e) => updateProduct(index, 'unit', e.target.value)}
                            className="h-8 text-xs border-none p-1 w-12"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-8 text-xs border-none p-1 w-12"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={product.cost}
                            onChange={(e) => updateProduct(index, 'cost', parseFloat(e.target.value) || 0)}
                            className="h-8 text-xs border-none p-1 w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProduct(index)}
                            className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                <div className="p-3 border-t flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewProduct}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add new record
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-xs text-gray-500"
                  >
                    Clear all
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white px-6 py-4 border-t mt-auto">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Value of Money</span>
          <span>All rights reserved © 2024 VoM</span>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { insertProductSchema, type InsertProduct } from "@shared/schema";

export default function ProductCreate() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch units from database
  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      nameEnglish: "",
      nameArabic: "",
      category: "Default Category",
      description: "",
      type: "product",
      quantity: 0,
      buyingPrice: "0",
      sellingPrice: "0",
      tax: "Vat 15%",
      unit: "",
      barcode: "",
      allowNotification: false,
      minimumQuantity: 0,
      inventoryItem: true,
      sellingProduct: true,
      buyingProduct: true,
      warehouse: "Warehouse",
      salesAccount: "Sales",
      purchasesAccount: "Purchases",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      const response = await apiRequest('POST', '/api/products', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }
      return await response.json();
    },
    onSuccess: (newProduct) => {
      // Optimistic update - add the new product to the cache immediately
      queryClient.setQueryData(['/api/products'], (oldData: any) => {
        if (oldData) {
          return [newProduct, ...oldData];
        }
        return [newProduct];
      });
      
      // Also invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      setLocation('/products/services');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProduct) => {
    createMutation.mutate(data);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        form.setValue('image', result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`flex-1 p-6 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/products/services')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Products-Services / Product List / New Product</h1>
              </div>
            </div>

          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <FormField
                      control={form.control}
                      name="nameArabic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name in Arabic:</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="nameEnglish"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name in English *</FormLabel>
                          <FormControl>
                            <Input {...field} required />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter product ID manually" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Default Category">Default Category</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={4} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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

                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Taxes</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
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

                    <FormField
                      control={form.control}
                      name="allowNotification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Allow Notification</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minimumQuantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="text"
                              value={field.value?.toString() || ""}
                              onChange={(e) => {
                                // Only allow whole numbers
                                const value = e.target.value;
                                if (value === "" || /^\d+$/.test(value)) {
                                  field.onChange(parseInt(value) || 0);
                                }
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />



                    {/* Image Upload */}
                    <div className="space-y-4">
                      <FormLabel>Image</FormLabel>
                      <div className="flex flex-col items-center space-y-4">
                        {imagePreview ? (
                          <img src={imagePreview} alt="Product preview" className="w-32 h-32 object-cover rounded" />
                        ) : (
                          <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                            <span className="text-gray-400">No image</span>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload">
                            <Button type="button" variant="outline" size="sm" asChild>
                              <span>Choose file</span>
                            </Button>
                          </label>
                          <Button type="button" variant="default" size="sm" className="bg-teal-600 hover:bg-teal-700">
                            Browse
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox id="custom-fields" />
                        <label htmlFor="custom-fields" className="text-sm text-blue-600">
                          Add New Custom Fields
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Accounting Alignment:</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="inventoryItem"
                            render={({ field }) => (
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            )}
                          />
                          <span>Inventory Item</span>
                        </div>
                        <FormField
                          control={form.control}
                          name="warehouse"
                          render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Warehouse">Warehouse</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="sellingProduct"
                            render={({ field }) => (
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            )}
                          />
                          <span>Selling Product</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="sellingPrice"
                            render={({ field }) => (
                              <div className="w-32">
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
                                    className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0.00"
                                  />
                                </FormControl>
                              </div>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="salesAccount"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sales">Sales</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="buyingProduct"
                            render={({ field }) => (
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            )}
                          />
                          <span>Buying Product</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="buyingPrice"
                            render={({ field }) => (
                              <div className="w-32">
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
                                    className="text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0.00"
                                  />
                                </FormControl>
                              </div>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="purchasesAccount"
                            render={({ field }) => (
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Purchases">Purchases</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Product"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
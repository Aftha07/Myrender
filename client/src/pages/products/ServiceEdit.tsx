import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { z } from "zod";

const serviceSchema = insertProductSchema.extend({
  type: z.literal("service"),
  nameEnglish: z.string().min(1, "Name in English is required"),
  nameArabic: z.string().optional(),
  productId: z.string().min(1, "Service ID is required"),
  category: z.string().default("Default Category"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  tax: z.string().default("Vat 15%"),
  sellingPrice: z.string().min(0, "Selling price must be 0 or greater"),
  salesAccount: z.string().default("Sales"),
  addCustomFields: z.boolean().default(false)
});

type ServiceFormData = z.infer<typeof serviceSchema>;

interface ServiceEditProps {
  params: {
    id: string;
  };
}

export default function ServiceEdit({ params }: ServiceEditProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch service data
  const { data: service, isLoading } = useQuery({
    queryKey: ["/api/products", params.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/products/${params.id}`);
      return await response.json();
    },
  });

  // Fetch units from database
  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      type: "service",
      nameEnglish: "",
      nameArabic: "",
      productId: "",
      category: "Default Category",
      description: "",
      unit: "", 
      tax: "Vat 15%",
      sellingPrice: "0",
      salesAccount: "Sales",
      addCustomFields: false
    },
  });

  // Update form when service data is loaded
  useEffect(() => {
    if (service) {
      form.reset({
        type: "service",
        nameEnglish: service.nameEnglish || "",
        nameArabic: service.nameArabic || "",
        productId: service.productId || "",
        category: service.category || "Default Category",
        description: service.description || "",
        unit: service.unit || "",
        tax: service.tax || "Vat 15%",
        sellingPrice: service.sellingPrice || "0",
        salesAccount: service.salesAccount || "Sales",
        addCustomFields: false
      });
    }
  }, [service, form]);

  const updateService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const submitData = {
        ...data,
        sellingPrice: data.sellingPrice.toString(),
      };
      const response = await apiRequest("PUT", `/api/products/${params.id}`, submitData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update service');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", params.id] });
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
      setLocation("/products/services");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    updateService.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/products/services')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="text-sm text-gray-500">
              Products-Services / Service List / <span className="text-teal-600">Edit Service</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
            <FormField
              control={form.control}
              name="nameArabic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name in Arabic</FormLabel>
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
                  <FormLabel>Name in English</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
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
                    <Textarea {...field} rows={3} />
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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="tax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taxes</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
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

            <FormField
              control={form.control}
              name="sellingPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price</FormLabel>
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
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="salesAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Account</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Service Revenue">Service Revenue</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addCustomFields"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-blue-600 cursor-pointer">
                    Add Your Custom Fields
                  </FormLabel>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full bg-teal-600 hover:bg-teal-700"
              disabled={updateService.isPending}
            >
              {updateService.isPending ? "Updating..." : "Update Service"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
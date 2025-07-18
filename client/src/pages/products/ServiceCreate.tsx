import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
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

export default function ServiceCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  const createService = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const submitData = {
        ...data,
        sellingPrice: data.sellingPrice,
      };
      const response = await apiRequest("POST", "/api/products", submitData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create service');
      }
      return await response.json();
    },
    onSuccess: (newService) => {
      // Optimistic update - add the new service to the cache immediately
      queryClient.setQueryData(["/api/products"], (oldData: any) => {
        if (oldData) {
          return [newService, ...oldData];
        }
        return [newService];
      });
      
      // Also invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Success",
        description: "Service created successfully",
      });
      setLocation("/products/services");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormData) => {
    createService.mutate(data);
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
            <span className="text-teal-600 font-medium">New Service</span>
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

        <div className="max-w-2xl">
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
                        placeholder="Enter service ID manually"
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
                        <SelectItem value="Construction">Construction</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
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
                        <SelectItem value="Service Revenue">Service Revenue</SelectItem>
                        <SelectItem value="Consulting Revenue">Consulting Revenue</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Add Your Custom Fields */}
              <FormField
                control={form.control}
                name="addCustomFields"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium text-blue-600 cursor-pointer">
                        Add Your Custom Fields
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={createService.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8"
                >
                  {createService.isPending ? "Creating..." : "Create Service"}
                </Button>
              </div>
            </form>
          </Form>
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
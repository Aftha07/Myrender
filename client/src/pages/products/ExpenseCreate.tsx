import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertProductSchema, type InsertProduct } from "@shared/schema";
import { z } from "zod";

const expenseSchema = insertProductSchema.extend({
  type: z.literal("expense"),
  nameEnglish: z.string().min(1, "Name in English is required"),
  nameArabic: z.string().optional(),
  productId: z.string().min(1, "Expense ID is required"),
  category: z.string().default("Default Category"),
  description: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  tax: z.string().default("Vat 15%"),
  buyingPrice: z.string().min(0, "Buying price must be 0 or greater"),
  purchasesAccount: z.string().default("Purchases")
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpenseCreate() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch units from database
  const { data: units = [] } = useQuery({
    queryKey: ["/api/units"],
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      type: "expense",
      nameEnglish: "",
      nameArabic: "",
      productId: "",
      category: "Default Category",
      description: "",
      unit: "", 
      tax: "Vat 15%",
      buyingPrice: "0",
      purchasesAccount: "Purchases"
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const response = await apiRequest("POST", "/api/products", data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create expense');
      }
      return await response.json();
    },
    onSuccess: (newExpense) => {
      // Optimistic update - add the new expense to the cache immediately
      queryClient.setQueryData(["/api/products"], (oldData: any) => {
        if (oldData) {
          return [newExpense, ...oldData];
        }
        return [newExpense];
      });
      
      // Also invalidate to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      
      toast({
        title: "Success",
        description: "Expense created successfully",
      });
      setLocation("/products/services");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createExpense.mutate(data);
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
            <span className="text-teal-600 font-medium">New Expense</span>
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
                        placeholder="Enter expense ID manually"
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
                        <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                        <SelectItem value="Travel">Travel</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
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

              {/* Buying Price */}
              <FormField
                control={form.control}
                name="buyingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Buying Price</FormLabel>
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

              {/* Purchases Account */}
              <FormField
                control={form.control}
                name="purchasesAccount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Purchases Account</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Purchases">Purchases</SelectItem>
                        <SelectItem value="Expenses">Expenses</SelectItem>
                        <SelectItem value="Office Expenses">Office Expenses</SelectItem>
                        <SelectItem value="Travel Expenses">Travel Expenses</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-6">
                <Button 
                  type="submit" 
                  disabled={createExpense.isPending}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-8"
                >
                  {createExpense.isPending ? "Creating..." : "Create Expense"}
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
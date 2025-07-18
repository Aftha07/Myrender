import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sidebar } from "@/components/Sidebar";
import { ArrowLeft, Calendar as CalendarIcon, Plus, Trash2, Save, ChevronDown, Upload, X } from "lucide-react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { insertProformaInvoiceSchema } from "@shared/schema";
import type { Customer } from "@shared/schema";
import { z } from "zod";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

const proformaInvoiceFormSchema = insertProformaInvoiceSchema.extend({
  items: z.array(z.object({
    productService: z.string(),
    description: z.string(),
    qty: z.number(),
    unitPrice: z.number(),
    discountPercent: z.number(),
    vatPercent: z.number(),
    vatValue: z.number(),
    amount: z.number(),
  })).min(1, "At least one item is required"),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
});

type ProformaInvoiceFormData = z.infer<typeof proformaInvoiceFormSchema>;

interface ProformaInvoiceCreateProps {
  onLogout: () => void;
}

export default function ProformaInvoiceCreate({ onLogout }: ProformaInvoiceCreateProps) {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [termsContent, setTermsContent] = useState("");
  const [notesContent, setNotesContent] = useState("");

  // Prefetch data with aggressive caching for instant loading
  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: nextReference } = useQuery<{ reference: string }>({
    queryKey: ["/api/proforma-invoices/next-reference"],
    staleTime: 0, // Always fresh for reference
    retry: false,
    refetchOnWindowFocus: false,
  });

  const form = useForm<ProformaInvoiceFormData>({
    resolver: zodResolver(proformaInvoiceFormSchema),
    defaultValues: {
      referenceId: "",
      customerId: "",
      description: "",
      issueDate: new Date(),
      termsAndConditions: "",
      notes: "",
      items: [
        {
          productService: "",
          description: "",
          qty: 1,
          unitPrice: 0,
          discountPercent: 0,
          vatPercent: 15,
          vatValue: 0,
          amount: 0,
        }
      ],
      discountPercent: "0",
      vatPercent: "15",
      subtotal: "0",
      discount: "0",
      vatAmount: "0",
      totalAmount: "0",
      status: "draft",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Handle product selection - memoized for performance
  const handleProductSelect = useCallback((index: number, productId: string) => {
    const selectedProduct = products.find((p: any) => p.id === productId);
    if (selectedProduct) {
      const currentItems = form.getValues("items");
      const updatedItems = [...currentItems];
      
      // Get the product name for display
      const productName = selectedProduct.nameEnglish || selectedProduct.nameArabic || 'Unnamed Product';
      
      updatedItems[index] = {
        ...updatedItems[index],
        productService: productId,
        description: `${productName} - ${selectedProduct.description || ''}`.trim(),
        unitPrice: parseFloat(selectedProduct.sellingPrice || selectedProduct.buyingPrice || 0),
        vatPercent: parseFloat(selectedProduct.tax?.replace(/[^0-9.]/g, '') || 15),
      };
      form.setValue("items", updatedItems);
      
      // Recalculate amounts
      updateItemCalculations(index, "unitPrice", updatedItems[index].unitPrice);
    }
  }, [products, form]);

  const updateItemCalculations = useCallback((index: number, field: string, value: any) => {
    const currentItems = form.getValues("items");
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate VAT value and amount
    const item = updatedItems[index];
    const qty = Number(item.qty) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountPercent = Number(item.discountPercent) || 0;
    const vatPercent = Number(item.vatPercent) || 0;
    
    const subtotal = qty * unitPrice;
    const discountAmount = subtotal * (discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatValue = afterDiscount * (vatPercent / 100);
    const amount = afterDiscount + vatValue;
    
    updatedItems[index] = {
      ...item,
      vatValue: Number(vatValue.toFixed(2)),
      amount: Number(amount.toFixed(2))
    };
    
    form.setValue("items", updatedItems);
  }, [form]);

  const watchedItems = form.watch("items");
  const watchedDiscountPercent = form.watch("discountPercent");

  useEffect(() => {
    if (nextReference?.reference) {
      form.setValue("referenceId", nextReference.reference);
    }
  }, [nextReference, form]);

  const calculateTotals = useCallback(() => {
    let subtotal = 0;
    let totalVat = 0;
    let totalDiscount = 0;

    const items = form.getValues("items");
    
    items.forEach((item) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const discountPercent = Number(item.discountPercent) || 0;
      const vatPercent = Number(item.vatPercent) || 0;
      
      const itemSubtotal = qty * unitPrice;
      const discountAmount = itemSubtotal * (discountPercent / 100);
      const afterDiscount = itemSubtotal - discountAmount;
      const vatValue = afterDiscount * (vatPercent / 100);
      
      subtotal += itemSubtotal;
      totalDiscount += discountAmount;
      totalVat += vatValue;
    });

    const discountPercent = parseFloat(form.getValues("discountPercent")) || 0;
    const globalDiscount = (subtotal * discountPercent) / 100;
    const finalSubtotal = subtotal - totalDiscount - globalDiscount;
    const totalAmount = finalSubtotal + totalVat;

    form.setValue("subtotal", subtotal.toFixed(2));
    form.setValue("discount", (totalDiscount + globalDiscount).toFixed(2));
    form.setValue("vatAmount", totalVat.toFixed(2));
    form.setValue("totalAmount", totalAmount.toFixed(2));
  }, [form]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateTotals();
    }, 500); // Increased debounce for better performance

    return () => clearTimeout(timeoutId);
  }, [watchedItems, watchedDiscountPercent, calculateTotals]);

  const createProformaInvoiceMutation = useMutation({
    mutationFn: async (data: ProformaInvoiceFormData) => {
      console.log("Making API request with data:", data);
      const response = await apiRequest("POST", "/api/proforma-invoices", data);
      console.log("API response:", response);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      toast({
        title: t("Success"),
        description: t("Proforma invoice created successfully"),
      });
      setLocation("/sales/proforma-invoices");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("Error"),
        description: t("Failed to create proforma invoice"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProformaInvoiceFormData) => {
    const submissionData = {
      ...data,
      termsAndConditions: termsContent,
      notes: notesContent,
      attachments: attachments
    };
    console.log("Form data being submitted:", submissionData);
    createProformaInvoiceMutation.mutate(submissionData);
  };

  const handleCustomerChange = useCallback((customerId: string) => {
    const customer = (customers as Customer[]).find((c: Customer) => c.id === customerId);
    setSelectedCustomer(customer || null);
    form.setValue("customerId", customerId);
  }, [customers, form]);

  const addNewItem = useCallback(() => {
    append({
      productService: "",
      description: "",
      qty: 1,
      unitPrice: 0,
      discountPercent: 0,
      vatPercent: 15,
      vatValue: 0,
      amount: 0,
    });
  }, [append]);

  const clearAllItems = useCallback(() => {
    form.setValue("items", [
      {
        productService: "",
        description: "",
        qty: 1,
        unitPrice: 0,
        discountPercent: 0,
        vatPercent: 15,
        vatValue: 0,
        amount: 0,
      }
    ]);
  }, [form]);

  // Optimized loading state with skeleton
  const isInitialLoading = customersLoading || productsLoading;
  
  // Memoize customer options for better performance
  const customerOptions = useMemo(() => {
    return customers.map((customer: Customer) => ({
      value: customer.id,
      label: customer.customerName,
      customer
    }));
  }, [customers]);

  // Memoize product options for better performance
  const productOptions = useMemo(() => {
    return products.map((product: any) => ({
      value: product.id,
      label: product.nameEnglish || product.nameArabic || 'Unnamed Product',
      product
    }));
  }, [products]);

  if (isInitialLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="flex">
          <Sidebar onLogout={onLogout} />
          <div className="flex-1 p-6">
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex">
        <Sidebar onLogout={onLogout} />
        
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <span className="text-teal-600">{t('Sales')}</span>
              <span className="mx-2">/</span>
              <span className="text-teal-600">{t('Proforma invoices')}</span>
              <span className="mx-2">/</span>
              <span>{t('Create Proforma Invoice')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/sales/proforma-invoices")}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {t('Create Proforma Invoice')}
                </h1>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                type="submit"
                form="proforma-invoice-form"
                disabled={createProformaInvoiceMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {createProformaInvoiceMutation.isPending ? "Saving..." : t('Save')}
              </Button>
            </div>
          </div>

          <Form {...form}>
            <form id="proforma-invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('Proforma Invoice Details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="referenceId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('Reference ID')}</FormLabel>
                              <FormControl>
                                <Input {...field} readOnly className="bg-gray-50" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="issueDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('Issue Date')}</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "dd-MM-yyyy")
                                      ) : (
                                        <span>{t('Pick a date')}</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Description')} ({t('optional')})</FormLabel>
                            <FormControl>
                              <Textarea {...field} value={field.value || ""} rows={4} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Customer')}</FormLabel>
                            <Select onValueChange={handleCustomerChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('Please select customer')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customerOptions.map(({ value, label }) => (
                                  <SelectItem key={value} value={value}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Items Table */}
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-8">#</TableHead>
                              <TableHead>{t('Products / Services')}</TableHead>
                              <TableHead>{t('Description')}</TableHead>
                              <TableHead>{t('Qty')}</TableHead>
                              <TableHead>{t('Unit Price')}</TableHead>
                              <TableHead>{t('Discount %')}</TableHead>
                              <TableHead>{t('Vat %')}</TableHead>
                              <TableHead>{t('Vat Value')}</TableHead>
                              <TableHead>{t('Amount')}</TableHead>
                              <TableHead className="w-8"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {form.watch("items").map((item, index) => (
                              <TableRow key={index}>
                                <TableCell className="text-center">{index + 1}</TableCell>
                                <TableCell>
                                  <Select 
                                    value={item.productService} 
                                    onValueChange={(value) => handleProductSelect(index, value)}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {productOptions.map(({ value, label, product }) => (
                                        <SelectItem key={value} value={value}>
                                          <div className="flex justify-between items-center w-full">
                                            <div className="flex flex-col">
                                              <span className="font-medium text-sm">
                                                {label}
                                              </span>
                                              <span className="text-xs text-gray-500 capitalize">
                                                {product.type}
                                              </span>
                                            </div>
                                            <span className="text-xs text-gray-600 font-medium">
                                              {product.sellingPrice || product.buyingPrice || 0} ر.س
                                            </span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    className="w-40" 
                                    placeholder="Product description"
                                    value={item.description}
                                    onChange={(e) => updateItemCalculations(index, "description", e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={item.qty === 1 ? "" : item.qty || ""}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      updateItemCalculations(index, "qty", parseFloat(value) || 1);
                                    }}
                                    placeholder="0"
                                    onFocus={(e) => e.target.select()}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    className="w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={item.unitPrice}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      updateItemCalculations(index, "unitPrice", parseFloat(value) || 0);
                                    }}
                                    placeholder="0.00"
                                    onFocus={(e) => e.target.select()}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={item.discountPercent || ""}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      updateItemCalculations(index, "discountPercent", parseFloat(value) || 0);
                                    }}
                                    placeholder="0"
                                    onFocus={(e) => e.target.select()}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    type="text" 
                                    className="w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    value={item.vatPercent || ""}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/[^0-9.]/g, '');
                                      updateItemCalculations(index, "vatPercent", parseFloat(value) || 0);
                                    }}
                                    placeholder="15"
                                    onFocus={(e) => e.target.select()}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    value={typeof item.vatValue === 'number' ? item.vatValue.toFixed(2) : '0.00'}
                                    readOnly 
                                    className="w-24 bg-gray-50"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input 
                                    value={typeof item.amount === 'number' ? item.amount.toFixed(2) : '0.00'}
                                    readOnly 
                                    className="w-24 bg-gray-50"
                                  />
                                </TableCell>
                                <TableCell>
                                  {form.watch("items").length > 1 && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => remove(index)}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="p-4 border-t flex gap-2">
                        <Button type="button" variant="outline" onClick={addNewItem}>
                          <Plus className="w-4 h-4 mr-2" />
                          {t('Add new record')}
                        </Button>
                        <Button type="button" variant="outline" onClick={clearAllItems}>
                          {t('Clear all')}
                        </Button>
                      </div>

                      {/* Summary */}
                      <div className="grid grid-cols-2 gap-8 mt-8 px-4 pb-4">
                        <div></div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>{t('Discount')}:</span>
                            <span>
                              {form.watch("items").reduce((sum, item) => sum + (item.qty * item.unitPrice * item.discountPercent / 100), 0).toFixed(2)} %
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('Gross')}:</span>
                            <span>
                              {form.watch("items").reduce((sum, item) => sum + (item.qty * item.unitPrice), 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t('Vat %')}:</span>
                            <span>
                              {form.watch("items").reduce((sum, item) => sum + (item.vatValue || 0), 0).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold border-t pt-2">
                            <span>{t('Total Amount')}:</span>
                            <span>
                              {form.watch("items").reduce((sum, item) => sum + (item.amount || 0), 0).toFixed(2)} ر.س
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Terms and Conditions */}
                  <Card>
                    <Collapsible open={termsExpanded} onOpenChange={setTermsExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-4">
                          <span className="font-semibold">{t('Terms and Conditions')}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${termsExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <RichTextEditor
                            content={termsContent}
                            onChange={(content) => {
                              setTermsContent(content);
                              form.setValue("termsAndConditions", content);
                            }}
                            placeholder={t('Enter terms and conditions')}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-4">
                          <span className="font-semibold">{t('Notes')}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${notesExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <RichTextEditor
                            content={notesContent}
                            onChange={(content) => {
                              setNotesContent(content);
                              form.setValue("notes", content);
                            }}
                            placeholder={t('Enter additional notes')}
                          />
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                  {/* Attachments */}
                  <Card>
                    <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-4">
                          <span className="font-semibold">{t('Attachments')}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${attachmentsExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            <div className="text-sm text-gray-600 mb-2">
                              Attachments ( Maximum size is 30MB )
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={async (e) => {
                                  const files = e.target.files;
                                  if (files && files.length > 0) {
                                    const formData = new FormData();
                                    Array.from(files).forEach(file => {
                                      formData.append('attachments', file);
                                    });

                                    try {
                                      const response = await fetch('/api/upload', {
                                        method: 'POST',
                                        body: formData
                                      });

                                      if (response.ok) {
                                        const result = await response.json();
                                        setAttachments(prev => [...prev, ...result.files]);
                                        toast({
                                          title: "Success",
                                          description: `${result.files.length} files uploaded successfully`,
                                        });
                                      } else {
                                        throw new Error('Upload failed');
                                      }
                                    } catch (error) {
                                      toast({
                                        title: "Error",
                                        description: "Failed to upload files",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                                className="hidden"
                                id="attachment-upload"
                              />
                              <label
                                htmlFor="attachment-upload"
                                className="cursor-pointer flex flex-col items-center justify-center"
                              >
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-600">
                                  Click to upload or drag and drop
                                </span>
                                <span className="text-xs text-gray-500 mt-1">
                                  SVG, PNG, JPG or GIF (MAX. 30MB)
                                </span>
                              </label>
                            </div>
                            
                            {/* Display uploaded attachments */}
                            {attachments.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="font-medium text-sm">Uploaded Files:</h4>
                                {attachments.map((file, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span className="text-sm">{file.originalname}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setAttachments(prev => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>

                </div>

                {/* Customer Details & Totals */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('Customer Details')}:</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedCustomer ? (
                        <div className="space-y-2">
                          <div>
                            <strong>{t('Phone')}:</strong>
                            <div className="text-sm text-gray-600">{selectedCustomer.phone || "N/A"}</div>
                          </div>
                          <div>
                            <strong>{t('Email')}:</strong>
                            <div className="text-sm text-gray-600">{selectedCustomer.email || "N/A"}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">
                          {t('Select a customer to view details')}
                        </div>
                      )}
                    </CardContent>
                  </Card>






                </div>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
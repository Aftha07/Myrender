import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ArrowLeft, Calendar as CalendarIcon, Plus, Trash2, FileText, Save, ChevronDown } from "lucide-react";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { insertInvoiceSchema } from "@shared/schema";
import type { Customer, Product } from "@shared/schema";
import { z } from "zod";

const invoiceFormSchema = insertInvoiceSchema.extend({
  items: z.array(z.object({
    product: z.string().min(1, "Product is required"),
    productService: z.string().optional(), // Store product ID
    qty: z.number().min(0.01, "Quantity must be greater than 0"),
    unitPrice: z.string().min(1, "Unit price is required"),
    vatPercent: z.string().default("15"),
    vatValue: z.string().default("0"),
    amount: z.string().default("0"),
  })).min(1, "At least one item is required"),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceCreateProps {
  onLogout: () => void;
}

interface AttachedFile {
  file: File;
  preview?: string;
}

export default function InvoiceCreate({ onLogout }: InvoiceCreateProps) {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [notesContent, setNotesContent] = useState("");

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    retry: false,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { data: nextReference } = useQuery<{ reference: string }>({
    queryKey: ["/api/invoices/next-reference"],
    retry: false,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      referenceId: "",
      customerId: "",
      description: "",
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      costCenter: "Main Center",
      paymentTerm: "",
      supplyDate: new Date(),
      termsAndConditions: "",
      notes: "",
      items: [
        {
          product: "",
          productService: "",
          qty: 1,
          unitPrice: "0",
          vatPercent: "15",
          vatValue: "0",
          amount: "0",
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

  // Set reference ID when available
  useEffect(() => {
    if (nextReference?.reference) {
      form.setValue("referenceId", nextReference.reference);
    }
  }, [nextReference, form]);

  // Update customer details when selected
  useEffect(() => {
    const customerId = form.watch("customerId");
    if (customerId) {
      const customer = customers.find(c => c.id === customerId);
      setSelectedCustomer(customer || null);
    }
  }, [form.watch("customerId"), customers]);

  // Calculate totals when items change
  const calculateTotals = useCallback(() => {
    let subtotal = 0;
    let totalVat = 0;

    const items = form.getValues("items");
    
    items.forEach((item, index) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = parseFloat(item.unitPrice || "0") || 0;
      const vatPercent = parseFloat(item.vatPercent || "15") || 15;
      
      const amount = qty * unitPrice;
      const vatValue = (amount * vatPercent) / 100;
      
      subtotal += amount;
      totalVat += vatValue;

      // Update individual item calculations without triggering watch
      const currentAmount = form.getValues(`items.${index}.amount`);
      const currentVatValue = form.getValues(`items.${index}.vatValue`);
      
      if (currentAmount !== amount.toFixed(2)) {
        form.setValue(`items.${index}.amount`, amount.toFixed(2), { shouldValidate: false, shouldDirty: false });
      }
      if (currentVatValue !== vatValue.toFixed(2)) {
        form.setValue(`items.${index}.vatValue`, vatValue.toFixed(2), { shouldValidate: false, shouldDirty: false });
      }
    });

    const discountPercent = parseFloat(form.getValues("discountPercent") || "0") || 0;
    const discount = (subtotal * discountPercent) / 100;
    const total = subtotal - discount + totalVat;

    // Update totals without triggering watch
    form.setValue("subtotal", subtotal.toFixed(2), { shouldValidate: false, shouldDirty: false });
    form.setValue("discount", discount.toFixed(2), { shouldValidate: false, shouldDirty: false });
    form.setValue("vatAmount", totalVat.toFixed(2), { shouldValidate: false, shouldDirty: false });
    form.setValue("totalAmount", total.toFixed(2), { shouldValidate: false, shouldDirty: false });
  }, [form]);

  // Handle product selection
  const handleProductSelect = useCallback((productId: string, itemIndex: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      // Set the unit price from the product's selling price
      form.setValue(`items.${itemIndex}.unitPrice`, product.sellingPrice || "0");
      
      // Extract VAT percentage from tax field (e.g., "Vat 15%" -> "15")
      const vatMatch = product.tax?.match(/(\d+)%/);
      const vatPercent = vatMatch ? vatMatch[1] : "15";
      form.setValue(`items.${itemIndex}.vatPercent`, vatPercent);
      
      // Trigger calculation
      setTimeout(() => calculateTotals(), 100);
    }
  }, [products, form, calculateTotals]);

  // Watch for specific field changes and recalculate
  const watchedItems = form.watch("items");
  const watchedDiscountPercent = form.watch("discountPercent");
  
  useEffect(() => {
    calculateTotals();
  }, [watchedItems, watchedDiscountPercent, calculateTotals]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      // Prepare the invoice data with attached files and ensure all fields
      const invoiceData = {
        ...data,
        attachments: attachedFiles.map(af => af.file.name).join(', '), // Store file names
        invoiceType: data.invoiceType || 'invoice',
        paymentMethod: data.paymentMethod || 'cash',
        isPartialPayment: data.isPartialPayment || false,
        isTaxExempt: data.isTaxExempt || false
      };
      
      const response = await apiRequest("POST", "/api/invoices", invoiceData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t("Success"),
        description: t("Invoice saved successfully"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setLocation("/sales/invoices");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: t("Unauthorized"),
          description: t("You are logged out. Logging in again..."),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("Error"),
        description: t("Failed to save invoice"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    // Map items to ensure productService is properly set and convert dates
    const processedData = {
      ...data,
      issueDate: data.issueDate instanceof Date ? data.issueDate : new Date(data.issueDate),
      dueDate: data.dueDate instanceof Date ? data.dueDate : new Date(data.dueDate),
      supplyDate: data.supplyDate instanceof Date ? data.supplyDate : new Date(data.supplyDate),
      items: data.items.map(item => ({
        ...item,
        productService: item.productService || '', // Ensure productService is not undefined
        product: item.product || '' // Ensure product description is not undefined
      }))
    };
    
    createInvoiceMutation.mutate(processedData);
  };

  const addItem = () => {
    append({
      product: "",
      productService: "",
      qty: 1,
      unitPrice: "0",
      vatPercent: "15",
      vatValue: "0",
      amount: "0",
    });
  };

  const clearAllItems = () => {
    // Clear all items and reset to one empty item
    form.setValue("items", [{
      product: "",
      productService: "",
      qty: 1,
      unitPrice: "0",
      vatPercent: "15",
      vatValue: "0",
      amount: "0",
    }]);
    // Reset totals
    calculateTotals();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    const filePromises = files.map(async (file) => {
      const attachedFile: AttachedFile = { file };
      
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        // Create preview URL for images
        const reader = new FileReader();
        const preview = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        attachedFile.preview = preview;
      }
      
      return attachedFile;
    });
    
    const processedFiles = await Promise.all(filePromises);
    setAttachedFiles(prev => [...prev, ...processedFiles]);
    
    // Clear the input value to allow selecting the same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span>{t('Sales')}</span>
            <span>/</span>
            <span>{t('Invoices')}</span>
            <span>/</span>
            <span className="text-gray-900">{t('Create Tax Invoice')}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation("/sales/invoices")}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <FileText className="w-6 h-6 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">{t('Create Tax Invoice')}</h1>
                </div>
              </div>
            </div>
            
            <Button 
              type="submit"
              form="invoice-form"
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              variant="outline"
              disabled={createInvoiceMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createInvoiceMutation.isPending ? t('Saving...') : t('Save')}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <form id="invoice-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Invoice Details */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="referenceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Reference ID')} *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="INV001" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Description')} ({t('optional')})</FormLabel>
                            <FormControl>
                              <Textarea {...field} rows={3} />
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
                            <FormLabel>{t('Customer')} *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('Please select customer')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customers.map((customer) => (
                                  <SelectItem key={customer.id} value={customer.id}>
                                    {customer.customerName}
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
                        name="issueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Invoice Date')} *</FormLabel>
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
                                  disabled={(date) =>
                                    date > new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="costCenter"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Cost Center')} *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Main Center">{t('Main Center')}</SelectItem>
                                <SelectItem value="Branch 1">{t('Branch 1')}</SelectItem>
                                <SelectItem value="Branch 2">{t('Branch 2')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="paymentTerm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Payment Term')} *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('Select payment term')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="net_15">{t('Net 15')}</SelectItem>
                                <SelectItem value="net_30">{t('Net 30')}</SelectItem>
                                <SelectItem value="net_60">{t('Net 60')}</SelectItem>
                                <SelectItem value="due_on_receipt">{t('Due on Receipt')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="supplyDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Supply Date')} *</FormLabel>
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
                                  disabled={(date) =>
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Items Section */}
                <Card>
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold mb-2">{t('Products / Services')}</h3>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 px-2 font-medium text-gray-700 w-8">#</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-700">{t('Products / Services')}</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-700 w-20">{t('Qty')}</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">{t('Unit Price')}</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-700 w-20">{t('Vat %')}</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">{t('Vat Value')}</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-700 w-24">{t('Amount')}</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((field, index) => (
                            <tr key={field.id} className="border-b border-gray-100">
                              <td className="py-2 px-2 text-center">{index + 1}</td>
                              <td className="py-2 px-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productService`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <Select 
                                        value={field.value} 
                                        onValueChange={(value) => {
                                          field.onChange(value);
                                          handleProductSelect(value, index);
                                          // Also set the product description
                                          const product = products.find(p => p.id === value);
                                          if (product) {
                                            form.setValue(`items.${index}.product`, product.nameEnglish);
                                          }
                                        }}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={t('Select product/service')} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {products.map((product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                              {product.nameEnglish} {product.productId && `(${product.productId})`}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.qty`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          {...field}
                                          onChange={(e) => {
                                            field.onChange(Number(e.target.value));
                                            setTimeout(() => calculateTotals(), 100);
                                          }}
                                          min="0"
                                          step="0.01"
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="0"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            setTimeout(() => calculateTotals(), 100);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.vatPercent`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="15"
                                          onChange={(e) => {
                                            field.onChange(e);
                                            setTimeout(() => calculateTotals(), 100);
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.vatValue`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input {...field} readOnly className="bg-gray-50" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.amount`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input {...field} readOnly className="bg-gray-50" />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </td>
                              <td className="py-2 px-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  disabled={fields.length === 1}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addItem}
                        className="text-teal-600 border-teal-600 hover:bg-teal-50"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        {t('Add new record')}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-gray-600"
                        onClick={clearAllItems}
                      >
                        {t('Clear all')}
                      </Button>
                    </div>

                    {/* Totals */}
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('Gross')}:</span>
                            <span className="font-medium">{form.watch("subtotal")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('Vat %')}:</span>
                            <span className="font-medium">{form.watch("vatAmount")}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-900 font-semibold">{t('Total Amount')}:</span>
                            <span className="font-semibold">{form.watch("totalAmount")}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-red-600">
                        {t('Products with quantity less than 1 will not be displayed')}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Collapsible Sections */}
                <div className="space-y-4">
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
                            <div className="text-sm text-gray-600">
                              {t('Attachments')} ({t('Maximum size is 30MB')})
                            </div>
                            
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                              <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                              />
                              <label
                                htmlFor="file-upload"
                                className="flex items-center justify-center cursor-pointer"
                              >
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    document.getElementById('file-upload')?.click();
                                  }}
                                >
                                  {t('Choose Files')}
                                </Button>
                              </label>
                              
                              {attachedFiles.length === 0 ? (
                                <p className="text-center text-gray-500 mt-2">{t('No file chosen')}</p>
                              ) : (
                                <div className="mt-4 space-y-2">
                                  {attachedFiles.map((attachedFile, index) => (
                                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {attachedFile.preview ? (
                                          <img 
                                            src={attachedFile.preview} 
                                            alt={attachedFile.file.name}
                                            className="w-12 h-12 object-cover rounded"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                            <FileText className="w-6 h-6 text-gray-500" />
                                          </div>
                                        )}
                                        <span className="text-sm truncate">{attachedFile.file.name}</span>
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeFile(index)}
                                        className="text-red-600 hover:text-red-700 ml-2"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </div>


              </div>

              {/* Right Column - Customer Details */}
              <div className="space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">{t('Customer Details')}:</h3>
                    
                    {selectedCustomer ? (
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm text-gray-600">{t('Phone')}:</Label>
                          <p className="text-sm">{selectedCustomer.phone || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">{t('Email')}:</Label>
                          <p className="text-sm">{selectedCustomer.email || '-'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-gray-600">{t('Outstanding Balance')}:</Label>
                          <p className="text-sm font-medium">{selectedCustomer.outstandingBalance || '0.00'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">{t('Select a customer to view details')}</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
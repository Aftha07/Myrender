import { useState, useEffect, useMemo, useCallback } from "react";
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
import { ArrowLeft, Calendar as CalendarIcon, Plus, Trash2, Save, ChevronDown, Upload, X } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { insertProformaInvoiceSchema } from "@shared/schema";
import type { Customer, ProformaInvoice, Product } from "@shared/schema";
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

export function ProformaInvoiceEdit() {
  const { id } = useParams();
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

  // Fetch proforma invoice data
  const { data: proformaInvoice, isLoading: proformaLoading } = useQuery<ProformaInvoice>({
    queryKey: [`/api/proforma-invoices/${id}`],
    enabled: !!id,
  });

  // Fetch customers
  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    staleTime: 15 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
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
      dueDate: new Date(),
      termsAndConditions: "",
      notes: "",
      items: [],
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

  // Populate form when proforma invoice data is loaded
  useEffect(() => {
    if (proformaInvoice) {
      form.reset({
        referenceId: proformaInvoice.referenceId,
        customerId: proformaInvoice.customerId,
        description: proformaInvoice.description || "",
        issueDate: new Date(proformaInvoice.issueDate),
        dueDate: new Date(proformaInvoice.dueDate),
        termsAndConditions: proformaInvoice.termsAndConditions || "",
        notes: proformaInvoice.notes || "",
        items: proformaInvoice.items || [],
        discountPercent: proformaInvoice.discountPercent || "0",
        vatPercent: proformaInvoice.vatPercent || "15",
        subtotal: proformaInvoice.subtotal || "0",
        discount: proformaInvoice.discount || "0",
        vatAmount: proformaInvoice.vatAmount || "0",
        totalAmount: proformaInvoice.totalAmount || "0",
        status: proformaInvoice.status || "draft",
      });
      
      setTermsContent(proformaInvoice.termsAndConditions || "");
      setNotesContent(proformaInvoice.notes || "");
      setAttachments(proformaInvoice.attachments || []);
      
      // Expand sections if they have content
      if (proformaInvoice.termsAndConditions) {
        setTermsExpanded(true);
      }
      if (proformaInvoice.notes) {
        setNotesExpanded(true);
      }
      if (proformaInvoice.attachments && proformaInvoice.attachments.length > 0) {
        setAttachmentsExpanded(true);
      }
      
      // Set selected customer
      if (proformaInvoice.customerId) {
        const customer = customers.find(c => c.id === proformaInvoice.customerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
      }
    }
  }, [proformaInvoice, customers, form]);

  // Memoized dropdown options for performance
  const customerOptions = useMemo(() => 
    customers.map(customer => ({
      value: customer.id,
      label: customer.customerName,
    }))
  , [customers]);

  const productOptions = useMemo(() => 
    products.map(product => ({
      value: product.id,
      label: product.nameEnglish,
      price: product.sellingPrice,
    }))
  , [products]);

  // Debounced calculation function
  const debouncedCalculate = useCallback(
    useMemo(() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          calculateTotals();
        }, 300);
      };
    }, [])
  , []);

  const calculateTotals = useCallback(() => {
    const items = form.getValues("items");
    const globalDiscountPercent = parseFloat(form.getValues("discountPercent") || "0");
    const globalVatPercent = parseFloat(form.getValues("vatPercent") || "15");
    
    let subtotal = 0;
    
    items.forEach((item, index) => {
      const qty = item.qty || 0;
      const unitPrice = item.unitPrice || 0;
      const itemDiscountPercent = item.discountPercent || 0;
      const itemVatPercent = item.vatPercent || 15;
      
      const lineTotal = qty * unitPrice;
      const discountAmount = lineTotal * (itemDiscountPercent / 100);
      const afterDiscount = lineTotal - discountAmount;
      const vatAmount = afterDiscount * (itemVatPercent / 100);
      const itemTotal = afterDiscount + vatAmount;
      
      form.setValue(`items.${index}.vatValue`, vatAmount);
      form.setValue(`items.${index}.amount`, itemTotal);
      
      subtotal += lineTotal;
    });
    
    const globalDiscountAmount = subtotal * (globalDiscountPercent / 100);
    const afterGlobalDiscount = subtotal - globalDiscountAmount;
    const globalVatAmount = afterGlobalDiscount * (globalVatPercent / 100);
    const totalAmount = afterGlobalDiscount + globalVatAmount;
    
    form.setValue("subtotal", subtotal.toFixed(2));
    form.setValue("discount", globalDiscountAmount.toFixed(2));
    form.setValue("vatAmount", globalVatAmount.toFixed(2));
    form.setValue("totalAmount", totalAmount.toFixed(2));
  }, [form]);

  // Handle product selection
  const handleProductSelect = useCallback((index: number, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      form.setValue(`items.${index}.productService`, productId);
      form.setValue(`items.${index}.description`, selectedProduct.nameEnglish);
      form.setValue(`items.${index}.unitPrice`, parseFloat(selectedProduct.sellingPrice) || 0);
      debouncedCalculate();
    }
  }, [products, form, debouncedCalculate]);

  // Update mutation for saving changes
  const updateMutation = useMutation({
    mutationFn: async (data: ProformaInvoiceFormData) => {
      const requestData = {
        ...data,
        termsAndConditions: termsContent,
        notes: notesContent,
        attachments: attachments.map(att => ({
          originalName: att.originalName,
          filename: att.filename,
          path: att.path,
          size: att.size,
          mimetype: att.mimetype
        }))
      };
      
      return apiRequest('PUT', `/api/proforma-invoices/${id}`, requestData);
    },
    onSuccess: () => {
      toast({
        title: t('Success'),
        description: t('Proforma invoice updated successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/proforma-invoices'] });
      setLocation('/sales/proforma-invoices');
    },
    onError: (error: any) => {
      toast({
        title: t('Error'),
        description: error.message || t('Failed to update proforma invoice'),
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ProformaInvoiceFormData) => {
    updateMutation.mutate(data);
  };

  const handleBack = () => {
    setLocation('/sales/proforma-invoices');
  };

  const addItem = () => {
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
  };

  const removeItem = (index: number) => {
    remove(index);
    debouncedCalculate();
  };

  if (proformaLoading || customersLoading || productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!proformaInvoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('Proforma Invoice Not Found')}</h2>
          <p className="text-gray-600 mb-4">{t('The proforma invoice you are looking for does not exist.')}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('Back to List')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <span className="text-teal-600">{t('Sales')}</span>
                <span className="mx-2">/</span>
                <span>{t('Proforma invoices')}</span>
                <span className="mx-2">/</span>
                <span>{t('Edit')}</span>
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('Edit Proforma Invoice')} #{proformaInvoice.referenceId}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('Back')}
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? t('Saving...') : t('Save')}
              </Button>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-3 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Basic Information')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="referenceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Reference ID')}</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder={t('Enter reference ID')} />
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
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              const customer = customers.find(c => c.id === value);
                              setSelectedCustomer(customer || null);
                            }} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('Select customer')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {customerOptions.map((customer) => (
                                  <SelectItem key={customer.value} value={customer.value}>
                                    {customer.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
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
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('Due Date')}</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
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
                                    date < new Date()
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
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Description')}</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder={t('Enter description')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Items */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{t('Items')}</CardTitle>
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('Add Item')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{t('Product/Service')}</TableHead>
                            <TableHead>{t('Description')}</TableHead>
                            <TableHead>{t('Qty')}</TableHead>
                            <TableHead>{t('Unit Price')}</TableHead>
                            <TableHead>{t('Discount %')}</TableHead>
                            <TableHead>{t('VAT %')}</TableHead>
                            <TableHead>{t('Amount')}</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell className="w-48">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productService`}
                                  render={({ field }) => (
                                    <Select onValueChange={(value) => handleProductSelect(index, value)} value={field.value}>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('Select product')} />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {productOptions.map((product) => (
                                          <SelectItem key={product.value} value={product.value}>
                                            {product.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-48">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.description`}
                                  render={({ field }) => (
                                    <Input {...field} placeholder={t('Description')} />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-20">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.qty`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                        debouncedCalculate();
                                      }}
                                      className="text-right"
                                      min="0"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-24">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                        debouncedCalculate();
                                      }}
                                      className="text-right"
                                      min="0"
                                      step="0.01"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-20">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.discountPercent`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                        debouncedCalculate();
                                      }}
                                      className="text-right"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-20">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.vatPercent`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      onChange={(e) => {
                                        field.onChange(Number(e.target.value));
                                        debouncedCalculate();
                                      }}
                                      className="text-right"
                                      min="0"
                                      max="100"
                                      step="0.01"
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell className="w-24">
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.amount`}
                                  render={({ field }) => (
                                    <Input
                                      type="number"
                                      {...field}
                                      className="text-right"
                                      readOnly
                                      value={field.value?.toFixed(2) || '0.00'}
                                    />
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(index)}
                                  disabled={fields.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Terms and Conditions */}
                <Collapsible open={termsExpanded} onOpenChange={setTermsExpanded}>
                  <Card>
                    <CardHeader>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                          <CardTitle>{t('Terms and Conditions')}</CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${termsExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <RichTextEditor
                          value={termsContent}
                          onChange={setTermsContent}
                          placeholder={t('Enter terms and conditions...')}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Notes */}
                <Collapsible open={notesExpanded} onOpenChange={setNotesExpanded}>
                  <Card>
                    <CardHeader>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                          <CardTitle>{t('Notes')}</CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${notesExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <RichTextEditor
                          value={notesContent}
                          onChange={setNotesContent}
                          placeholder={t('Enter notes...')}
                        />
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>

                {/* Attachments */}
                <Collapsible open={attachmentsExpanded} onOpenChange={setAttachmentsExpanded}>
                  <Card>
                    <CardHeader>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between p-0">
                          <CardTitle>{t('Attachments')}</CardTitle>
                          <ChevronDown className={`h-4 w-4 transition-transform ${attachmentsExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent>
                        <div className="space-y-4">
                          {attachments.map((attachment, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  {attachment.mimetype?.startsWith('image/') ? (
                                    <img 
                                      src={attachment.path} 
                                      alt={attachment.originalName}
                                      className="w-10 h-10 object-cover rounded"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                      <span className="text-xs text-gray-500">📎</span>
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="text-sm font-medium">{attachment.originalName}</div>
                                  <div className="text-xs text-gray-500">
                                    {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ''}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAttachments(attachments.filter((_, i) => i !== index));
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <input
                              type="file"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                files.forEach(file => {
                                  const attachment = {
                                    originalName: file.name,
                                    filename: file.name,
                                    path: URL.createObjectURL(file),
                                    size: file.size,
                                    mimetype: file.type
                                  };
                                  setAttachments(prev => [...prev, attachment]);
                                });
                              }}
                              className="hidden"
                              id="file-upload"
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                              <div className="text-sm text-gray-600">
                                {t('Click to upload files or drag and drop')}
                              </div>
                            </label>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </div>

              {/* Customer Details Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('Customer Details')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedCustomer ? (
                      <div className="space-y-3">
                        <div>
                          <span className="font-medium">{t('Customer Name')}</span>
                          <div className="text-sm text-gray-600">{selectedCustomer.customerName}</div>
                        </div>
                        <div>
                          <span className="font-medium">{t('Phone')}</span>
                          <div className="text-sm text-gray-600">{selectedCustomer.phone}</div>
                        </div>
                        <div>
                          <span className="font-medium">{t('Email')}</span>
                          <div className="text-sm text-gray-600">{selectedCustomer.email}</div>
                        </div>
                        <div>
                          <span className="font-medium">{t('City')}</span>
                          <div className="text-sm text-gray-600">{selectedCustomer.city}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">{t('Select a customer to view details')}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{t('Summary')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>{t('Subtotal')}</span>
                      <span>{form.watch('subtotal')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('Discount')}</span>
                      <span>{form.watch('discount')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('VAT')}</span>
                      <span>{form.watch('vatAmount')}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>{t('Total Amount')}</span>
                      <span>{form.watch('totalAmount')}</span>
                    </div>
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
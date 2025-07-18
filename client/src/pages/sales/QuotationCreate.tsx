import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Save, Calendar, Plus, Trash2, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/ui/file-upload";
import type { Customer } from "@shared/schema";

const quotationSchema = z.object({
  referenceId: z.string().min(1, "Reference ID is required"),
  description: z.string().optional(),
  customerId: z.string().min(1, "Customer is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  items: z.array(z.object({
    productService: z.string(),
    description: z.string(),
    qty: z.number(),
    unitPrice: z.number(),
    discountPercent: z.number(),
    vatPercent: z.number(),
    vatValue: z.number(),
    amount: z.number(),
  })),
  termsAndConditions: z.string().optional(),
  notes: z.string().optional(),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

export default function QuotationCreate() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [termsExpanded, setTermsExpanded] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [attachments, setAttachments] = useState<any[]>([]);

  // Fetch customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch products and services
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch next reference ID (always fresh, no caching)
  const { data: nextRefData } = useQuery<{ reference: string }>({
    queryKey: ["/api/quotations/next-reference"],
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache the result
  });
  const [termsContent, setTermsContent] = useState("");
  const [notesContent, setNotesContent] = useState("");

  const createQuotation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      // Transform form data to match backend schema
      const quotationData = {
        referenceId: data.referenceId,
        customerId: data.customerId,
        description: data.description || "",
        issueDate: data.issueDate, // Send as YYYY-MM-DD string, server will convert to Date
        dueDate: data.dueDate, // Send as YYYY-MM-DD string, server will convert to Date
        items: data.items,
        subtotal: data.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0).toFixed(2),
        discount: data.items.reduce((sum, item) => sum + (item.qty * item.unitPrice * item.discountPercent / 100), 0).toFixed(2),
        discountPercent: "0.00",
        vatAmount: data.items.reduce((sum, item) => sum + item.vatValue, 0).toFixed(2),
        vatPercent: "15.00",
        totalAmount: data.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
        status: "draft",
        termsAndConditions: termsContent,
        notes: notesContent,
        attachments: attachments
      };
      
      const response = await apiRequest("POST", "/api/quotations", quotationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation created successfully",
      });
      // Invalidate quotations cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      // Invalidate reference cache to get fresh reference for next quotation
      queryClient.invalidateQueries({ queryKey: ["/api/quotations/next-reference"] });
      setLocation("/sales/quotations");
    },
    onError: (error) => {
      console.error("Quotation creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create quotation",
        variant: "destructive",
      });
    },
  });

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      referenceId: nextRefData?.reference || "QUO00001",
      customerId: "",
      issueDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
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
    },
  });

  // Update form when next reference is loaded
  useEffect(() => {
    if (nextRefData?.reference) {
      form.setValue("referenceId", nextRefData.reference);
    }
  }, [nextRefData, form]);

  // Update selected customer when customerId changes
  const watchedCustomerId = form.watch("customerId");
  useEffect(() => {
    if (watchedCustomerId && customers.length > 0) {
      const customer = customers.find((c: Customer) => c.id === watchedCustomerId);
      setSelectedCustomer(customer || null);
    } else {
      setSelectedCustomer(null);
    }
  }, [watchedCustomerId, customers]);

  const addNewItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [
      ...currentItems,
      {
        productService: "",
        description: "",
        qty: 1,
        unitPrice: 0,
        discountPercent: 0,
        vatPercent: 0,
        vatValue: 0,
        amount: 0,
      }
    ]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    form.setValue("items", currentItems.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    const defaultItem = {
      productService: "",
      description: "",
      qty: 1,
      unitPrice: 0,
      discountPercent: 0,
      vatPercent: 0,
      vatValue: 0,
      amount: 0,
    };
    form.setValue("items", [defaultItem]);
  };

  // Update item calculations when values change
  const updateItemCalculations = (index: number, field: string, value: any) => {
    const currentItems = form.getValues("items");
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calculate VAT value and amount
    const item = updatedItems[index];
    const subtotal = item.qty * item.unitPrice;
    const discountAmount = subtotal * (item.discountPercent / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatValue = afterDiscount * (item.vatPercent / 100);
    const amount = afterDiscount + vatValue;
    
    updatedItems[index] = {
      ...item,
      vatValue: parseFloat(vatValue.toFixed(2)),
      amount: parseFloat(amount.toFixed(2))
    };
    
    form.setValue("items", updatedItems);
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: string) => {
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
  };

  const onSubmit = async (data: QuotationFormData) => {
    createQuotation.mutate(data);
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/sales/quotations">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{t('Sales')} / {t('Quotation')} / {t('Create')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              type="submit"
              form="quotation-form"
              disabled={createQuotation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {createQuotation.isPending ? "Saving..." : t('Save')}
            </Button>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Thu, 6:41 AM</span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-teal-600">VoM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quotation Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 space-y-6">
                <form id="quotation-form" onSubmit={form.handleSubmit(onSubmit)}>
                  {/* Reference ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="referenceId">
                        {t('Reference ID')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="referenceId"
                        {...form.register("referenceId")}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">{t('Description')} ({t('optional')})</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {/* Customer */}
                  <div>
                    <Label htmlFor="customer">
                      {t('Customer')} <span className="text-red-500">*</span>
                    </Label>
                    <Select value={form.watch("customerId")} onValueChange={(value) => form.setValue("customerId", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('Please select customer')} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer: Customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.customerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Issue Date */}
                  <div>
                    <Label htmlFor="issueDate">{t('Issue Date')}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="issueDate"
                        {...form.register("issueDate")}
                        className="pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <Label htmlFor="dueDate">{t('Due Date')}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="dueDate"
                        {...form.register("dueDate")}
                        className="pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Product/Service Items Table */}
            <Card className="mt-6">
              <CardContent className="p-6">
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
                                {products.map((product: any) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <div className="flex justify-between items-center w-full">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-sm">
                                          {product.nameEnglish || product.nameArabic || 'Unnamed Product'}
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
                              type="number" 
                              className="w-24"
                              value={item.vatValue}
                              readOnly
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number" 
                              className="w-24"
                              value={item.amount}
                              readOnly
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center space-x-4 mt-4">
                  <Button type="button" variant="outline" onClick={addNewItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('Add new record')}
                  </Button>
                  <Button type="button" variant="outline" onClick={clearAll}>
                    {t('Clear all')}
                  </Button>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-8 mt-8">
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
                        {form.watch("items").reduce((sum, item) => sum + item.vatValue, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>{t('Total Amount')}:</span>
                      <span>
                        {form.watch("items").reduce((sum, item) => sum + item.amount, 0).toFixed(2)} ر.س
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Collapsible Sections */}
            <div className="mt-6 space-y-4">
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
                            className="cursor-pointer inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('Choose Files')}
                          </label>
                          <p className="text-xs text-gray-500 mt-2">
                            {t('Upload images to attach to this quotation')}
                          </p>
                        </div>

                        {/* Display uploaded attachments */}
                        {attachments.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">{t('Uploaded Files')}:</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {attachments.map((file, index) => (
                                <div key={index} className="relative">
                                  <img
                                    src={file.path}
                                    alt={file.originalName}
                                    className="w-full h-32 object-cover rounded-lg border"
                                  />
                                  <button
                                    onClick={() => {
                                      setAttachments(prev => prev.filter((_, i) => i !== index));
                                    }}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                                  >
                                    ×
                                  </button>
                                  <p className="text-xs text-gray-600 mt-1 truncate">{file.originalName}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            </div>
          </div>

          {/* Right Column - Customer Details */}
          <div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-4">{t('Customer Details')}:</h3>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Customer Name')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedCustomer?.customerName || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Phone')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedCustomer?.phoneNumber || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Email')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedCustomer?.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Address')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCustomer?.address ? 
                      `${selectedCustomer.address}${selectedCustomer.city ? `, ${selectedCustomer.city}` : ''}` 
                      : "-"
                    }
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Status')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">{selectedCustomer?.status || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {t('Value of Money')} - {t('All rights reserved © 2025 VoM')}
          </p>
        </div>
      </div>
    </div>
  );
}
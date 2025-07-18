import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Save, Plus, X, ChevronDown, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

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

export default function QuotationEdit() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/sales/quotations/:id/edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const quotationId = params?.id;
  const [attachments, setAttachments] = useState<Array<{ filename: string; url: string }>>([]);
  const [attachmentsExpanded, setAttachmentsExpanded] = useState(false);

  // Fetch quotation data
  const { data: quotation, isLoading } = useQuery({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId,
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Fetch products and services
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

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
        vatPercent: 15,
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
      vatPercent: 15,
      vatValue: 0,
      amount: 0,
    };
    form.setValue("items", [defaultItem]);
  };

  const updateQuotation = useMutation({
    mutationFn: async (data: QuotationFormData) => {
      const quotationData = {
        referenceId: data.referenceId,
        customerId: data.customerId,
        description: data.description || "",
        issueDate: new Date(data.issueDate).toISOString(),
        dueDate: new Date(data.dueDate).toISOString(),
        items: data.items,
        subtotal: data.items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0).toFixed(2),
        discount: data.items.reduce((sum, item) => sum + (item.qty * item.unitPrice * item.discountPercent / 100), 0).toFixed(2),
        discountPercent: "0.00",
        vatAmount: data.items.reduce((sum, item) => sum + item.vatValue, 0).toFixed(2),
        vatPercent: "15.00",
        totalAmount: data.items.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
        termsAndConditions: data.termsAndConditions || "",
        notes: data.notes || "",
        attachments: attachments,
      };
      
      const response = await apiRequest("PUT", `/api/quotations/${quotationId}`, quotationData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotations/${quotationId}`] });
      setLocation("/sales/quotations");
    },
    onError: (error) => {
      console.error("Quotation update error:", error);
      toast({
        title: "Error",
        description: "Failed to update quotation",
        variant: "destructive",
      });
    },
  });

  const form = useForm<QuotationFormData>({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      referenceId: "",
      customerId: "",
      issueDate: "",
      dueDate: "",
      description: "",
      termsAndConditions: "",
      notes: "",
      items: [],
    },
  });

  // Update form when quotation data is loaded
  useEffect(() => {
    if (quotation) {
      form.reset({
        referenceId: quotation.referenceId,
        customerId: quotation.customerId,
        issueDate: quotation.issueDate.split('T')[0], // Convert to YYYY-MM-DD format
        dueDate: quotation.dueDate.split('T')[0], // Convert to YYYY-MM-DD format
        description: quotation.description || "",
        termsAndConditions: quotation.termsAndConditions || "",
        notes: quotation.notes || "",
        items: quotation.items || [],
      });
      // Set existing attachments
      if (quotation.attachments) {
        setAttachments(quotation.attachments);
      }
    }
  }, [quotation, form]);

  const onSubmit = async (data: QuotationFormData) => {
    updateQuotation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="text-center">Loading quotation...</div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="text-center">Quotation not found</div>
      </div>
    );
  }

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
                <span>{t('Sales')} / {t('Quotation')} / {t('Edit')}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{quotation.referenceId}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              type="submit"
              form="quotation-edit-form"
              disabled={updateQuotation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateQuotation.isPending ? "Saving..." : t('Save')}
            </Button>
            <div className="text-right">
              <div className="text-3xl font-bold text-teal-600">VoM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Quotation Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 space-y-6">
                <form id="quotation-edit-form" onSubmit={form.handleSubmit(onSubmit)}>
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
                        disabled
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
                    <Label htmlFor="customerId">
                      {t('Customer')} <span className="text-red-500">*</span>
                    </Label>
                    <Select value={form.watch("customerId")} onValueChange={(value) => form.setValue("customerId", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('Please Select Customer')} />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.customerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Issue Date and Due Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="issueDate">
                        {t('Issue Date')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="issueDate"
                        type="date"
                        {...form.register("issueDate")}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="dueDate">
                        {t('Due Date')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        {...form.register("dueDate")}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Terms and Conditions */}
                  <div>
                    <Label htmlFor="termsAndConditions">{t('Terms and Conditions')} ({t('optional')})</Label>
                    <Textarea
                      id="termsAndConditions"
                      {...form.register("termsAndConditions")}
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">{t('Notes')} ({t('optional')})</Label>
                    <Textarea
                      id="notes"
                      {...form.register("notes")}
                      className="mt-1"
                      rows={4}
                    />
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

            {/* Attachments Section */}
            <Card className="mt-6">
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
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Uploaded Files:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {attachments.map((file, index) => (
                              <div key={index} className="relative group">
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                  {/* Image preview */}
                                  <div className="aspect-square bg-gray-100 flex items-center justify-center">
                                    <img
                                      src={file.path || `/uploads/${file.filename}`}
                                      alt={file.originalName || file.filename}
                                      className="max-w-full max-h-full object-contain"
                                      onError={(e) => {
                                        // Fallback to a placeholder if image fails to load
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'flex';
                                      }}
                                    />
                                    <div className="hidden items-center justify-center text-gray-400 flex-col">
                                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                      <span className="text-xs">Image</span>
                                    </div>
                                  </div>
                                  
                                  {/* File info */}
                                  <div className="p-2">
                                    <p className="text-xs text-gray-600 truncate" title={file.originalName || file.filename}>
                                      {file.originalName || file.filename}
                                    </p>
                                    {file.size && (
                                      <p className="text-xs text-gray-400">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </p>
                                    )}
                                  </div>
                                  
                                  {/* Remove button */}
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== index))}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
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

          {/* Right Column - Customer Details */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">{t('Customer Details')}</h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('Customer Name')}</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {customers.find(c => c.id === form.watch("customerId"))?.customerName || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('Phone')}</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {customers.find(c => c.id === form.watch("customerId"))?.phone || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('Email')}</Label>
                    <p className="text-sm text-gray-900 mt-1">
                      {customers.find(c => c.id === form.watch("customerId"))?.email || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
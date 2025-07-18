import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Printer, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Product } from "@shared/schema";

interface Quotation {
  id: string;
  referenceId: string;
  customerId: string;
  description: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    productService: string;
    description: string;
    qty: number;
    unitPrice: number;
    discountPercent: number;
    vatPercent: number;
    vatValue: number;
    amount: number;
  }>;
  subtotal: string;
  discount: string;
  discountPercent: string;
  vatAmount: string;
  vatPercent: string;
  totalAmount: string;
  status: string;
  termsAndConditions?: string;
  notes?: string;
  attachments?: Array<{
    originalName: string;
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  city?: string;
}

export default function QuotationView() {
  const { t } = useLanguage();
  const [, params] = useRoute("/sales/quotations/:id");
  const quotationId = params?.id;

  const { data: quotation, isLoading } = useQuery<Quotation>({
    queryKey: [`/api/quotations/${quotationId}`],
    enabled: !!quotationId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const customer = customers.find(c => c.id === quotation?.customerId);

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? product.nameEnglish : productId;
  };

  const getCleanDescription = (description: string, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product && description.startsWith(product.nameEnglish + ' - ')) {
      return description.substring(product.nameEnglish.length + 3); // Remove "ProductName - " prefix
    }
    return description;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatAmount = (amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount || 0);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrint = async () => {
    if (!quotationId) return;
    
    try {
      const response = await fetch(`/api/quotations/${quotationId}/pdf`, {
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const printWindow = window.open(url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            setTimeout(() => {
              printWindow.close();
              window.URL.revokeObjectURL(url);
            }, 1000);
          };
        }
      }
    } catch (error) {
      console.error('Error printing quotation:', error);
    }
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
                <span>{t('Sales')} / {t('Quotation')} / {t('View')}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{quotation.referenceId}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href={`/sales/quotations/${quotation.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                {t('Edit')}
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              {t('Print')}
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quotation Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Quotation Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Reference ID')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.referenceId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Status')}
                    </label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(quotation.status)}>
                        {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Issue Date')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(quotation.issueDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Due Date')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(quotation.dueDate)}</p>
                  </div>
                </div>
                {quotation.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Description')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Items')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-sm font-medium">{t('Product/Service')}</th>
                        <th className="text-left py-2 px-2 text-sm font-medium">{t('Description')}</th>
                        <th className="text-right py-2 px-2 text-sm font-medium">{t('Qty')}</th>
                        <th className="text-right py-2 px-2 text-sm font-medium">{t('Unit Price')}</th>
                        <th className="text-right py-2 px-2 text-sm font-medium">{t('Discount %')}</th>
                        <th className="text-right py-2 px-2 text-sm font-medium">{t('VAT %')}</th>
                        <th className="text-right py-2 px-2 text-sm font-medium">{t('Amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotation.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-2 text-sm">{getProductName(item.productService)}</td>
                          <td className="py-2 px-2 text-sm">{getCleanDescription(item.description, item.productService)}</td>
                          <td className="py-2 px-2 text-sm text-right">{item.qty}</td>
                          <td className="py-2 px-2 text-sm text-right">{formatAmount(item.unitPrice)}</td>
                          <td className="py-2 px-2 text-sm text-right">{item.discountPercent.toFixed(2)}%</td>
                          <td className="py-2 px-2 text-sm text-right">{item.vatPercent.toFixed(2)}%</td>
                          <td className="py-2 px-2 text-sm text-right">{formatAmount(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            {quotation.termsAndConditions && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('Terms and Conditions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div dangerouslySetInnerHTML={{ __html: quotation.termsAndConditions }} />
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {quotation.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('Notes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div dangerouslySetInnerHTML={{ __html: quotation.notes }} />
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {quotation.attachments && quotation.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('Attachments')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {quotation.attachments.map((attachment, index) => {
                      const isImage = attachment.originalName && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(attachment.originalName);
                      
                      return (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{attachment.originalName}</span>
                            <span className="text-xs text-gray-400">({(attachment.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          {isImage ? (
                            <div className="mt-2">
                              <img 
                                src={`/uploads/${attachment.filename}`} 
                                alt={attachment.originalName}
                                className="max-w-full h-auto max-h-96 rounded border"
                                style={{ objectFit: 'contain' }}
                              />
                            </div>
                          ) : (
                            <div className="mt-2 p-3 bg-gray-50 rounded text-center">
                              <span className="text-sm text-gray-600">
                                {attachment.originalName}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Customer Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t('Customer Name')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{customer?.customerName || 'Unknown Customer'}</p>
                </div>
                {customer?.phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Phone')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
                  </div>
                )}
                {customer?.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Email')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{customer.email}</p>
                  </div>
                )}
                {customer?.city && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('City')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{customer.city}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Totals */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Subtotal')}</span>
                  <span className="text-sm">{formatAmount(quotation.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Discount')}</span>
                  <span className="text-sm">{formatAmount(quotation.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('VAT')} ({parseFloat(quotation.vatPercent).toFixed(2)}%)</span>
                  <span className="text-sm">{formatAmount(quotation.vatAmount)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-medium">{t('Total Amount')}</span>
                    <span className="text-base font-bold">{formatAmount(quotation.totalAmount)}</span>
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
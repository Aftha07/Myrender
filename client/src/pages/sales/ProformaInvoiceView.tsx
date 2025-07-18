import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Edit } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import type { ProformaInvoice, Product } from "@shared/schema";

interface Customer {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  city?: string;
}

export function ProformaInvoiceView() {
  const { id } = useParams();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();

  const { data: proformaInvoice, isLoading } = useQuery<ProformaInvoice>({
    queryKey: [`/api/proforma-invoices/${id}`],
    enabled: !!id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const customer = proformaInvoice?.customer;

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
    if (!id) return;
    
    try {
      const response = await fetch(`/api/proforma-invoices/${id}/print`, {
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
      console.error('Error printing proforma invoice:', error);
    }
  };

  const handleEdit = () => {
    window.location.href = `/sales/proforma-invoices/${id}/edit`;
  };



  if (isLoading) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="text-center">Loading proforma invoice...</div>
      </div>
    );
  }

  if (!proformaInvoice) {
    return (
      <div className="flex-1 bg-gray-50 p-6">
        <div className="text-center">Proforma invoice not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/sales/proforma-invoices">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{t('Sales')} / {t('Proforma Invoice')} / {t('View')}</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{proformaInvoice.referenceId}</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href={`/sales/proforma-invoices/${proformaInvoice.id}/edit`}>
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
            {/* Proforma Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle>{t('Proforma Invoice Details')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Reference ID')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{proformaInvoice.referenceId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Status')}
                    </label>
                    <div className="mt-1">
                      <Badge className={getStatusColor(proformaInvoice.status || 'draft')}>
                        {(proformaInvoice.status || 'draft').charAt(0).toUpperCase() + (proformaInvoice.status || 'draft').slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Issue Date')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(proformaInvoice.issueDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Due Date')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(proformaInvoice.dueDate)}</p>
                  </div>
                </div>
                {proformaInvoice.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t('Description')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">{proformaInvoice.description}</p>
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
                      {proformaInvoice.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-2 text-sm">{getProductName(item.productService)}</td>
                          <td className="py-2 px-2 text-sm">{getCleanDescription(item.description, item.productService)}</td>
                          <td className="py-2 px-2 text-sm text-right">{item.qty}</td>
                          <td className="py-2 px-2 text-sm text-right">{formatAmount(item.unitPrice)}</td>
                          <td className="py-2 px-2 text-sm text-right">{item.discountPercent?.toFixed(2) || '0.00'}%</td>
                          <td className="py-2 px-2 text-sm text-right">{item.vatPercent?.toFixed(2) || '0.00'}%</td>
                          <td className="py-2 px-2 text-sm text-right">{formatAmount(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Conditions */}
            {proformaInvoice.termsAndConditions && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('Terms and Conditions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div dangerouslySetInnerHTML={{ __html: proformaInvoice.termsAndConditions }} />
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {proformaInvoice.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('Notes')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div dangerouslySetInnerHTML={{ __html: proformaInvoice.notes }} />
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {proformaInvoice.attachments && proformaInvoice.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('Attachments')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {proformaInvoice.attachments.map((attachment: any, index: number) => {
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
                  <span className="text-sm">{formatAmount(proformaInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('Discount')}</span>
                  <span className="text-sm">{formatAmount(proformaInvoice.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t('VAT')} ({parseFloat(proformaInvoice.vatPercent || '0').toFixed(2)}%)</span>
                  <span className="text-sm">{formatAmount(proformaInvoice.vatAmount)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-medium">{t('Total Amount')}</span>
                    <span className="text-base font-bold">{formatAmount(proformaInvoice.totalAmount)}</span>
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
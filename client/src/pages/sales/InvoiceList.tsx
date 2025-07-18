import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, Plus, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import type { Invoice, Customer } from "@shared/schema";
import { format } from "date-fns";

interface InvoiceListProps {
  onLogout: () => void;
}

export function InvoiceList({ onLogout }: InvoiceListProps) {
  const { t, language, isRTL } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemsPerPage, setItemsPerPage] = useState("10");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
    retry: false,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    retry: false,
  });

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "";
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.customerName : "";
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "draft": "bg-gray-100 text-gray-800",
      "sent": "bg-blue-100 text-blue-800",
      "paid": "bg-green-100 text-green-800",
      "not paid": "bg-red-100 text-red-800",
      "overdue": "bg-orange-100 text-orange-800",
    };
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalItems = filteredInvoices.length;
  const totalPages = Math.ceil(totalItems / parseInt(itemsPerPage));
  const startIndex = (currentPage - 1) * parseInt(itemsPerPage);
  const endIndex = startIndex + parseInt(itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="flex-1 p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">{t('Loading...')}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span>{t('Sales')}</span>
            <span>/</span>
            <span className="text-gray-900">{t('Invoice')}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <FileText className="w-6 h-6 text-teal-600" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{t('Invoice')}</h1>
              </div>
            </div>
            
            <Button 
              className="bg-teal-600 hover:bg-teal-700"
              onClick={() => window.location.href = "/sales/invoices/create"}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Invoice')}
            </Button>
          </div>
        </div>

        {/* Content Card */}
        <Card>
          <CardContent className="p-6">
            {/* Filter Section */}
            <div className="mb-6">
              <div className="flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-t-lg">
                <Filter className="w-4 h-4" />
                <span>{t('Filter')}</span>
              </div>
              
              <div className="bg-teal-50 p-4 rounded-b-lg border border-teal-200">
                <p className="text-sm text-gray-600 mb-4">
                  {t('You can sort & print your invoices by Reference ID, Customer ID, Date, and Amount')}
                </p>
                
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{t('Show')}</label>
                    <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm">{t('entries')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">{t('Status')}</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All Status')}</SelectItem>
                        <SelectItem value="draft">{t('Draft')}</SelectItem>
                        <SelectItem value="sent">{t('Sent')}</SelectItem>
                        <SelectItem value="paid">{t('Paid')}</SelectItem>
                        <SelectItem value="not paid">{t('Not Paid')}</SelectItem>
                        <SelectItem value="overdue">{t('Overdue')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder={t('Search invoices...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Reference ID')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Customer')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Date')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Status')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Cost Center')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Amount')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Outstanding')}</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-700">{t('Return Reference')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        {searchTerm || statusFilter !== "all" 
                          ? t('No invoices match your filters')
                          : t('No invoices found')
                        }
                      </td>
                    </tr>
                  ) : (
                    paginatedInvoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <span className="text-teal-600 font-medium">{invoice.invoiceNumber}</span>
                        </td>
                        <td className="py-3 px-2 text-gray-900">
                          {invoice.clientName}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {invoice.dueDate ? format(new Date(invoice.dueDate), 'dd/MM/yyyy') : '-'}
                        </td>
                        <td className="py-3 px-2">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {'Main Center'}
                        </td>
                        <td className="py-3 px-2 text-gray-900 font-medium">
                          {parseFloat(invoice.totalAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-gray-900">
                          {invoice.status === 'paid' ? '0.00' : parseFloat(invoice.totalAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-gray-600">
                          {'-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  {t('Showing')} {startIndex + 1} {t('to')} {Math.min(endIndex, totalItems)} {t('of')} {totalItems} {t('entries')}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t('Previous')}
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "bg-teal-600 hover:bg-teal-700" : ""}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {t('Next')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Eye, Edit, Download } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Invoice } from "@shared/schema";

export function InvoiceManagement() {
  const { t } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("");

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: "default",
      pending: "secondary",
      overdue: "destructive",
    } as const;
    
    const colors = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-amber-100 text-amber-800",
      overdue: "bg-red-100 text-red-800",
    } as const;

    return (
      <Badge className={colors[status as keyof typeof colors] || colors.pending}>
        {t(status.charAt(0).toUpperCase() + status.slice(1) as any)}
      </Badge>
    );
  };

  const filteredInvoices = invoices?.filter(invoice => {
    const statusMatch = statusFilter === "all" || invoice.status === statusFilter;
    const clientMatch = !clientFilter || 
      invoice.clientName.toLowerCase().includes(clientFilter.toLowerCase()) ||
      invoice.clientEmail?.toLowerCase().includes(clientFilter.toLowerCase());
    return statusMatch && clientMatch;
  }) || [];

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{t('Invoice Management')}</h2>
            <p className="text-gray-600 mt-2">{t('Create, manage and track your invoices')}</p>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('New Invoice')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Status')}
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Statuses')}</SelectItem>
                  <SelectItem value="paid">{t('Paid')}</SelectItem>
                  <SelectItem value="pending">{t('Pending')}</SelectItem>
                  <SelectItem value="overdue">{t('Overdue')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Client')}
              </Label>
              <Input
                placeholder="Search clients..."
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-2">
                {t('Date Range')}
              </Label>
              <Input type="date" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Search className="w-4 h-4 mr-2" />
                {t('Filter')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading invoices...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Invoice #')}</TableHead>
                    <TableHead>{t('Client')}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t('Amount')}</TableHead>
                    <TableHead>{t('Status')}</TableHead>
                    <TableHead>{t('Actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={`https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&w=32&h=32&fit=crop&crop=face`} />
                              <AvatarFallback>{invoice.clientName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-gray-900">{invoice.clientName}</div>
                              <div className="text-sm text-gray-500">{invoice.clientEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="font-semibold">SAR {invoice.totalAmount}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

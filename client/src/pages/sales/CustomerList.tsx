import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Printer,
  Eye, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  MoreHorizontal,
  ArrowLeft,
  FileText,
  Copy
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { type Customer } from "@shared/schema";

interface CustomerListProps {
  onLogout: () => void;
}

export function CustomerList({ onLogout }: CustomerListProps) {
  const { t, language, isRTL } = useLanguage();
  const [location, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState("10");

  // Fetch customers from API
  const { data: customers = [], isLoading, error } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    retry: false,
  });

  // Filter customers based on search and status
  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || customer.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2
    }).format(num || 0);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={`${statusColors[status as keyof typeof statusColors] || statusColors.active} px-2 py-1 text-xs font-medium rounded-full`}>
        {status === 'active' ? t('Active') : t('Inactive')}
      </Badge>
    );
  };

  const getAccountBadge = (account: string) => {
    const isReceivables = account === 'Accounts Receivables';
    return (
      <Badge className={`${isReceivables ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'} px-2 py-1 text-xs font-medium rounded-full`}>
        {isReceivables ? t('Accounts Receivables') : t('Customer')}
      </Badge>
    );
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">{t('Welcome')}</div>
              <div className="text-sm text-gray-500">{t('Last visit today 1 day ago')}</div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-3xl font-bold text-teal-600">VoM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white px-6 py-3 border-b">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>{t('Sales')}</span>
          <span>/</span>
          <span className="text-teal-600 font-medium">{t('Customers')}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-gray-300">
                  <FileText className="w-4 h-4 mr-2" />
                  {t('Export')}
                </Button>
                <Button variant="outline" size="sm" className="border-gray-300">
                  <Copy className="w-4 h-4 mr-2" />
                  {t('Copy')}
                </Button>
                <Button variant="outline" size="sm" className="border-gray-300">
                  <Printer className="w-4 h-4 mr-2" />
                  {t('Print')}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" className="border-gray-300">
                  <Download className="w-4 h-4 mr-2" />
                  {t('Import')}
                </Button>
                <Link href="/sales/customers/create">
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('Add Customer')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-teal-600 px-6 py-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">{t('Filter')}</h3>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">{t('Show')}</span>
                  <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-gray-600">{t('entries')}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder={t('Search customers...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="p-6">
            {isLoading && (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">{t('Loading customers...')}</div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <div className="text-red-800">
                  {t('Failed to load customers. Please try again.')}
                </div>
              </div>
            )}

            {!isLoading && !error && (
              <>
                {filteredCustomers.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="text-gray-500 text-lg mb-4">
                        {searchTerm ? t('No customers found matching your search') : t('No customers found')}
                      </div>
                      <div className="text-gray-400 text-sm mb-6">
                        {searchTerm ? t('Try adjusting your search terms') : t('Create your first customer to get started')}
                      </div>
                      {!searchTerm && (
                        <Link href="/sales/customers/create">
                          <Button className="bg-teal-600 hover:bg-teal-700">
                            <Plus className="w-4 h-4 mr-2" />
                            {t('Add Your First Customer')}
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Code')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Customer Name')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Phone')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Email')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Account')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Outstanding Balance')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Status')}
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredCustomers.slice(0, parseInt(entriesPerPage)).map((customer: Customer, index: number) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {customer.code}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.phone || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {customer.email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getAccountBadge(customer.account || 'Customer')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(customer.openingBalance || 0)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(customer.status || 'active')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-teal-600 hover:text-teal-900 hover:bg-teal-50 w-8 h-8 p-0 rounded-full"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 w-8 h-8 p-0 rounded-full"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-900 hover:bg-green-50 w-8 h-8 p-0 rounded-full"
                                >
                                  <Phone className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-orange-600 hover:text-orange-900 hover:bg-orange-50 w-8 h-8 p-0 rounded-full"
                                >
                                  <Mail className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-900 hover:bg-red-50 w-8 h-8 p-0 rounded-full"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Footer */}
                {filteredCustomers.length > 0 && (
                  <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
                    <div>
                      {t('Value of Money')}
                    </div>
                    <div>
                      {t('All rights reserved © 2025 VoM')}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
    </div>
  );
}

export default CustomerList;
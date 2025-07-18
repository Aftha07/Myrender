import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { StatsCards } from "./StatsCards";
import { Sidebar } from "./Sidebar";
import { apiRequest } from "@/lib/queryClient";

interface VoMDashboardProps {
  onLogout: () => void;
}

export function VoMDashboard({ onLogout }: VoMDashboardProps) {
  const { t } = useLanguage();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/company/user"],
    retry: false,
  });

  const { data: invoices } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const recentInvoices = invoices?.slice(0, 3) || [];

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/company/logout");
      onLogout();
    } catch (error) {
      console.error("Logout error:", error);
      // Force logout even if API call fails
      onLogout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* VoM Sidebar */}
      <Sidebar onLogout={handleLogout} />
      
      {/* Main Content */}
      <div className="flex-1">
        {/* Top Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('Second Support Accounting')}
              </h1>
              <p className="text-sm text-gray-600">
                {t('Financial Management Platform')}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher variant="dashboard" />
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">Company Admin</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <div className="text-right">
                <div className="text-3xl font-bold text-teal-600">SS</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-6">
          <div className="space-y-8">
            {/* Welcome Message */}
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t('Welcome')} {user?.email || 'User'}
              </h2>
              <p className="text-gray-600">
                {t('Financial Overview')} - {t('Track your business performance and key metrics')}
              </p>
            </div>

            {/* Financial Overview Cards */}
            <StatsCards />

            {/* Recent Invoices */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('Recent Invoices')}
                </h3>
                <Button variant="outline" size="sm">
                  {t('View All Invoices')}
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Invoice #')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Client')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Date')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Amount')}
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('Status')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {recentInvoices.map((invoice: any) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {invoice.customerName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(invoice.issueDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ر.س {parseFloat(invoice.totalAmount).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge 
                                variant={
                                  invoice.status === 'paid' ? 'default' :
                                  invoice.status === 'pending' ? 'secondary' : 'destructive'
                                }
                              >
                                {invoice.status === 'paid' ? t('Paid') :
                                 invoice.status === 'pending' ? t('Pending') : t('Overdue')}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {t('Second Support')} - {t('All rights reserved © 2025 Second Support')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut, BarChart3, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { StatsCards } from "./StatsCards";
import { Sidebar } from "./Sidebar";
import { apiRequest } from "@/lib/queryClient";

interface DashboardProps {
  onLogout: () => void;
}

export function Dashboard({ onLogout }: DashboardProps) {
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
      await apiRequest("POST", "/api/auth/company/logout", {});
      onLogout();
    } catch (error) {
      console.error("Logout error:", error);
      onLogout(); // Logout anyway
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('VoM Accounting')}</h1>
              <p className="text-sm text-gray-500">{t('Financial Management Platform')}</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Language Switcher */}
            <LanguageSwitcher variant="dashboard" />

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>

            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&w=40&h=40&fit=crop&crop=face" />
                <AvatarFallback>{user?.companyName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user?.companyName || 'Company User'}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{t('Financial Overview')}</h2>
          <p className="text-gray-600 mt-2">
            {t('Track your business performance and key metrics')}
          </p>
        </div>

        {/* Statistics Cards */}
        <StatsCards />

        {/* Charts and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('Revenue Trend')}
              </h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                  <p>Chart visualization would be implemented here</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('Recent Invoices')}
              </h3>
              <div className="space-y-4">
                {recentInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No invoices found</p>
                  </div>
                ) : (
                  recentInvoices.map((invoice, index) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-medium">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invoice.clientName}</p>
                          <p className="text-sm text-gray-500">
                            {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">SAR {invoice.totalAmount}</p>
                        <Badge 
                          className={
                            invoice.status === 'paid' 
                              ? "bg-green-100 text-green-800" 
                              : "bg-amber-100 text-amber-800"
                          }
                        >
                          {t(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) as any)}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4">
                {t('View All Invoices')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, FileText, Users, Receipt, TrendingUp, Clock, UserPlus, TrendingDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function StatsCards() {
  const { t } = useLanguage();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: t('Total Revenue'),
      value: `SAR ${stats?.totalRevenue || '0.00'}`,
      change: '+12.5%',
      changeLabel: '+12.5% from last month',
      icon: DollarSign,
      iconBg: 'bg-blue-100',
      iconColor: 'text-primary',
      changeIcon: TrendingUp,
      changeColor: 'text-green-600',
    },
    {
      title: t('Active Invoices'),
      value: stats?.activeInvoices?.toString() || '0',
      change: '23',
      changeLabel: '23 pending payment',
      icon: FileText,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      changeIcon: Clock,
      changeColor: 'text-amber-600',
    },
    {
      title: t('Total Customers'),
      value: stats?.totalCustomers?.toString() || '0',
      change: '5',
      changeLabel: '5 new this month',
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      changeIcon: UserPlus,
      changeColor: 'text-green-600',
    },
    {
      title: t('Monthly Expenses'),
      value: `SAR ${stats?.monthlyExpenses || '0.00'}`,
      change: '-8.2%',
      changeLabel: '-8.2% from last month',
      icon: Receipt,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      changeIcon: TrendingDown,
      changeColor: 'text-red-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        const ChangeIcon = stat.changeIcon;
        
        return (
          <Card key={index} className="stat-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className={`text-sm mt-1 flex items-center ${stat.changeColor}`}>
                    <ChangeIcon className="w-4 h-4 mr-1" />
                    <span>{stat.changeLabel}</span>
                  </p>
                </div>
                <div className={`w-12 h-12 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

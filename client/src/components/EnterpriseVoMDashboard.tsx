import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Bell,
  Settings,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

interface EnterpriseVoMDashboardProps {
  onLogout: () => void;
}

export function EnterpriseVoMDashboard({ onLogout }: EnterpriseVoMDashboardProps) {
  const { t, language } = useLanguage();
  const [timeRange, setTimeRange] = useState("30d");

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats', timeRange],
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['/api/invoices', 'recent'],
  });

  const { data: alertsData } = useQuery({
    queryKey: ['/api/dashboard/alerts'],
  });

  // Mock enterprise-level data for demonstration
  const enterpriseStats = {
    totalRevenue: stats?.totalRevenue || "524,750",
    monthlyGrowth: "+12.5%",
    activeContracts: stats?.activeInvoices || 156,
    totalClients: stats?.totalCustomers || 89,
    complianceScore: 98.5,
    systemUptime: "99.97%",
    processingEfficiency: 94.2,
    averagePaymentTime: "12.3 days"
  };

  const alerts = [
    { id: 1, type: "warning", message: "3 invoices due in 24 hours", count: 3 },
    { id: 2, type: "info", message: "Monthly ZATCA report ready", count: 1 },
    { id: 3, type: "success", message: "All systems operational", count: 1 }
  ];

  const quickActions = [
    { label: "Create Invoice", icon: <FileText className="w-4 h-4" />, action: "/sales/invoices/create" },
    { label: "New Customer", icon: <Users className="w-4 h-4" />, action: "/sales/customers/create" },
    { label: "Generate Report", icon: <BarChart3 className="w-4 h-4" />, action: "/reports" },
    { label: "ZATCA Submission", icon: <CheckCircle className="w-4 h-4" />, action: "/zatca" }
  ];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Enhanced Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Enterprise Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Real-time business intelligence and financial overview</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </Button>
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </Button>
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <Badge variant="destructive" className="text-xs">3</Badge>
              </div>
              <img src="/api/placeholder/120/40" alt="VoM Logo" className="h-8" />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Time Range Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Financial Overview</h2>
              <div className="flex rounded-lg bg-gray-100 p-1">
                {["7d", "30d", "90d", "1y"].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeRange === range 
                        ? "bg-white text-gray-900 shadow-sm" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
              <Activity className="w-4 h-4 mr-2" />
              Live Mode
            </Button>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-teal-700">Total Revenue</p>
                    <p className="text-2xl font-bold text-teal-900">${enterpriseStats.totalRevenue}</p>
                    <div className="flex items-center mt-2">
                      <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">{enterpriseStats.monthlyGrowth}</span>
                      <span className="text-xs text-gray-600 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-700">Active Contracts</p>
                    <p className="text-2xl font-bold text-blue-900">{enterpriseStats.activeContracts}</p>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">+8.2%</span>
                      <span className="text-xs text-gray-600 ml-1">this quarter</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-700">Enterprise Clients</p>
                    <p className="text-2xl font-bold text-purple-900">{enterpriseStats.totalClients}</p>
                    <div className="flex items-center mt-2">
                      <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">+15.3%</span>
                      <span className="text-xs text-gray-600 ml-1">YoY growth</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">ZATCA Compliance</p>
                    <p className="text-2xl font-bold text-green-900">{enterpriseStats.complianceScore}%</p>
                    <div className="flex items-center mt-2">
                      <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-sm text-green-600 font-medium">Excellent</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health & Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium">{enterpriseStats.systemUptime}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Processing Efficiency</span>
                  <span className="text-sm font-medium">{enterpriseStats.processingEfficiency}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Avg Payment Time</span>
                  <span className="text-sm font-medium">{enterpriseStats.averagePaymentTime}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto p-3 hover:bg-gray-50"
                    onClick={() => window.location.href = action.action}
                  >
                    <div className="flex items-center space-x-3">
                      {action.icon}
                      <span className="text-sm">{action.label}</span>
                    </div>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-700">System Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50">
                    {alert.type === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                    {alert.type === "info" && <Bell className="w-4 h-4 text-blue-600" />}
                    {alert.type === "success" && <CheckCircle className="w-4 h-4 text-green-600" />}
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{alert.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                          <FileText className="w-4 h-4 text-teal-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Invoice #INV-{String(item).padStart(4, '0')}</p>
                          <p className="text-xs text-gray-600">Client Enterprise {item}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${(Math.random() * 50000 + 10000).toFixed(0)}</p>
                        <p className="text-xs text-gray-600">Pending</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">This Month</span>
                    <span className="text-lg font-semibold text-gray-900">$124,750</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-teal-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Target: $165,000</span>
                    <span>75% achieved</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Avg Contract</p>
                      <p className="text-lg font-semibold text-gray-900">$12,450</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">Growth Rate</p>
                      <p className="text-lg font-semibold text-green-600">+18.2%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default EnterpriseVoMDashboard;
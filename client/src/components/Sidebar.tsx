import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Home, 
  FileText, 
  Receipt, 
  BarChart3, 
  Tag, 
  Plus, 
  Upload,
  ShoppingCart,
  Users,
  FileQuestion,
  CreditCard,
  Minus,
  ChevronDown,
  Circle,
  HelpCircle,
  ShoppingBag,
  Calculator,
  LogOut,
  Settings,
  Cog,
  Calendar,
  FileEdit,
  DollarSign
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface SidebarProps {
  onLogout?: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const [location] = useLocation();
  const { t } = useLanguage();
  const [salesExpanded, setSalesExpanded] = useState(true);
  const [purchasesExpanded, setPurchasesExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [accountingExpanded, setAccountingExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const salesItems = [
    { href: "/sales/customers", icon: Circle, label: t('Customers') },
    { href: "/sales/quotations", icon: Circle, label: t('Quotations') },
    { href: "/sales/proforma-invoices", icon: Circle, label: t('Proforma Invoices') },
    { href: "/sales/invoices", icon: Circle, label: t('Invoice') },
    { href: "/sales/debit-notes", icon: Circle, label: t('Debit Notes') },
    { href: "/sales/credit-notes", icon: Circle, label: t('Credit Note') },
    { href: "/sales/customer-receipts", icon: Circle, label: t('Customer Receipt') },
    { href: "/sales/transactions", icon: Circle, label: t('Sales Transactions') },
  ];

  const purchaseItems = [
    { href: "/purchases/vendors", icon: Circle, label: t('Vendors') },
    { href: "/purchases/purchase-orders", icon: Circle, label: t('Purchase Orders') },
    { href: "/purchases/bills", icon: Circle, label: t('Bills') },
    { href: "/purchases/payments", icon: Circle, label: t('Payments') },
  ];

  const productItems = [
    { href: "/products/services", icon: Circle, label: t('Products') },
    { href: "/products/units", icon: Circle, label: t('Units') },
  ];

  const accountingItems = [
    { href: "/accounting/chart-of-accounts", icon: Circle, label: t('Chart of Accounts') },
    { href: "/accounting/journal-entries", icon: Circle, label: t('Journal Entries') },
    { href: "/accounting/trial-balance", icon: Circle, label: t('Trial Balance') },
  ];

  const settingsItems = [
    { href: "/settings/general", icon: Circle, label: t('General Settings') },
    { href: "/settings/accounting", icon: Circle, label: t('Accounting Settings') },
    { href: "/settings/financial-years", icon: Circle, label: t('Financial Years') },
    { href: "/settings/forms-design", icon: Circle, label: t('Forms Design') },
    { href: "/settings/taxes", icon: Circle, label: t('Taxes') },
  ];

  const isActive = (href: string) => location === href;
  const isParentActive = (items: any[]) => items.some(item => location === item.href);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      {/* User Profile Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">U</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{t('Welcome')} مها</p>
            <p className="text-xs text-gray-500">{t('Last Visit Date')}: 1 hour ago</p>
          </div>
        </div>
        <div className="mt-2 flex items-center text-xs text-green-600">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
          9
        </div>
      </div>

      <nav className="p-2">
        {/* Sales Section */}
        <Collapsible open={salesExpanded} onOpenChange={setSalesExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between px-3 py-2 text-left font-medium",
                (salesExpanded || isParentActive(salesItems)) && "bg-teal-500 text-white hover:bg-teal-600"
              )}
            >
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-4 h-4" />
                <span>{t('Sales')}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", salesExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {salesItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors cursor-pointer",
                  isActive(item.href) 
                    ? "bg-teal-100 text-teal-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                  <item.icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Purchases Section */}
        <Collapsible open={purchasesExpanded} onOpenChange={setPurchasesExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between px-3 py-2 text-left font-medium mt-1",
                (purchasesExpanded || isParentActive(purchaseItems)) && "bg-orange-100 text-orange-700"
              )}
            >
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4" />
                <span>{t('Purchases')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">New</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", purchasesExpanded && "rotate-180")} />
              </div>
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {purchaseItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors cursor-pointer",
                  isActive(item.href) 
                    ? "bg-orange-100 text-orange-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                  <item.icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Products/Services Section */}
        <Collapsible open={productsExpanded} onOpenChange={setProductsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between px-3 py-2 text-left font-medium mt-1",
                (productsExpanded || isParentActive(productItems)) && "bg-blue-100 text-blue-700"
              )}
            >
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4" />
                <span>{t('Products/Services')}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", productsExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {productItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors cursor-pointer",
                  isActive(item.href) 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                  <item.icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Accounting Section */}
        <Collapsible open={accountingExpanded} onOpenChange={setAccountingExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between px-3 py-2 text-left font-medium mt-1",
                (accountingExpanded || isParentActive(accountingItems)) && "bg-purple-100 text-purple-700"
              )}
            >
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4" />
                <span>{t('Accounting')}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", accountingExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {accountingItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors cursor-pointer",
                  isActive(item.href) 
                    ? "bg-purple-100 text-purple-700" 
                    : "text-gray-600 hover:bg-gray-100"
                )}>
                  <item.icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Settings Section */}
        <Collapsible open={settingsExpanded} onOpenChange={setSettingsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between px-3 py-2 text-left font-medium mt-1",
                (settingsExpanded || isParentActive(settingsItems)) && "bg-teal-500 text-white"
              )}
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span>{t('Settings')}</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", settingsExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1 bg-teal-100">
            {settingsItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded transition-colors cursor-pointer",
                  isActive(item.href) 
                    ? "bg-teal-200 text-teal-800" 
                    : "text-teal-700 hover:bg-teal-200"
                )}>
                  <item.icon className="w-3 h-3" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Support Section */}
        <div className="mt-8">
          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2 text-left font-medium bg-teal-500 text-white rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4" />
              <span>{t('Support')}</span>
            </div>
          </Button>
        </div>

        {/* Logout Section */}
        {onLogout && (
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={onLogout}
              className="w-full justify-start px-3 py-2 text-left font-medium text-red-600 hover:bg-red-50 hover:text-red-700 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <LogOut className="w-4 h-4" />
                <span>{t('Logout')}</span>
              </div>
            </Button>
          </div>
        )}
      </nav>
    </aside>
  );
}

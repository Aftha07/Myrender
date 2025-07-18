import { useState } from "react";
import { useLocation } from "wouter";
import { VoMDashboard } from "@/components/VoMDashboard";
import EnterpriseVoMDashboard from "@/components/EnterpriseVoMDashboard";
import { Sidebar } from "@/components/Sidebar";
import { InvoiceManagement } from "@/components/InvoiceManagement";
import { ZATCACompliance } from "@/components/ZATCACompliance";
import ProductList from "@/pages/products/ProductList";
import ProductCreate from "@/pages/products/ProductCreate";
import ServiceCreate from "@/pages/products/ServiceCreate";
import ExpenseCreate from "@/pages/products/ExpenseCreate";
import RecipeCreate from "@/pages/products/RecipeCreate";
import { CustomerList } from "@/pages/sales/CustomerListFixed";
import { CustomerCreate } from "@/pages/sales/CustomerCreate";
import QuotationList from "@/pages/sales/QuotationList";
import QuotationCreate from "@/pages/sales/QuotationCreate";
import { ProformaInvoiceList } from "@/pages/sales/ProformaInvoiceList";
import ProformaInvoiceCreate from "@/pages/sales/ProformaInvoiceCreate";
import { InvoiceList } from "@/pages/sales/InvoiceList";
import InvoiceCreate from "@/pages/sales/InvoiceCreate";
import GeneralSettings from "@/pages/settings/GeneralSettings";
import AccountingSettings from "@/pages/settings/AccountingSettings";
import FinancialYears from "@/pages/settings/FinancialYears";
import FormsDesign from "@/pages/settings/FormsDesign";
import Taxes from "@/pages/settings/Taxes";
import { queryClient } from "@/lib/queryClient";

export default function Home() {
  const [location] = useLocation();
  const handleLogout = () => {
    queryClient.clear();
    // Force a page reload to reset authentication state
    window.location.href = "/";
  };

  const renderContent = () => {
    // Handle specific sales pages
    if (location === "/sales/customers") {
      return <CustomerList onLogout={handleLogout} />;
    }
    if (location === "/sales/customers/create") {
      return <CustomerCreate onLogout={handleLogout} />;
    }
    if (location === "/sales/quotations") {
      return <QuotationList onLogout={handleLogout} />;
    }
    if (location === "/sales/proforma-invoices") {
      return <ProformaInvoiceList onLogout={handleLogout} />;
    }
    if (location === "/sales/quotations/create") {
      return <QuotationCreate />;
    }
    if (location === "/sales/proforma-invoices/create") {
      return <ProformaInvoiceCreate onLogout={handleLogout} />;
    }
    if (location === "/sales/invoices") {
      return <InvoiceList onLogout={handleLogout} />;
    }
    if (location === "/sales/invoices/create") {
      return <InvoiceCreate onLogout={handleLogout} />;
    }
    
    // Sales pages - show placeholder content for other sales routes
    if (location?.startsWith("/sales/")) {
      return (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sales Module</h2>
          <p className="text-gray-600">Click on the navigation menu to access specific sales features</p>
          <p className="text-sm text-gray-500 mt-2">Current path: {location}</p>
        </div>
      );
    }
    
    // Settings pages
    if (location === "/settings/general") {
      return <GeneralSettings onLogout={handleLogout} />;
    }
    if (location === "/settings/accounting") {
      return <AccountingSettings onLogout={handleLogout} />;
    }
    if (location === "/settings/financial-years") {
      return <FinancialYears onLogout={handleLogout} />;
    }
    if (location === "/settings/forms-design") {
      return <FormsDesign onLogout={handleLogout} />;
    }
    if (location === "/settings/taxes") {
      return <Taxes onLogout={handleLogout} />;
    }
    if (location === "/products/services") {
      return <ProductList />;
    }
    if (location === "/products/create") {
      return <ProductCreate />;
    }
    if (location === "/services/create") {
      return <ServiceCreate />;
    }
    if (location === "/expenses/create") {
      return <ExpenseCreate />;
    }
    if (location === "/recipes/create") {
      return <RecipeCreate />;
    }
    
    switch (location) {
      case "/invoices":
        return <InvoiceManagement />;
      case "/zatca":
        return <ZATCACompliance />;
      case "/expenses":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Expenses</h2>
            <p className="text-gray-600">Expense management coming soon...</p>
          </div>
        );
      case "/reports":
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reports</h2>
            <p className="text-gray-600">Financial reports coming soon...</p>
          </div>
        );

      default:
        return <VoMDashboard onLogout={handleLogout} />;
    }
  };

  // For non-dashboard routes, show full layout with sidebar
  if (location !== "/") {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1">
          {renderContent()}
        </main>
      </div>
    );
  }

  // For dashboard route, show integrated layout
  return renderContent();
}

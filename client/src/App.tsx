import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Login } from "@/components/Login";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

// Sales Pages
import { CustomerList } from "@/pages/sales/CustomerList";
import CustomerCreate from "@/pages/sales/CustomerCreate";
import CustomerReceiptCreate from "@/pages/sales/CustomerReceiptCreate";
import QuotationCreate from "@/pages/sales/QuotationCreate";
import QuotationList from "@/pages/sales/QuotationList";
import QuotationView from "@/pages/sales/QuotationView";
import QuotationEdit from "@/pages/sales/QuotationEdit";
import ProformaInvoiceCreate from "@/pages/sales/ProformaInvoiceCreate";
import { ProformaInvoiceView } from "@/pages/sales/ProformaInvoiceView";
import { ProformaInvoiceEdit } from "@/pages/sales/ProformaInvoiceEdit";
import InvoiceCreate from "@/pages/sales/InvoiceCreate";
import Units from "@/pages/products/Units";
import ProductEdit from "@/pages/products/ProductEdit";
import ServiceEdit from "@/pages/products/ServiceEdit";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={() => <Login />} />
      ) : (
        <>
          <Route path="/" component={Home} />
          
          {/* Sales Routes */}
          <Route path="/sales/customers" component={Home} />
          <Route path="/sales/customers/create" component={() => <CustomerCreate onLogout={() => window.location.href = "/api/logout"} />} />
          <Route path="/sales/customer-receipts/create" component={() => <CustomerReceiptCreate onLogout={() => window.location.href = "/api/logout"} />} />
          <Route path="/sales/quotations/create" component={() => <QuotationCreate onLogout={() => window.location.href = "/api/logout"} />} />
          <Route path="/sales/quotations/:id" component={() => <QuotationView />} />
          <Route path="/sales/quotations/:id/edit" component={() => <QuotationEdit />} />
          <Route path="/sales/proforma-invoices/create" component={() => <ProformaInvoiceCreate onLogout={() => window.location.href = "/api/logout"} />} />
          <Route path="/sales/proforma-invoices/:id/view" component={() => <ProformaInvoiceView />} />
          <Route path="/sales/proforma-invoices/:id/edit" component={() => <ProformaInvoiceEdit />} />
          <Route path="/sales/invoices/create" component={() => <InvoiceCreate onLogout={() => window.location.href = "/api/logout"} />} />
          
          {/* Fallback sales routes to home for now */}
          <Route path="/sales/quotations" component={Home} />
          <Route path="/sales/proforma-invoices" component={Home} />
          <Route path="/sales/invoices" component={Home} />
          <Route path="/sales/debit-notes" component={Home} />
          <Route path="/sales/credit-notes" component={Home} />
          <Route path="/sales/customer-receipts" component={Home} />
          <Route path="/sales/transactions" component={Home} />
          
          {/* Products/Services Routes */}
          <Route path="/products/services" component={Home} />
          <Route path="/products/create" component={Home} />
          <Route path="/products/edit/:id" component={ProductEdit} />
          <Route path="/services/edit/:id" component={ServiceEdit} />
          <Route path="/services/create" component={Home} />
          <Route path="/expenses/create" component={Home} />
          <Route path="/recipes/create" component={Home} />
          <Route path="/products/categories" component={Home} />
          <Route path="/products/units" component={Units} />
          
          {/* Settings Routes */}
          <Route path="/settings/general" component={Home} />
          <Route path="/settings/accounting" component={Home} />
          <Route path="/settings/financial-years" component={Home} />
          <Route path="/settings/forms-design" component={Home} />
          <Route path="/settings/taxes" component={Home} />
          
          {/* Other existing routes */}
          <Route path="/invoices" component={Home} />
          <Route path="/expenses" component={Home} />
          <Route path="/reports" component={Home} />
          <Route path="/zatca" component={Home} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

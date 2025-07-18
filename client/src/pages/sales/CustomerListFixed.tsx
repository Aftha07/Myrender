import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search, 
  Download, 
  Filter, 
  Printer,
  Eye, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  MoreHorizontal,
  ArrowLeft,
  FileText,
  Copy,
  Upload
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type Customer, insertCustomerSchema } from "@shared/schema";
import { z } from "zod";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Edit customer form schema
const editCustomerSchema = z.object({
  code: z.string().optional(),
  customerName: z.string().optional(),
  account: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  vatRegistrationNumber: z.string().optional(),
  openingBalance: z.string().optional(),
  streetName: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  status: z.string().optional(),
});

type EditCustomerData = z.infer<typeof editCustomerSchema>;

interface CustomerListProps {
  onLogout: () => void;
}

export function CustomerList({ onLogout }: CustomerListProps) {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [balanceFromFilter, setBalanceFromFilter] = useState("");
  const [balanceToFilter, setBalanceToFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [importingFile, setImportingFile] = useState(false);

  // Fetch customers from the API
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch total outstanding
  const { data: totalOutstandingData } = useQuery<{ totalOutstanding: string }>({
    queryKey: ["/api/customers/total-outstanding"],
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await apiRequest("DELETE", `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: t("Success"),
        description: t("Customer deleted successfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to delete customer"),
        variant: "destructive",
      });
    },
  });

  // Edit customer mutation
  const editCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditCustomerData }) => {
      await apiRequest("PUT", `/api/customers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setEditingCustomer(null);
      toast({
        title: t("Success"),
        description: t("Customer updated successfully"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to update customer"),
        variant: "destructive",
      });
    },
  });

  // Form for editing customer
  const editForm = useForm<EditCustomerData>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      code: "",
      customerName: "",
      account: "Accounts Receivables",
      phone: "",
      email: "",
      vatRegistrationNumber: "",
      openingBalance: "0",
      streetName: "",
      city: "",
      country: "",
      postalCode: "",
      status: "active",
    },
  });

  // Form submission handler
  const onEditSubmit = (data: EditCustomerData) => {
    if (!editingCustomer) return;
    
    // Filter out empty strings and undefined values
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== "" && value !== undefined)
    );
    
    editCustomerMutation.mutate({
      id: editingCustomer.id,
      data: cleanedData,
    });
  };

  // Handler functions
  const handleViewCustomer = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    // Populate the form with current customer data
    editForm.reset({
      code: customer.code,
      customerName: customer.customerName,
      account: customer.account,
      phone: customer.phone || "",
      email: customer.email || "",
      vatRegistrationNumber: customer.vatRegistrationNumber || "",
      openingBalance: customer.openingBalance || "0",
      streetName: customer.streetName || "",
      city: customer.city || "",
      country: customer.country || "",
      postalCode: customer.postalCode || "",
      status: customer.status,
    });
  };

  const handleDeleteCustomer = (customerId: string) => {
    deleteCustomerMutation.mutate(customerId);
  };

  const handleApplyFilters = () => {
    // Filters are applied automatically through the filteredCustomers computed value
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setBalanceFromFilter("");
    setBalanceToFilter("");
    setSearchTerm("");
  };

  const handleDownloadExcel = () => {
    // Prepare data for Excel export
    const excelData = filteredCustomers.map((customer, index) => ({
      '#': index + 1,
      [t('Customer Code')]: customer.code,
      [t('Customer Name')]: customer.customerName,
      [t('Email')]: customer.email || '-',
      [t('Mobile')]: customer.phone || '-',
      [t('Account')]: customer.account,
      [t('Opening Balance')]: customer.openingBalance || '0.00',
      [t('Status')]: customer.status === 'active' ? t('Active') : t('Inactive'),
      [t('VAT Registration Number')]: customer.vatRegistrationNumber || '-',
      [t('Street Name')]: customer.streetName || '-',
      [t('City')]: customer.city || '-',
      [t('Country')]: customer.country || '-',
      [t('Postal Code')]: customer.postalCode || '-'
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, t('Customers'));

    // Generate Excel file and download
    const fileName = `customers_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: t("Success"),
      description: t("Excel file downloaded successfully"),
    });
  };

  const handleDownloadPDF = () => {
    // Create new PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(t('Customer List'), 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`${t('Generated on')}: ${new Date().toLocaleDateString()}`, 14, 30);

    // Prepare data for PDF table
    const pdfData = filteredCustomers.map((customer, index) => [
      index + 1,
      customer.code,
      customer.customerName,
      customer.email || '-',
      customer.phone || '-',
      customer.account,
      customer.openingBalance || '0.00',
      customer.status === 'active' ? t('Active') : t('Inactive')
    ]);

    // Create table
    autoTable(doc, {
      head: [[
        '#',
        t('Customer Code'),
        t('Customer Name'),
        t('Email'),
        t('Mobile'),
        t('Account'),
        t('Opening Balance'),
        t('Status')
      ]],
      body: pdfData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [20, 184, 166], // Teal color
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save the PDF
    const fileName = `customers_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: t("Success"),
      description: t("PDF file downloaded successfully"),
    });
  };

  const handlePrintList = () => {
    // Create new PDF document for printing
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(16);
    doc.text(t('Customer List'), 14, 22);
    
    // Add date
    doc.setFontSize(10);
    doc.text(`${t('Generated on')}: ${new Date().toLocaleDateString()}`, 14, 30);

    // Prepare data for PDF table
    const pdfData = filteredCustomers.map((customer, index) => [
      index + 1,
      customer.code,
      customer.customerName,
      customer.email || '-',
      customer.phone || '-',
      customer.account,
      customer.openingBalance || '0.00',
      customer.status === 'active' ? t('Active') : t('Inactive')
    ]);

    // Create table
    autoTable(doc, {
      head: [[
        '#',
        t('Customer Code'),
        t('Customer Name'),
        t('Email'),
        t('Mobile'),
        t('Account'),
        t('Opening Balance'),
        t('Status')
      ]],
      body: pdfData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [20, 184, 166], // Teal color
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Generate PDF blob and open in new tab for printing
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    const newTab = window.open(pdfUrl, '_blank');
    if (newTab) {
      newTab.focus();
      toast({
        title: t("Success"),
        description: t("Customer list opened for printing"),
      });
    } else {
      // Fallback - show message if pop-up blocked
      toast({
        title: t("Info"),
        description: t("Please allow pop-ups to print the customer list"),
        variant: "default",
      });
    }

    // Clean up URL after a delay
    setTimeout(() => {
      URL.revokeObjectURL(pdfUrl);
    }, 5000);
  };

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast({
        title: t("Error"),
        description: t("Please allow pop-ups to enable printing"),
        variant: "destructive",
      });
      return;
    }

    // Generate print-friendly HTML content
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${t('Customer List')} - ${t('Second Support')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #14b8a6;
              padding-bottom: 20px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #14b8a6;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 18px;
              margin-bottom: 10px;
            }
            .report-date {
              font-size: 12px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px;
              text-align: left;
              font-size: 10px;
              word-wrap: break-word;
            }
            th:nth-child(1) { width: 8%; }  /* Code */
            th:nth-child(2) { width: 20%; } /* Customer Name */
            th:nth-child(3) { width: 25%; } /* Billing Address */
            th:nth-child(4) { width: 12%; } /* Phone */
            th:nth-child(5) { width: 15%; } /* Email */
            th:nth-child(6) { width: 12%; } /* Account */
            th:nth-child(7) { width: 8%; }  /* VAT Registration Number */
            th {
              background-color: #14b8a6;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .total-section {
              margin-top: 20px;
              padding: 15px;
              background-color: #f0f9ff;
              border: 1px solid #14b8a6;
              border-radius: 5px;
            }
            .total-text {
              font-size: 14px;
              font-weight: bold;
              color: #14b8a6;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-inside: avoid; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">${t('Second Support')}</div>
            <div class="report-title">${t('Customer List')}</div>
            <div class="report-date">${t('Generated on')}: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>${t('Code')}</th>
                <th>${t('Customer Name')}</th>
                <th>${t('Billing Address')}</th>
                <th>${t('Phone')}</th>
                <th>${t('Email')}</th>
                <th>${t('Account')}</th>
                <th>${t('VAT Registration Number')}</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCustomers.map((customer, index) => `
                <tr>
                  <td>${customer.code}</td>
                  <td>${customer.customerName}</td>
                  <td>${[customer.streetName, customer.city, customer.country, customer.postalCode].filter(Boolean).join(', ') || '-'}</td>
                  <td>${customer.phone || '-'}</td>
                  <td>${customer.email || '-'}</td>
                  <td>${customer.account}</td>
                  <td>${customer.vatRegistrationNumber || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-text">
              ${t('Total Outstanding')}: ${totalOutstandingData ? parseFloat(totalOutstandingData.totalOutstanding).toLocaleString() : '0.00'}
            </div>
            <div style="margin-top: 10px; font-size: 12px;">
              ${t('Total Customers')}: ${filteredCustomers.length}
            </div>
          </div>
          
          <div class="footer">
            ${t('All rights reserved © 2025 Second Support')}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `;

    // Write content to the new window and trigger print
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleImport = () => {
    // Create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.style.display = 'none';
    
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImportingFile(true);
      
      try {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        let data: any[][] = [];

        if (fileExtension === 'csv') {
          // Handle CSV files
          const text = await file.text();
          const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/"/g, '')));
          data = rows;
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          // Handle Excel files
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        } else {
          throw new Error(t('Unsupported file format. Please use CSV or Excel files.'));
        }

        if (data.length < 2) {
          throw new Error(t('File must contain at least a header row and one data row.'));
        }

        // Map column headers (case-insensitive and flexible)
        const headers = data[0].map((h: string) => h?.toString().trim());
        
        // Create a flexible column mapping
        const getColumnIndex = (possibleNames: string[]) => {
          for (const name of possibleNames) {
            const index = headers.findIndex(h => 
              h && h.toLowerCase().includes(name.toLowerCase())
            );
            if (index !== -1) return index;
          }
          return -1;
        };

        // Required columns with flexible name matching
        const columnMap = {
          customerName: getColumnIndex(['customer name', 'name', 'client name']),
          account: getColumnIndex(['account', 'account name', 'acc']),
          code: getColumnIndex(['customer code', 'code', 'id', 'customer id']),
          phone: getColumnIndex(['phone', 'mobile', 'contact', 'telephone']),
          email: getColumnIndex(['email', 'e-mail', 'mail']),
          vatRegistrationNumber: getColumnIndex(['vat', 'tax', 'vat number', 'tax number']),
          openingBalance: getColumnIndex(['opening balance', 'balance', 'amount', 'opening']),
          streetName: getColumnIndex(['street', 'address', 'street name']),
          city: getColumnIndex(['city', 'location']),
          country: getColumnIndex(['country', 'nation']),
          postalCode: getColumnIndex(['postal', 'zip', 'postal code', 'zip code']),
          status: getColumnIndex(['status', 'state', 'active'])
        };

        // Check for required columns
        if (columnMap.customerName === -1 || columnMap.account === -1) {
          throw new Error(t('Required columns not found. Please ensure your file has columns for Customer Name and Account.'));
        }

        // Process data rows
        const customersToImport = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row.every(cell => !cell || cell.toString().trim() === '')) {
            continue; // Skip empty rows
          }

          const customerData = {
            code: columnMap.code !== -1 ? row[columnMap.code]?.toString().trim() || '' : '',
            customerName: columnMap.customerName !== -1 ? row[columnMap.customerName]?.toString().trim() || '' : '',
            account: columnMap.account !== -1 ? row[columnMap.account]?.toString().trim() || '' : '',
            phone: columnMap.phone !== -1 ? row[columnMap.phone]?.toString().trim() || '' : '',
            email: columnMap.email !== -1 ? row[columnMap.email]?.toString().trim() || '' : '',
            vatRegistrationNumber: columnMap.vatRegistrationNumber !== -1 ? row[columnMap.vatRegistrationNumber]?.toString().trim() || '' : '',
            openingBalance: columnMap.openingBalance !== -1 ? row[columnMap.openingBalance]?.toString().trim() || '0' : '0',
            streetName: columnMap.streetName !== -1 ? row[columnMap.streetName]?.toString().trim() || '' : '',
            city: columnMap.city !== -1 ? row[columnMap.city]?.toString().trim() || '' : '',
            country: columnMap.country !== -1 ? row[columnMap.country]?.toString().trim() || '' : '',
            postalCode: columnMap.postalCode !== -1 ? row[columnMap.postalCode]?.toString().trim() || '' : '',
            status: columnMap.status !== -1 ? (row[columnMap.status]?.toString().toLowerCase().trim() === 'inactive' ? 'inactive' : 'active') : 'active'
          };

          // Validate required fields
          if (!customerData.customerName || !customerData.account) {
            throw new Error(t('Row ') + (i + 1) + t(': Customer Name and Account are required fields.'));
          }

          customersToImport.push(customerData);
        }

        if (customersToImport.length === 0) {
          throw new Error(t('No valid customer data found in the file.'));
        }

        // Import customers one by one
        let successCount = 0;
        let failCount = 0;
        const errors = [];

        for (const customerData of customersToImport) {
          try {
            await apiRequest("POST", "/api/customers", customerData);
            successCount++;
          } catch (error) {
            failCount++;
            errors.push(`${customerData.customerName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Show results
        if (successCount > 0) {
          await queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
          await queryClient.invalidateQueries({ queryKey: ["/api/customers/total-outstanding"] });
        }

        if (failCount === 0) {
          toast({
            title: t("Import Successful"),
            description: t("Successfully imported ") + successCount + t(" customers."),
          });
        } else {
          toast({
            title: t("Import Completed with Errors"),
            description: t("Successfully imported ") + successCount + t(" customers. ") + failCount + t(" customers failed to import."),
            variant: failCount > successCount ? "destructive" : "default",
          });
        }

      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: t("Import Failed"),
          description: error instanceof Error ? error.message : t("An error occurred during import."),
          variant: "destructive",
        });
      } finally {
        setImportingFile(false);
      }
    };

    // Trigger file selection
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

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

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    
    // Balance range filtering
    const customerBalance = parseFloat(customer.openingBalance || "0");
    const balanceFrom = balanceFromFilter ? parseFloat(balanceFromFilter) : null;
    const balanceTo = balanceToFilter ? parseFloat(balanceToFilter) : null;
    
    let matchesBalance = true;
    if (balanceFrom !== null && customerBalance < balanceFrom) {
      matchesBalance = false;
    }
    if (balanceTo !== null && customerBalance > balanceTo) {
      matchesBalance = false;
    }
    
    return matchesSearch && matchesStatus && matchesBalance;
  });

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
              <div className="text-3xl font-bold text-teal-600">SS</div>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300"
              onClick={handleDownloadExcel}
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('Download Excel')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300"
              onClick={handleDownloadPDF}
            >
              <Copy className="w-4 h-4 mr-2" />
              {t('Download PDF')}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300"
              onClick={handlePrintList}
            >
              <Printer className="w-4 h-4 mr-2" />
              {t('Print')}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300"
              onClick={handleImport}
              disabled={importingFile}
            >
              <Upload className="w-4 h-4 mr-2" />
              {importingFile ? t('Importing...') : t('Import')}
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
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="text-white hover:text-teal-200"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Expanded Filter Controls */}
      {showFilters && (
        <div className="bg-white px-6 py-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('Status')}</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('All')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All')}</SelectItem>
                  <SelectItem value="active">{t('Active')}</SelectItem>
                  <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Outstanding Balance Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('Outstanding Balance')}</label>
              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  placeholder={t('From')}
                  value={balanceFromFilter}
                  onChange={(e) => setBalanceFromFilter(e.target.value)}
                  className="flex-1"
                />
                <span className="text-gray-500">-</span>
                <Input
                  type="number"
                  placeholder={t('To')}
                  value={balanceToFilter}
                  onChange={(e) => setBalanceToFilter(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 invisible">{t('Actions')}</label>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleApplyFilters}
                  className="bg-teal-600 hover:bg-teal-700 text-white flex-1"
                >
                  ✓ {t('Apply')}
                </Button>
                <Button 
                  onClick={handleClearFilters}
                  variant="destructive"
                  className="flex-1"
                >
                  ✗ {t('Clear')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <span className="text-sm text-gray-600">{t('Search')}:</span>
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
              placeholder={t('Search customers...')}
            />
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white px-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">{t('Loading customers...')}</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Customer Code')}</th>
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Customer Name')}</th>
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Mobile')}</th>
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Account')}</th>
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Opening Balance')}</th>
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Status')}</th>
                    <th className="py-4 px-2 text-sm font-medium text-gray-700">{t('Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.slice(0, parseInt(entriesPerPage)).map((customer: Customer, index: number) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="text-sm font-medium text-gray-900">{customer.code}</div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="text-sm font-medium text-gray-900">{customer.customerName}</div>
                        {customer.email && (
                          <div className="text-xs text-gray-500">{customer.email}</div>
                        )}
                      </td>
                      <td className="py-4 px-2">
                        <div className="text-sm text-gray-900">{customer.phone}</div>
                      </td>
                      <td className="py-4 px-2">
                        {getAccountBadge(customer.account)}
                      </td>
                      <td className="py-4 px-2">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.openingBalance || "0")}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        {getStatusBadge(customer.status)}
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 h-8 w-8"
                            onClick={() => handleViewCustomer(customer)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 h-8 w-8"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1 h-8 w-8 text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('Delete Customer')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('Are you sure you want to delete this customer? This action cannot be undone.')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {t('Delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-500 text-sm">{t('No customers found.')}</div>
              </div>
            )}

            {/* Total Outstanding Section */}
            <div className="flex items-center justify-between py-4 border-t bg-gray-50">
              <div className="font-medium text-gray-900">
                {t('Total Outstanding')}: {totalOutstandingData ? parseFloat(totalOutstandingData.totalOutstanding).toLocaleString() : '0.00'}
              </div>
            </div>

            {/* Pagination Info */}
            <div className="flex items-center justify-between py-4">
              <div className="text-sm text-gray-600">
                {t('Showing')} {Math.min(filteredCustomers.length, parseInt(entriesPerPage))} {t('of')} {filteredCustomers.length} {t('entries')}
              </div>
              <div className="text-center text-gray-400 text-xs">
                {t('All rights reserved © 2025 Second Support')}
              </div>
            </div>
          </>
        )}
      </div>

      {/* View Customer Dialog */}
      <Dialog open={viewingCustomer !== null} onOpenChange={() => setViewingCustomer(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('Customer Details')}</DialogTitle>
          </DialogHeader>
          {viewingCustomer && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Customer Code')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Customer Name')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Email')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Phone')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.phone || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('VAT Registration Number')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.vatRegistrationNumber || '-'}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Account')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.account}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Opening Balance')}</label>
                  <p className="text-sm text-gray-900">{formatCurrency(viewingCustomer.openingBalance || "0")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Status')}</label>
                  <div className="mt-1">{getStatusBadge(viewingCustomer.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Street Name')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.streetName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('City')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.city || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Country')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.country || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('Postal Code')}</label>
                  <p className="text-sm text-gray-900">{viewingCustomer.postalCode || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editingCustomer !== null} onOpenChange={() => setEditingCustomer(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Customer')}</DialogTitle>
            <DialogDescription>
              {t('Update customer information and save changes.')}
            </DialogDescription>
          </DialogHeader>
          {editingCustomer && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Customer Code')}</FormLabel>
                          <FormControl>
                            <Input {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Customer Name')} *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('Enter customer name')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="account"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Account')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('Select account type')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Accounts Receivables">{t('Accounts Receivables')}</SelectItem>
                              <SelectItem value="Customer">{t('Customer')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Mobile')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="+966XXXXXXXXX" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder={t('Enter email address')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="vatRegistrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('VAT Registration Number')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('Enter VAT number')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <FormField
                      control={editForm.control}
                      name="openingBalance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Opening Balance')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="0.00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="streetName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Street Name')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('Enter street address')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('City')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('Enter city')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Country')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('Enter country')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="postalCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Postal Code')}</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder={t('Enter postal code')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('Status')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('Select status')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">{t('Active')}</SelectItem>
                              <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingCustomer(null)}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    type="submit"
                    className="bg-teal-600 hover:bg-teal-700"
                    disabled={editCustomerMutation.isPending}
                  >
                    {editCustomerMutation.isPending ? t('Saving...') : t('Save Changes')}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CustomerList;
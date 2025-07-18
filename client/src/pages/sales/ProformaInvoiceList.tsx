import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Sidebar } from "@/components/Sidebar";
import { Plus, Search, Filter, Copy, FileDown, Printer, MoreHorizontal, Pencil, Trash2, Eye, FileText, ChevronDown, ChevronUp, CalendarIcon } from "lucide-react";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { ProformaInvoice, Customer } from "@shared/schema";

interface ProformaInvoiceListProps {
  onLogout: () => void;
}

export function ProformaInvoiceList({ onLogout }: ProformaInvoiceListProps) {
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  
  // Filter state
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [customerFilter, setCustomerFilter] = useState("all");
  const [issueDateFrom, setIssueDateFrom] = useState<Date | undefined>(undefined);
  const [issueDateTo, setIssueDateTo] = useState<Date | undefined>(undefined);
  const [amountFrom, setAmountFrom] = useState("");
  const [amountTo, setAmountTo] = useState("");

  const { data: proformaInvoices = [], isLoading } = useQuery<ProformaInvoice[]>({
    queryKey: ["/api/proforma-invoices"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });

  // Prefetch data needed for create page to eliminate loading time
  useEffect(() => {
    // Prefetch customers with longer cache times
    queryClient.prefetchQuery({
      queryKey: ["/api/customers"],
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    });
    
    // Prefetch products with longer cache times
    queryClient.prefetchQuery({
      queryKey: ["/api/products"],
      staleTime: 10 * 60 * 1000, // 10 minutes  
      cacheTime: 30 * 60 * 1000, // 30 minutes
    });
  }, [queryClient]);

  const deleteProformaInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/proforma-invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/proforma-invoices"] });
      toast({
        title: t("Success"),
        description: t("Proforma invoice deleted successfully"),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t("Error"),
        description: t("Failed to delete proforma invoice"),
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "outline", 
      accepted: "default",
      declined: "destructive",
      expired: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {t(status.charAt(0).toUpperCase() + status.slice(1))}
      </Badge>
    );
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return parseFloat(amount).toLocaleString();
  };

  const filteredProformaInvoices = useMemo(() => {
    return (proformaInvoices as (ProformaInvoice & { customer?: any })[]).filter((invoice: ProformaInvoice & { customer?: any }) => {
      const matchesSearch = 
        invoice.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customer?.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      
      const matchesCustomer = customerFilter === "all" || invoice.customerId === customerFilter;
      
      const invoiceDate = new Date(invoice.issueDate);
      const matchesDateFrom = !issueDateFrom || invoiceDate >= issueDateFrom;
      const matchesDateTo = !issueDateTo || invoiceDate <= issueDateTo;
      
      const amount = parseFloat(invoice.totalAmount || '0');
      const matchesAmountFrom = !amountFrom || amount >= parseFloat(amountFrom);
      const matchesAmountTo = !amountTo || amount <= parseFloat(amountTo);
      
      return matchesSearch && matchesStatus && matchesCustomer && matchesDateFrom && matchesDateTo && matchesAmountFrom && matchesAmountTo;
    });
  }, [proformaInvoices, searchTerm, statusFilter, customerFilter, issueDateFrom, issueDateTo, amountFrom, amountTo]);

  const paginatedProformaInvoices = useMemo(() => {
    return filteredProformaInvoices.slice(0, parseInt(entriesPerPage));
  }, [filteredProformaInvoices, entriesPerPage]);

  const handleDelete = useCallback((id: string, referenceId: string) => {
    if (window.confirm(t(`Are you sure you want to delete proforma invoice ${referenceId}?`))) {
      deleteProformaInvoiceMutation.mutate(id);
    }
  }, [deleteProformaInvoiceMutation, t]);

  const handleView = useCallback((id: string) => {
    window.location.href = `/sales/proforma-invoices/${id}/view`;
  }, []);

  const handleEdit = useCallback((id: string) => {
    window.location.href = `/sales/proforma-invoices/${id}/edit`;
  }, []);

  const handlePrint = useCallback(async (id: string, referenceId: string) => {
    try {
      // Show immediate feedback
      toast({
        title: t("Processing"),
        description: t("Opening proforma invoice for printing..."),
      });

      // Direct approach - open PDF URL in new tab for immediate printing
      const pdfUrl = `/api/proforma-invoices/${id}/print`;
      const newTab = window.open(pdfUrl, '_blank');
      
      if (newTab) {
        newTab.focus();
        toast({
          title: t("Success"),
          description: t("Proforma invoice") + ` ${referenceId} ` + t("opened for printing"),
        });
      } else {
        // Fallback - download if pop-up blocked
        const response = await fetch(pdfUrl, {
          credentials: 'include'
        });
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `proforma-invoice-${referenceId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          toast({
            title: t("Downloaded"),
            description: t("Proforma invoice") + ` ${referenceId} ` + t("downloaded - please print from your PDF viewer"),
          });
        } else {
          throw new Error('Failed to generate PDF');
        }
      }
      
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: t("Error"),
        description: t("Failed to print proforma invoice") + `: ${error.message}`,
        variant: "destructive",
      });
    }
  }, [t, toast]);

  const handlePrintAll = useCallback(async () => {
    if (paginatedProformaInvoices.length === 0) {
      toast({
        title: t('No Data'),
        description: t('No proforma invoices to print'),
        variant: 'destructive',
      });
      return;
    }

    // If there's only one invoice, print it directly
    if (paginatedProformaInvoices.length === 1) {
      const invoice = paginatedProformaInvoices[0];
      await openPrintInNewTab(invoice.id);
      return;
    }

    // If multiple invoices, print the first one (or could show a selection dialog)
    const firstInvoice = paginatedProformaInvoices[0];
    await openPrintInNewTab(firstInvoice.id);
  }, [paginatedProformaInvoices, t, toast]);

  const openPrintInNewTab = useCallback(async (invoiceId: string) => {
    try {
      // Open the PDF in a new tab instead of downloading
      const response = await fetch(`/api/proforma-invoices/${invoiceId}/print`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(url, '_blank');
      
      // Clean up the URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      toast({
        title: t('Success'),
        description: t('Proforma invoice opened in new tab'),
      });
    } catch (error) {
      console.error('Error opening proforma invoice:', error);
      toast({
        title: t('Error'),
        description: t('Failed to open proforma invoice'),
        variant: 'destructive',
      });
    }
  }, [t, toast]);

  // Format amount for display
  const formatAmount = (amount: string | number) => {
    return `${parseFloat(amount.toString()).toFixed(2)} ر.س`;
  };

  // Format amount for PDF (without Arabic symbols)
  const formatAmountForPDF = (amount: string | number) => {
    return parseFloat(amount.toString()).toFixed(2);
  };

  // Convert image to base64 for PDF embedding
  const loadImageAsBase64 = (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  // Filter handler functions
  const handleResetFilters = () => {
    setCustomerFilter("all");
    setIssueDateFrom(undefined);
    setIssueDateTo(undefined);
    setAmountFrom("");
    setAmountTo("");
  };

  const handleApplyFilters = () => {
    // The filters are applied in the filteredProformaInvoices useMemo
    toast({
      title: t("Success"),
      description: t("Filters applied successfully"),
    });
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const excelData = proformaInvoices.map((invoice, index) => {
      const customer = customers.find(c => c.id === invoice.customerId);
      return {
        'No.': index + 1,
        'Reference ID': invoice.referenceId,
        'Customer Name': customer?.customerName || 'Unknown Customer',
        'Description': invoice.description || '',
        'Issue Date': formatDate(invoice.issueDate),
        'Status': invoice.status,
        'Discount': invoice.discount || '0',
        'VAT %': invoice.vatPercent || '15',
        'Total Amount': formatAmountForPDF(invoice.totalAmount || '0')
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Proforma Invoices');
    
    const fileName = `proforma-invoices_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: t("Success"),
      description: t("Excel file downloaded successfully"),
    });
  };

  // Handle PDF download
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Proforma Invoice List', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const pdfData = proformaInvoices.map((invoice, index) => {
      const customer = customers.find(c => c.id === invoice.customerId);
      return [
        index + 1,
        invoice.referenceId,
        customer?.customerName || 'Unknown Customer',
        invoice.description || '',
        formatDate(invoice.issueDate),
        invoice.status,
        invoice.discount || '0',
        invoice.vatPercent || '15',
        formatAmountForPDF(invoice.totalAmount || '0')
      ];
    });

    autoTable(doc, {
      head: [[
        '#',
        'Reference ID',
        'Customer Name',
        'Description',
        'Issue Date',
        'Status',
        'Discount',
        'VAT %',
        'Total Amount'
      ]],
      body: pdfData,
      startY: 35,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [20, 184, 166],
        textColor: 255,
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    const fileName = `proforma-invoices_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: t("Success"),
      description: t("PDF file downloaded successfully"),
    });
  };

  // Handle print list - Print detailed individual proforma invoices
  const handlePrintProformaInvoiceList = async () => {
    try {
      toast({
        title: t("Processing"),
        description: t("Generating detailed proforma invoices for printing..."),
      });

      const doc = new jsPDF();
      let isFirstPage = true;

      // Process each proforma invoice
      for (const invoice of proformaInvoices) {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;



        const customer = customers.find(c => c.id === invoice.customerId);
        
        // Company Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Proforma Invoice', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Name : Second Support for General Cont. Est', 20, 35);
        doc.text('Vat Registration Number: 310183997800003', 20, 45);
        doc.text('Address : P.O. Box 2017 – Al-Jubail 31951 King Khaled Bin', 20, 55);
        doc.text('Abdulaziz St. Kingdom of Saudi Arabia', 20, 65);
        doc.text('Commercial number: 2055133472', 20, 75);

        // Invoice Details
        doc.setFont('helvetica', 'bold');
        doc.text('Reference ID:', 20, 95);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.referenceId, 70, 95);

        doc.setFont('helvetica', 'bold');
        doc.text('Description:', 20, 105);
        doc.setFont('helvetica', 'normal');
        doc.text(invoice.description || '', 70, 105);

        doc.setFont('helvetica', 'bold');
        doc.text('Issue Date:', 20, 115);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(invoice.issueDate), 70, 115);

        // Customer Details
        doc.setFont('helvetica', 'bold');
        doc.text('Customer:', 120, 95);
        doc.setFont('helvetica', 'normal');
        doc.text(customer?.customerName || 'Unknown Customer', 120, 105);
        
        if (customer?.phone) {
          doc.setFont('helvetica', 'bold');
          doc.text('Phone:', 120, 115);
          doc.setFont('helvetica', 'normal');
          doc.text(customer.phone, 120, 125);
        }

        if (customer?.vatNumber) {
          doc.setFont('helvetica', 'bold');
          doc.text('Vat Registration Number:', 120, 135);
          doc.setFont('helvetica', 'normal');
          doc.text(customer.vatNumber, 120, 145);
        }

        // Items Table
        const itemsData = invoice.items.map(item => [
          item.description || '',
          item.qty.toString(),
          formatAmountForPDF(item.unitPrice),
          item.discountPercent + '%',
          item.vatPercent + '%',
          formatAmountForPDF(item.vatValue),
          formatAmountForPDF(item.amount)
        ]);

        autoTable(doc, {
          head: [['Description', 'Qty', 'Unit Price', 'Discount %', 'Vat %', 'Vat Value', 'Amount']],
          body: itemsData,
          startY: 160,
          styles: {
            fontSize: 8,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [20, 184, 166],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
        });

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFont('helvetica', 'bold');
        doc.text('Gross:', 140, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountForPDF(invoice.subtotal), 180, finalY);

        doc.setFont('helvetica', 'bold');
        doc.text('Total Vat:', 140, finalY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountForPDF(invoice.vatAmount), 180, finalY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text('Total Amount:', 140, finalY + 20);
        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountForPDF(invoice.totalAmount), 180, finalY + 20);

        // Payment Information
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Information:', 20, finalY + 40);
        doc.setFont('helvetica', 'normal');
        doc.text('Bank Name: SNB', 20, finalY + 50);
        doc.text('Account Name: Second Support For General Contracting', 20, finalY + 60);
        doc.text('IBAN: SA2410000001700000253107', 20, finalY + 70);

        // Terms and Conditions
        let currentY = finalY + 90;
        const termsAndConditions = invoice.termsAndConditions || (invoice as any).terms_and_conditions;

        if (termsAndConditions && termsAndConditions.trim()) {
          // Check if we need a new page
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text('Terms and Conditions', 20, currentY);
          doc.setFont('helvetica', 'normal');
          // Remove HTML tags and clean up text
          const termsText = termsAndConditions
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Remove leading/trailing spaces
          
          if (termsText) {
            const termsLines = doc.splitTextToSize(termsText, 170);
            doc.text(termsLines, 20, currentY + 10);
            currentY += 10 + (termsLines.length * 7);
          }
        }

        // Notes
        const notes = invoice.notes || (invoice as any).notes;

        if (notes && notes.trim()) {
          currentY += 15;
          
          // Check if we need a new page
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text('Notes', 20, currentY);
          doc.setFont('helvetica', 'normal');
          // Remove HTML tags and clean up text
          const notesText = notes
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Remove leading/trailing spaces
          
          if (notesText) {
            const notesLines = doc.splitTextToSize(notesText, 170);
            doc.text(notesLines, 20, currentY + 10);
            currentY += 10 + (notesLines.length * 7);
          }
        }

        // Attachments
        const attachments = invoice.attachments || (invoice as any).attachments;

        if (attachments && attachments.length > 0) {
          currentY += 15;
          
          // Check if we need a new page
          if (currentY > 200) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text('Attachments', 20, currentY);
          doc.setFont('helvetica', 'normal');
          currentY += 15;
          
          for (let i = 0; i < attachments.length; i++) {
            const attachment = attachments[i];
            
            // Check if we need a new page for each attachment
            if (currentY > 200) {
              doc.addPage();
              currentY = 20;
            }
            
            try {
              // Try to embed the image if it's an image file
              if (attachment.mimetype && attachment.mimetype.startsWith('image/')) {
                doc.text(`${i + 1}. ${attachment.originalName || attachment.filename}`, 20, currentY);
                currentY += 10;
                
                try {
                  // Load and embed the actual image
                  const imageUrl = `${window.location.origin}${attachment.path}`;
                  const base64Image = await loadImageAsBase64(imageUrl);
                  
                  // Check if we have space for the image
                  if (currentY > 150) {
                    doc.addPage();
                    currentY = 20;
                  }
                  
                  // Add the image to the PDF
                  doc.addImage(base64Image, 'JPEG', 20, currentY, 80, 60); // width: 80, height: 60
                  currentY += 70;
                } catch (imageError) {
                  console.error('Error loading image:', imageError);
                  doc.setFontSize(8);
                  doc.text(`   (Image could not be loaded)`, 25, currentY);
                  doc.setFontSize(10);
                  currentY += 10;
                }
              } else {
                // For non-image files, just show the filename
                doc.text(`${i + 1}. ${attachment.originalName || attachment.filename}`, 20, currentY);
                currentY += 10;
              }
            } catch (error) {
              console.error('Error processing attachment:', error);
              doc.text(`${i + 1}. ${attachment.originalName || attachment.filename}`, 20, currentY);
              currentY += 10;
            }
          }
        }
      }

      // Generate PDF blob and open in new tab for printing
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      const newTab = window.open(pdfUrl, '_blank');
      if (newTab) {
        newTab.focus();
        toast({
          title: t("Success"),
          description: t("Detailed proforma invoices opened for printing"),
        });
      } else {
        toast({
          title: t("Info"),
          description: t("Please allow pop-ups to print the proforma invoices"),
          variant: "default",
        });
      }

      // Clean up URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 5000);

    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: t("Error"),
        description: t("Failed to generate proforma invoices for printing"),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="flex-1 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center text-sm text-gray-500 mb-2">
              <span className="text-teal-600">{t('Sales')}</span>
              <span className="mx-2">/</span>
              <span>{t('Proforma invoices')}</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {t('Proforma invoices')}
            </h1>
          </div>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">{t('Proforma invoices')}</CardTitle>
                <div className="flex gap-2">
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
                    onClick={handlePrintProformaInvoiceList}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    {t('Print')}
                  </Button>
                  <Button 
                    className="bg-teal-600 hover:bg-teal-700" 
                    size="sm"
                    onClick={() => window.location.href = "/sales/proforma-invoices/create"}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('Add Proforma Invoice')}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Filter Section */}
              <div className="bg-teal-600 text-white rounded-lg mb-6">
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      <span className="font-medium">{t('Filter')}</span>
                    </div>
                    {isFilterExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/80 hover:text-white" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/80 hover:text-white" />
                    )}
                  </div>
                </div>
                
                {isFilterExpanded && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Customer Filter */}
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('Customer')}</label>
                        <Select value={customerFilter} onValueChange={setCustomerFilter}>
                          <SelectTrigger className="w-full bg-white text-gray-900">
                            <SelectValue placeholder={t('All')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('All')}</SelectItem>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.customerName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Issue Date Range */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-2">{t('Issue Date')}</label>
                        <div className="flex gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-white text-gray-900",
                                  !issueDateFrom && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {issueDateFrom ? format(issueDateFrom, "dd-MM-yyyy") : <span>{t('dd-mm-yyyy')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={issueDateFrom}
                                onSelect={setIssueDateFrom}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-white text-gray-900",
                                  !issueDateTo && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {issueDateTo ? format(issueDateTo, "dd-MM-yyyy") : <span>{t('dd-mm-yyyy')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={issueDateTo}
                                onSelect={setIssueDateTo}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      {/* Amount Range */}
                      <div>
                        <label className="block text-sm font-medium mb-2">{t('Amount')}</label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder={t('from')}
                            value={amountFrom}
                            onChange={(e) => setAmountFrom(e.target.value)}
                            className="bg-white text-gray-900"
                          />
                          <Input
                            type="number"
                            placeholder={t('to')}
                            value={amountTo}
                            onChange={(e) => setAmountTo(e.target.value)}
                            className="bg-white text-gray-900"
                          />
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="md:col-span-2 flex items-end justify-start gap-2">
                        <Button
                          variant="outline"
                          className="bg-white text-teal-600 hover:bg-gray-50 border-white"
                          onClick={handleResetFilters}
                        >
                          {t('Reset')}
                        </Button>
                        <Button
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                          onClick={handleApplyFilters}
                        >
                          {t('Submit')}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
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

                <div className="flex items-center gap-4">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t('All Status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('All Status')}</SelectItem>
                      <SelectItem value="draft">{t('Draft')}</SelectItem>
                      <SelectItem value="sent">{t('Sent')}</SelectItem>
                      <SelectItem value="accepted">{t('Accepted')}</SelectItem>
                      <SelectItem value="declined">{t('Declined')}</SelectItem>
                      <SelectItem value="expired">{t('Expired')}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder={t('Search proforma invoices...')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t('Reference ID')}</TableHead>
                      <TableHead>{t('Customer')}</TableHead>
                      <TableHead>{t('Issue Date')}</TableHead>
                      <TableHead>{t('Discount %')}</TableHead>
                      <TableHead>{t('Vat %')}</TableHead>
                      <TableHead>{t('Amount')}</TableHead>
                      <TableHead>{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProformaInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {t('No proforma invoices found')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedProformaInvoices.map((invoice: ProformaInvoice & { customer?: any }, index: number) => (
                        <TableRow key={invoice.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="text-blue-600 font-medium">
                            {invoice.referenceId}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-gray-900">
                                {invoice.customer?.customerName || "Unknown Customer"}
                              </div>
                              {invoice.customer?.email && (
                                <div className="text-sm text-gray-500">
                                  {invoice.customer.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell>{invoice.discountPercent}%</TableCell>
                          <TableCell>{invoice.vatPercent}%</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(invoice.id)}
                                className="h-8 w-8 p-0"
                                title={t('View')}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(invoice.id)}
                                className="h-8 w-8 p-0"
                                title={t('Edit')}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(invoice.id, invoice.referenceId)}
                                className="h-8 w-8 p-0"
                                title={t('Print')}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    title={t('Delete')}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('Delete Proforma Invoice')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t('Are you sure you want to delete this proforma invoice? This action cannot be undone.')}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => handleDelete(invoice.id, invoice.referenceId)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {t('Delete')}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Info */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  Showing {Math.min(paginatedProformaInvoices.length, parseInt(entriesPerPage))} of {filteredProformaInvoices.length} entries
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    {t('Previous')}
                  </Button>
                  <Button variant="outline" size="sm" className="bg-teal-600 text-white">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    {t('Next')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
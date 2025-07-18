import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronDown, Eye, Edit, Trash2, Plus, FileText, Download, Copy, Upload, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Customer {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
}

interface Quotation {
  id: string;
  referenceId: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  discount: number;
  vatPercent: number;
  totalAmount: number;
}

export default function QuotationList() {
  const [, setLocation] = useLocation();
  const [filterExpanded, setFilterExpanded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customerFilter, setCustomerFilter] = useState("All");
  const [issueDateFrom, setIssueDateFrom] = useState("");
  const [issueDateTo, setIssueDateTo] = useState("");
  const [dueDateFrom, setDueDateFrom] = useState("");
  const [dueDateTo, setDueDateTo] = useState("");
  const [amountFilter, setAmountFilter] = useState("");

  const [filterParams, setFilterParams] = useState<URLSearchParams>(new URLSearchParams());

  const { data: quotations = [], isLoading } = useQuery<Quotation[]>({
    queryKey: ["/api/quotations", filterParams.toString()],
    queryFn: async () => {
      const url = `/api/quotations${filterParams.toString() ? `?${filterParams.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch quotations');
      }
      return response.json();
    },
  });

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    
    if (customerFilter && customerFilter !== "All") {
      params.append("customerId", customerFilter);
    }
    if (issueDateFrom) {
      params.append("issueDateFrom", issueDateFrom);
    }
    if (issueDateTo) {
      params.append("issueDateTo", issueDateTo);
    }
    if (dueDateFrom) {
      params.append("dueDateFrom", dueDateFrom);
    }
    if (dueDateTo) {
      params.append("dueDateTo", dueDateTo);
    }
    if (amountFilter) {
      params.append("minAmount", amountFilter);
    }

    setFilterParams(params);
  };

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Delete quotation mutation
  const deleteQuotation = useMutation({
    mutationFn: async (quotationId: string) => {
      const response = await fetch(`/api/quotations/${quotationId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to delete quotation');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quotation deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotations"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete quotation",
        variant: "destructive"
      });
    }
  });

  // Handle view quotation
  const handleView = (quotationId: string) => {
    setLocation(`/sales/quotations/${quotationId}`);
  };

  // Handle edit quotation
  const handleEdit = (quotationId: string) => {
    setLocation(`/sales/quotations/${quotationId}/edit`);
  };



  // Handle delete quotation
  const handleDelete = (quotationId: string, referenceId: string) => {
    if (window.confirm(`Are you sure you want to delete quotation ${referenceId}?`)) {
      deleteQuotation.mutate(quotationId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatAmount = (amount: number | string) => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericAmount || 0);
  };

  // Format amount for PDF (numeric only)
  const formatAmountForPDF = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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

  const handleClearFilters = () => {
    setCustomerFilter("All");
    setIssueDateFrom("");
    setIssueDateTo("");
    setDueDateFrom("");
    setDueDateTo("");
    setAmountFilter("");
    setFilterParams(new URLSearchParams());
  };

  // Download Excel functionality
  const handleDownloadExcel = () => {
    const excelData = quotations.map((quotation, index) => {
      const customer = customers.find(c => c.id === quotation.customerId);
      return {
        '#': index + 1,
        'Reference ID': quotation.referenceId,
        'Customer Name': customer?.customerName || 'Unknown Customer',
        'Issue Date': formatDate(quotation.issueDate),
        'Due Date': formatDate(quotation.dueDate),
        'Status': quotation.status,
        'Discount': quotation.discount + '%',
        'VAT': quotation.vatPercent + '%',
        'Total Amount': formatAmount(quotation.totalAmount)
      };
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Quotations');
    
    const fileName = `quotations_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Success",
      description: "Excel file downloaded successfully",
    });
  };

  // Download PDF functionality
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(16);
    doc.text('Quotation List', 14, 22);
    
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    const pdfData = quotations.map((quotation, index) => {
      const customer = customers.find(c => c.id === quotation.customerId);
      return [
        index + 1,
        quotation.referenceId,
        customer?.customerName || 'Unknown Customer',
        formatDate(quotation.issueDate),
        formatDate(quotation.dueDate),
        quotation.status,
        quotation.discount + '%',
        quotation.vatPercent + '%',
        formatAmount(quotation.totalAmount)
      ];
    });

    autoTable(doc, {
      head: [[
        '#',
        'Reference ID',
        'Customer Name',
        'Issue Date',
        'Due Date',
        'Status',
        'Discount',
        'VAT',
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

    const fileName = `quotations_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    toast({
      title: "Success",
      description: "PDF file downloaded successfully",
    });
  };

  // Handle print list - Print detailed individual quotations
  const handlePrintQuotationList = async () => {
    try {
      toast({
        title: "Processing",
        description: "Generating detailed quotations for printing...",
      });

      const doc = new jsPDF();
      let isFirstPage = true;

      // Process each quotation
      for (const quotation of quotations) {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        const customer = customers.find(c => c.id === quotation.customerId);
        
        // Company Header
        doc.setFontSize(18);
        doc.text('Quotation', 105, 20, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text('Name: Second Support for General Cont. Est', 20, 35);
        doc.text('Vat Registration Number: 310183997800003', 20, 45);
        doc.text('Address: P.O. Box 2017 – Al-Jubail 31951 King Khaled Bin', 20, 55);
        doc.text('Abdulaziz St, Kingdom of Saudi Arabia', 20, 65);
        doc.text('Commercial number: 2055133472', 20, 75);

        // Quotation and Customer Information
        doc.setFontSize(10);
        doc.text('Reference ID:', 20, 95);
        doc.text(quotation.referenceId, 70, 95);
        doc.text('Customer:', 120, 95);
        doc.text(customer?.customerName || 'Unknown Customer', 150, 95);

        doc.text('Description:', 20, 105);
        doc.text(quotation.description || '', 70, 105);

        doc.text('Issue Date:', 20, 115);
        doc.text(formatDate(quotation.issueDate), 70, 115);
        doc.text('Phone:', 120, 115);
        doc.text(customer?.phone || '', 150, 115);

        doc.text('Due Date:', 20, 125);
        doc.text(formatDate(quotation.dueDate), 70, 125);

        // Items Table
        const items = quotation.items || [];
        const tableData = items.map((item: any) => [
          item.description || '',
          item.qty || 0,
          formatAmountForPDF(item.unitPrice || 0),
          `${item.discountPercent || 0}%`,
          `${item.vatPercent || 15}%`,
          formatAmountForPDF(item.vatValue || 0),
          formatAmountForPDF(item.amount || 0)
        ]);

        autoTable(doc, {
          head: [['Description', 'Qty', 'Unit Price', 'Discount %', 'Vat %', 'Vat Value', 'Amount']],
          body: tableData,
          startY: 140,
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

        // Totals
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setFont('helvetica', 'bold');
        doc.text('Gross:', 140, finalY);
        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountForPDF(quotation.subtotal), 180, finalY);

        doc.setFont('helvetica', 'bold');
        doc.text('Total Vat:', 140, finalY + 10);
        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountForPDF(quotation.vatAmount), 180, finalY + 10);

        doc.setFont('helvetica', 'bold');
        doc.text('Total Amount:', 140, finalY + 20);
        doc.setFont('helvetica', 'normal');
        doc.text(formatAmountForPDF(quotation.totalAmount), 180, finalY + 20);

        // Payment Information
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Information:', 20, finalY + 40);
        doc.setFont('helvetica', 'normal');
        doc.text('Bank Name: SNB', 20, finalY + 50);
        doc.text('Account Name: Second Support For General Contracting', 20, finalY + 60);
        doc.text('IBAN: SA2410000001700000253107', 20, finalY + 70);

        // Terms and Conditions
        let currentY = finalY + 90;
        const termsAndConditions = quotation.termsAndConditions || (quotation as any).terms_and_conditions;

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
        const notes = quotation.notes || (quotation as any).notes;

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
        const attachments = quotation.attachments || (quotation as any).attachments;

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
          title: "Success",
          description: "Detailed quotations opened for printing",
        });
      } else {
        toast({
          title: "Info",
          description: "Please allow pop-ups to print the quotations",
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
        title: "Error",
        description: "Failed to generate quotations for printing",
        variant: "destructive",
      });
    }
  };

  // Print individual quotation - optimized for speed
  const handlePrint = async (quotationId: string, referenceId: string) => {
    try {
      // Show immediate feedback
      toast({
        title: "Processing",
        description: "Opening quotation for printing...",
      });

      // Direct approach - open PDF URL in new tab for immediate printing
      const pdfUrl = `/api/quotations/${quotationId}/pdf`;
      const newTab = window.open(pdfUrl, '_blank');
      
      if (newTab) {
        newTab.focus();
        toast({
          title: "Success",
          description: `Quotation ${referenceId} opened for printing`,
        });
      } else {
        // Fallback - download if pop-up blocked
        const response = await fetch(pdfUrl);
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = `quotation-${referenceId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          
          toast({
            title: "Downloaded",
            description: `Quotation ${referenceId} downloaded - please print from your PDF viewer`,
          });
        } else {
          throw new Error('Failed to generate PDF');
        }
      }
      
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Error",
        description: `Failed to print quotation: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
            <span>Sales</span>
            <span>/</span>
            <span className="text-teal-600">Quotation</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
        </div>
        <div className="flex items-center space-x-2">
          {/* Action Buttons */}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gray-300"
            onClick={handleDownloadExcel}
          >
            <FileText className="w-4 h-4 mr-2" />
            Download Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gray-300"
            onClick={handleDownloadPDF}
          >
            <Copy className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-gray-300"
            onClick={handlePrintQuotationList}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button 
            className="bg-teal-600 hover:bg-teal-700 text-white"
            size="sm"
            onClick={() => setLocation("/sales/quotations/create")}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Quotation
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <Card className="mb-6">
        <Collapsible open={filterExpanded} onOpenChange={setFilterExpanded}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer bg-teal-600 text-white rounded-t-lg">
              <span className="font-medium">Filter</span>
              <ChevronDown className={cn("w-4 h-4 transition-transform", filterExpanded && "rotate-180")} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-6 space-y-4">
              {/* First Row - Customer and Issue Date */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      {Array.isArray(customers) && customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.customerName || 'Unknown Customer'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={issueDateFrom}
                      onChange={(e) => setIssueDateFrom(e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
                  <div className="relative">
                    <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={issueDateTo}
                      onChange={(e) => setIssueDateTo(e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Second Row - Due Date and Amount */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <div className="relative">
                    <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={dueDateFrom}
                      onChange={(e) => setDueDateFrom(e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
                  <div className="relative">
                    <Input
                      type="date"
                      placeholder="dd-mm-yyyy"
                      value={dueDateTo}
                      onChange={(e) => setDueDateTo(e.target.value)}
                      className="pr-10"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2 pt-2">
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6"
                  onClick={handleApplyFilters}
                >
                  Apply
                </Button>
                <Button 
                  variant="outline" 
                  className="px-6 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                  onClick={handleClearFilters}
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">Show</span>
          <Select defaultValue="10">
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-600">entries</span>
        </div>
      </div>

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium">Reference ID</TableHead>
                <TableHead className="text-xs font-medium">Customer</TableHead>
                <TableHead className="text-xs font-medium">Issue Date</TableHead>
                <TableHead className="text-xs font-medium">Due Date</TableHead>
                <TableHead className="text-xs font-medium">Status</TableHead>
                <TableHead className="text-xs font-medium">Discount Amount</TableHead>
                <TableHead className="text-xs font-medium">Vat %</TableHead>
                <TableHead className="text-xs font-medium">Amount</TableHead>
                <TableHead className="text-xs font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Loading quotations...
                  </TableCell>
                </TableRow>
              ) : quotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No quotations found
                  </TableCell>
                </TableRow>
              ) : (
                quotations.map((quotation: Quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="text-xs">{quotation.referenceId}</TableCell>
                    <TableCell className="text-xs">
                      {Array.isArray(customers) ? 
                        customers.find((c: any) => c.id === quotation.customerId)?.customerName || 'Unknown Customer'
                        : 'Unknown Customer'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(quotation.issueDate)}</TableCell>
                    <TableCell className="text-xs">{formatDate(quotation.dueDate)}</TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", getStatusColor(quotation.status))}>
                        {quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatAmount(quotation.discount || 0)}</TableCell>
                    <TableCell className="text-xs">{(parseFloat(quotation.vatPercent) || 0).toFixed(2)}%</TableCell>
                    <TableCell className="text-xs font-medium">{formatAmount(quotation.totalAmount || 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                          title="View"
                          onClick={() => handleView(quotation.id)}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                          title="Edit"
                          onClick={() => handleEdit(quotation.id)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-orange-600 hover:text-orange-800"
                          title="Print"
                          onClick={() => handlePrint(quotation.id, quotation.referenceId)}
                        >
                          <Printer className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-800"
                          title="Delete"
                          onClick={() => handleDelete(quotation.id, quotation.referenceId)}
                          disabled={deleteQuotation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Footer */}
      <div className="mt-4 text-center text-xs text-gray-500">
        All rights reserved © 2023 VOM.
      </div>
    </div>
  );
}
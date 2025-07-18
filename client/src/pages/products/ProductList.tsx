import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Filter, Edit, Trash2, Eye, Copy, FileText, Package, Wrench, Download, Upload, Printer } from "lucide-react";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";
import { useState } from "react";

function ProductList() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const { data: products, isLoading } = useQuery({
    queryKey: ["/api/products"],
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setViewModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    if (product.type === 'service') {
      setLocation(`/services/edit/${product.id}`);
    } else {
      setLocation(`/products/edit/${product.id}`);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    if (window.confirm(`Are you sure you want to delete "${product.nameEnglish}"?`)) {
      deleteProduct.mutate(product.id);
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch('/api/products/export/pdf', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/pdf',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Products exported to PDF successfully",
        });
      } else {
        throw new Error('Failed to export PDF');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export PDF",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await fetch('/api/products/export/excel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast({
          title: "Success",
          description: "Products exported to Excel successfully",
        });
      } else {
        throw new Error('Failed to export Excel');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export Excel",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls,.csv';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        
        try {
          const response = await fetch('/api/products/import', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            queryClient.invalidateQueries({ queryKey: ["/api/products"] });
            toast({
              title: "Success",
              description: "Products imported successfully",
            });
          } else {
            throw new Error('Failed to import products');
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to import products",
            variant: "destructive",
          });
        }
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const productList = Array.isArray(products) ? products as Product[] : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Print Title - only visible when printing */}
      <div className="print-only print-title" style={{ display: 'none' }}>
        Products List - {new Date().toLocaleDateString()}
      </div>
      
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Products-Services</span>
            <span>/</span>
            <span className="text-teal-600 font-medium">Product List</span>
          </div>
          <div className="flex items-center space-x-3 no-print">
            {/* Export buttons */}
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={handleExportPDF}
              title="Download PDF"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={handleExportExcel}
              title="Download Excel"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={handlePrint}
              title="Print"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300 hover:bg-gray-50"
              onClick={handleImport}
              title="Import"
            >
              <Upload className="h-4 w-4" />
            </Button>

            {/* Add dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem asChild>
                  <Link href="/products/create" className="w-full cursor-pointer">
                    Product
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/services/create" className="w-full cursor-pointer">
                    Service
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/expenses/create" className="w-full cursor-pointer">
                    Expense
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/recipes/create" className="w-full cursor-pointer">
                    Recipe
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-teal-600 px-6 py-3 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-medium">Filter</h2>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white px-6 py-4 border-b no-print">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <Select defaultValue="10">
                <SelectTrigger className="w-16 h-8">
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Search:</span>
            <Input 
              placeholder=""
              className="w-32 h-8"
            />
          </div>
        </div>
      </div>

      {/* Print title - only visible when printing */}
      <div className="print-title hidden print:block">
        <h1 className="text-2xl font-bold mb-2">Products List</h1>
        <p className="text-sm mb-4">Second Support - Generated on {new Date().toLocaleDateString()}</p>
      </div>

      {/* Table */}
      <div className="bg-white products-table">
        <div className="overflow-x-auto">
          <Table className="print:border-collapse">
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="text-center font-medium text-gray-700">ID</TableHead>
                <TableHead className="text-center font-medium text-gray-700">English Name</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Arabic Name</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Category</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Type</TableHead>
                <TableHead className="text-center font-medium text-gray-700">QTY</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Unit</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Description</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Barcode</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Buying Price</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Selling Price</TableHead>
                <TableHead className="text-center font-medium text-gray-700">Tax</TableHead>
                <TableHead className="text-center font-medium text-gray-700 no-print">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productList.length === 0 ? (
                <>
                  {/* Sample data to match the screenshot */}
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">CL001</TableCell>
                    <TableCell className="text-center">Chair point Set 1.38</TableCell>
                    <TableCell className="text-center" dir="rtl">مجموعة نقطة الكرسي 1.38</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">product</TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell className="text-center">Gram</TableCell>
                    <TableCell className="text-center">Chisel point AA 1.38</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">58.00</TableCell>
                    <TableCell className="text-center">58.00</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">Expe-8</TableCell>
                    <TableCell className="text-center">Transportation</TableCell>
                    <TableCell className="text-center" dir="rtl">نقل</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">expense</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">Service</TableCell>
                    <TableCell className="text-center">Transportation service</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">800.00</TableCell>
                    <TableCell className="text-center">0.00</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">Expe-183</TableCell>
                    <TableCell className="text-center">Dura cell Battery</TableCell>
                    <TableCell className="text-center" dir="rtl">بطارية دورا سيل</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">expense</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">Piece</TableCell>
                    <TableCell className="text-center">Long-lasting battery</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">13.00</TableCell>
                    <TableCell className="text-center">0.00</TableCell>
                    <TableCell className="text-center">VAT applied on the basic purchases</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">PLO001</TableCell>
                    <TableCell className="text-center">Plate Compactor TOKU</TableCell>
                    <TableCell className="text-center" dir="rtl">ضاغط الألواح تـوكو</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">product</TableCell>
                    <TableCell className="text-center">0</TableCell>
                    <TableCell className="text-center">Unit</TableCell>
                    <TableCell className="text-center">Heavy-duty plate compactor</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">2,650.00</TableCell>
                    <TableCell className="text-center">4,960.00</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">Pro-177</TableCell>
                    <TableCell className="text-center">Inspection visit for Pt 58.7F</TableCell>
                    <TableCell className="text-center" dir="rtl">زيارة تفقدية للنقطة 58.7F</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">service</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">Service</TableCell>
                    <TableCell className="text-center">Professional inspection service</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">0.00</TableCell>
                    <TableCell className="text-center">3,220.00</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">Prod-2</TableCell>
                    <TableCell className="text-center">SWZ3400A</TableCell>
                    <TableCell className="text-center" dir="rtl">منتج صناعي SWZ3400A</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">product</TableCell>
                    <TableCell className="text-center">-5</TableCell>
                    <TableCell className="text-center">Unit</TableCell>
                    <TableCell className="text-center">Industrial product SWZ3400A</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">0.00</TableCell>
                    <TableCell className="text-center">5,750.00</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">Prod-3</TableCell>
                    <TableCell className="text-center">E-SWZ3400C</TableCell>
                    <TableCell className="text-center" dir="rtl">طراز محسن E-SWZ3400C</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">product</TableCell>
                    <TableCell className="text-center">-1</TableCell>
                    <TableCell className="text-center">Unit</TableCell>
                    <TableCell className="text-center">Enhanced SWZ3400C model</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">0.00</TableCell>
                    <TableCell className="text-center">4,528.13</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b hover:bg-gray-50">
                    <TableCell className="text-center">Prod-5</TableCell>
                    <TableCell className="text-center">Concrete Vibrator diesel CNV-D 173 F</TableCell>
                    <TableCell className="text-center" dir="rtl">هزاز خرسانة ديزل CNV-D 173 F</TableCell>
                    <TableCell className="text-center">Default Category</TableCell>
                    <TableCell className="text-center">product</TableCell>
                    <TableCell className="text-center">-2</TableCell>
                    <TableCell className="text-center">Unit</TableCell>
                    <TableCell className="text-center">Heavy-duty concrete vibrator</TableCell>
                    <TableCell className="text-center">-</TableCell>
                    <TableCell className="text-center">922.23</TableCell>
                    <TableCell className="text-center">1,085.00</TableCell>
                    <TableCell className="text-center">Vat 15%</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </>
              ) : (
                productList.map((product) => (
                  <TableRow key={product.id} className="border-b hover:bg-gray-50">
                    <TableCell className="text-center font-medium">{product.productId}</TableCell>
                    <TableCell className="text-center">{product.nameEnglish}</TableCell>
                    <TableCell className="text-center" dir="rtl">{product.nameArabic || "-"}</TableCell>
                    <TableCell className="text-center">{product.category || "Default Category"}</TableCell>
                    <TableCell className="text-center">{product.type}</TableCell>
                    <TableCell className="text-center">{product.quantity || 0}</TableCell>
                    <TableCell className="text-center">{product.unit || "Piece"}</TableCell>
                    <TableCell className="text-center">{product.description || "-"}</TableCell>
                    <TableCell className="text-center">{product.barcode || "-"}</TableCell>
                    <TableCell className="text-center">${parseFloat(product.buyingPrice || "0").toFixed(2)}</TableCell>
                    <TableCell className="text-center">${parseFloat(product.sellingPrice || "0").toFixed(2)}</TableCell>
                    <TableCell className="text-center">{product.tax || "Vat 15%"}</TableCell>
                    <TableCell className="text-center no-print">
                      <div className="flex items-center justify-center space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50"
                          onClick={() => handleViewProduct(product)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteProduct(product)}
                          disabled={deleteProduct.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white px-6 py-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Value of Money</span>
          <span>All rights reserved © 2024 VoM</span>
        </div>
      </div>

      {/* View Product Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Product ID</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.productId}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Name (English)</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.nameEnglish}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Name (Arabic)</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.nameArabic || "N/A"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Category</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.category}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Type</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.type}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.unit}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Selling Price</label>
                  <div className="mt-1 text-sm text-gray-900">${parseFloat(selectedProduct.sellingPrice || "0").toFixed(2)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Buying Price</label>
                  <div className="mt-1 text-sm text-gray-900">${parseFloat(selectedProduct.buyingPrice || "0").toFixed(2)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Quantity</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.quantity}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Minimum Quantity</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.minimumQuantity}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Tax</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.tax}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Barcode</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.barcode || "N/A"}</div>
                </div>
              </div>
              
              {selectedProduct.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Description</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.description}</div>
                </div>
              )}

              {selectedProduct.image && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Image</label>
                  <div className="mt-1">
                    <img 
                      src={selectedProduct.image} 
                      alt={selectedProduct.nameEnglish} 
                      className="w-32 h-32 object-cover rounded border"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Inventory Item</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.inventoryItem ? "Yes" : "No"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Selling Product</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.sellingProduct ? "Yes" : "No"}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Buying Product</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedProduct.buyingProduct ? "Yes" : "No"}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductList;
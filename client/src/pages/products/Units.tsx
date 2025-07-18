import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertUnitSchema } from "@shared/schema";

const unitFormSchema = insertUnitSchema.pick({
  name: true,
  symbol: true,
  type: true,
  description: true,
});

type UnitFormData = z.infer<typeof unitFormSchema>;

interface Unit {
  id: string;
  name: string;
  symbol: string;
  type: string;
  description?: string;
  productCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Units() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: "",
      symbol: "",
      type: "Unit",
      description: "",
    },
  });

  // Fetch units
  const { data: units = [], isLoading } = useQuery({
    queryKey: ["/api/units"],
  });

  // Create unit mutation
  const createUnitMutation = useMutation({
    mutationFn: async (data: UnitFormData) => {
      const response = await apiRequest("POST", "/api/units", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setIsCreateDialogOpen(false);
      reset();
      toast({
        title: "Success",
        description: "Unit created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create unit",
        variant: "destructive",
      });
    },
  });

  // Update unit mutation
  const updateUnitMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UnitFormData }) => {
      const response = await apiRequest("PATCH", `/api/units/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setEditingUnit(null);
      reset();
      toast({
        title: "Success",
        description: "Unit updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update unit",
        variant: "destructive",
      });
    },
  });

  // Delete unit mutation
  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/units/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({
        title: "Success",
        description: "Unit deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete unit",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UnitFormData) => {
    if (editingUnit) {
      updateUnitMutation.mutate({ id: editingUnit.id, data });
    } else {
      createUnitMutation.mutate(data);
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setValue("name", unit.name);
    setValue("symbol", unit.symbol);
    setValue("type", unit.type);
    setValue("description", unit.description || "");
  };

  const handleDelete = (id: string) => {
    deleteUnitMutation.mutate(id);
  };

  const handleCreateNew = () => {
    setEditingUnit(null);
    reset();
    setIsCreateDialogOpen(true);
  };

  // Filter units based on search term
  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const paginatedUnits = filteredUnits.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredUnits.length / entriesPerPage);

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "weight":
        return "bg-blue-100 text-blue-800";
      case "time":
        return "bg-green-100 text-green-800";
      case "unit":
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Units</h1>
            <p className="text-sm text-gray-600">
              Product / <span className="text-blue-600">Units</span>
            </p>
          </div>
        </div>
        <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Add Unit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label htmlFor="entries">Show</Label>
              <Select value={entriesPerPage.toString()} onValueChange={(value) => setEntriesPerPage(Number(value))}>
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
              <Label>entries</Label>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Products Count</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUnits.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.symbol}</TableCell>
                  <TableCell>{unit.productCount}</TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(unit.type)}>
                      {unit.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(unit)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the unit "{unit.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(unit.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {paginatedUnits.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No units found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUnits.length)} of {filteredUnits.length} entries
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Unit Dialog */}
      <Dialog open={isCreateDialogOpen || editingUnit !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingUnit(null);
          reset();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit" : "Create New Unit"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter unit name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                {...register("symbol")}
                placeholder="Enter unit symbol"
              />
              {errors.symbol && (
                <p className="text-sm text-red-500">{errors.symbol.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select value={watch("type")} onValueChange={(value) => setValue("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unit">Unit</SelectItem>
                  <SelectItem value="Weight">Weight</SelectItem>
                  <SelectItem value="Time">Time</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-500">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter unit description (optional)"
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingUnit(null);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
              >
                {createUnitMutation.isPending || updateUnitMutation.isPending ? "Saving..." : editingUnit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Value of Money - All rights reserved © 2025 VoM
        </p>
      </div>
    </div>
  );
}
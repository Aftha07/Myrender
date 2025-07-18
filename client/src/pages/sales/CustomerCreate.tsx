import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { insertCustomerSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sidebar } from "@/components/Sidebar";

// Simple form schema for the customer creation form
const customerFormSchema = z.object({
  code: z.string().min(1, "Customer code is required"),
  customerName: z.string().min(1, "Customer name is required"),
  account: z.string().min(1, "Account is required"),
  createAssociatedAccount: z.boolean().default(false),
  phone: z.string().optional(),
  email: z.string().optional(),
  vatRegistrationNumber: z.string().optional(),
  openingBalance: z.string().default("0.00"),
  streetName: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerCreateProps {
  onLogout: () => void;
}

export function CustomerCreate({ onLogout }: CustomerCreateProps) {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch next customer code
  const { data: nextCodeData } = useQuery({
    queryKey: ['/api/customers/next-code'],
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "22",
      customerName: "",
      account: "Accounts Receivables",
      createAssociatedAccount: false,
      phone: "",
      email: "",
      vatRegistrationNumber: "",
      openingBalance: "0.00",
      streetName: "",
      city: "",
      country: "",
      postalCode: "",
    },
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const { createAssociatedAccount, ...formData } = data;
      
      // Transform data to match backend schema
      const customerData = {
        ...formData,
        openingBalance: formData.openingBalance || "0.00", // Keep as string
        email: formData.email || null,
        phone: formData.phone || null,
        vatRegistrationNumber: formData.vatRegistrationNumber || null,
        streetName: formData.streetName || null,
        city: formData.city || null,
        country: formData.country || null,
        postalCode: formData.postalCode || null,
      };
      
      return await apiRequest('POST', '/api/customers', customerData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setLocation('/sales/customers');
    },
    onError: (error) => {
      console.error('Error creating customer:', error);
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    console.log('Form submission data:', data);
    createCustomerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation('/sales/customers')}
                className="border rounded-md p-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <p className="text-sm text-gray-600">
                  {t('Sales')} / {t('Customers')} / {t('Create')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                type="submit"
                form="customer-form"
                variant="outline"
                size="sm"
                className="border-2 border-teal-600 text-teal-600"
                disabled={createCustomerMutation.isPending}
              >
                <Save className="w-4 h-4" />
                {createCustomerMutation.isPending ? ' Saving...' : ''}
              </Button>
              <div className="text-right">
                <div className="text-3xl font-bold text-teal-600">VoM</div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form id="customer-form" onSubmit={handleSubmit(onSubmit)} className="max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Code */}
                <div>
                  <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                    {t('Code')} *
                  </Label>
                  <Input
                    id="code"
                    {...register("code")}
                    className="mt-1"
                    defaultValue="22"
                  />
                  {errors.code && (
                    <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
                  )}
                </div>

                {/* Customer Name */}
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700">
                    {t('Customer Name')} *
                  </Label>
                  <Input
                    id="customerName"
                    {...register("customerName")}
                    className="mt-1"
                    placeholder=""
                  />
                  {errors.customerName && (
                    <p className="text-sm text-red-600 mt-1">{errors.customerName.message}</p>
                  )}
                </div>

                {/* Account */}
                <div>
                  <Label htmlFor="account" className="text-sm font-medium text-gray-700">
                    {t('Account')}
                  </Label>
                  <Select defaultValue="Accounts Receivables">
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t('Select account')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Accounts Receivables">{t('Accounts Receivables')}</SelectItem>
                      <SelectItem value="Cash">{t('Cash')}</SelectItem>
                      <SelectItem value="Bank">{t('Bank')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Create associated account checkbox */}
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox 
                      id="createAssociatedAccount"
                      {...register("createAssociatedAccount")}
                    />
                    <Label 
                      htmlFor="createAssociatedAccount" 
                      className="text-sm text-gray-600"
                    >
                      {t('Create associated account in Chart of Accounts')}
                    </Label>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    {t('Phone')}
                  </Label>
                  <Input
                    id="phone"
                    {...register("phone")}
                    className="mt-1"
                    placeholder="+966"
                  />
                </div>

                {/* Email */}
                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    {t('Email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="mt-1"
                    placeholder=""
                  />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* VAT Registration Number */}
                <div>
                  <Label htmlFor="vatRegistrationNumber" className="text-sm font-medium text-gray-700">
                    {t('VAT Registration Number')}
                  </Label>
                  <Input
                    id="vatRegistrationNumber"
                    {...register("vatRegistrationNumber")}
                    className="mt-1"
                    placeholder=""
                  />
                </div>

                {/* Opening Balance */}
                <div>
                  <Label htmlFor="openingBalance" className="text-sm font-medium text-gray-700">
                    {t('Opening Balance')}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="openingBalance"
                      type="text"
                      {...register("openingBalance")}
                      className="pr-8"
                      defaultValue="0.00"
                      placeholder="0.00"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                      ر.س
                    </span>
                  </div>
                </div>

                {/* Add Your Custom Fields */}
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full text-teal-600 border-teal-200 hover:bg-teal-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('Add Your Custom Fields')}
                </Button>
              </div>

              {/* Right Column - Billing Address */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {t('Billing Address')}
                  </h3>
                  
                  {/* Street Name */}
                  <div className="mb-4">
                    <Label htmlFor="streetName" className="text-sm font-medium text-gray-700">
                      {t('Street Name')}
                    </Label>
                    <Input
                      id="streetName"
                      {...register("streetName")}
                      className="mt-1"
                      placeholder=""
                    />
                  </div>

                  {/* City */}
                  <div className="mb-4">
                    <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                      {t('City')}
                    </Label>
                    <Input
                      id="city"
                      {...register("city")}
                      className="mt-1"
                      placeholder=""
                    />
                  </div>

                  {/* Country */}
                  <div className="mb-4">
                    <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                      {t('Country')}
                    </Label>
                    <Input
                      id="country"
                      {...register("country")}
                      className="mt-1"
                      placeholder=""
                    />
                  </div>

                  {/* Postal Code */}
                  <div className="mb-4">
                    <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                      {t('Postal Code')}
                    </Label>
                    <Input
                      id="postalCode"
                      {...register("postalCode")}
                      className="mt-1"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CustomerCreate;
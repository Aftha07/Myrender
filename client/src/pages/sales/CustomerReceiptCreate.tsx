import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const customerReceiptSchema = z.object({
  referenceId: z.string().min(1, "Reference ID is required"),
  description: z.string().optional(),
  customer: z.string().min(1, "Customer is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  costCenter: z.string().min(1, "Cost center is required"),
  paymentAccount: z.string().min(1, "Payment account is required"),
  paymentAmount: z.string().min(1, "Payment amount is required"),
  kind: z.string().min(1, "Kind is required"),
});

type CustomerReceiptFormData = z.infer<typeof customerReceiptSchema>;

export default function CustomerReceiptCreate() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerReceiptFormData>({
    resolver: zodResolver(customerReceiptSchema),
    defaultValues: {
      referenceId: "SRC0005",
      paymentDate: "22-06-2025",
      costCenter: "Main Center",
      paymentAccount: "Cash",
      paymentAmount: "41771.69",
      kind: "Received",
    },
  });

  const onSubmit = async (data: CustomerReceiptFormData) => {
    setIsLoading(true);
    try {
      console.log("Customer Receipt data:", data);
      // TODO: Implement customer receipt creation API call
    } catch (error) {
      console.error("Error creating customer receipt:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/sales/customer-receipts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>{t('Sales')} / {t('Customer Receipts')} / {t('Create')}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Save className="w-4 h-4 mr-2" />
              {t('Save')}
            </Button>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Thu, 6:41 AM</span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-teal-600">VoM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Receipt Details */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6 space-y-6">
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  {/* Reference ID */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="referenceId">
                        {t('Reference ID')} <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="referenceId"
                        {...form.register("referenceId")}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="description">{t('Description')} ({t('optional')})</Label>
                    <Textarea
                      id="description"
                      {...form.register("description")}
                      className="mt-1"
                      rows={3}
                    />
                  </div>

                  {/* Customer */}
                  <div>
                    <Label htmlFor="customer">
                      {t('Customer')} <span className="text-red-500">*</span>
                    </Label>
                    <Select value={form.watch("customer")} onValueChange={(value) => form.setValue("customer", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t('Please select customer')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer1">Customer 1</SelectItem>
                        <SelectItem value="customer2">Customer 2</SelectItem>
                        <SelectItem value="customer3">Customer 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Date */}
                  <div>
                    <Label htmlFor="paymentDate">{t('Payment Date')}</Label>
                    <div className="relative mt-1">
                      <Input
                        id="paymentDate"
                        {...form.register("paymentDate")}
                        className="pr-10"
                      />
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Cost Center */}
                  <div>
                    <Label htmlFor="costCenter">{t('Cost Center')}</Label>
                    <Select value={form.watch("costCenter")} onValueChange={(value) => form.setValue("costCenter", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Main Center">Main Center</SelectItem>
                        <SelectItem value="Branch 1">Branch 1</SelectItem>
                        <SelectItem value="Branch 2">Branch 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Account */}
                  <div>
                    <Label htmlFor="paymentAccount">{t('Payment Account')}</Label>
                    <Select value={form.watch("paymentAccount")} onValueChange={(value) => form.setValue("paymentAccount", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Account">Bank Account</SelectItem>
                        <SelectItem value="Credit Card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Payment Amount */}
                  <div>
                    <Label htmlFor="paymentAmount">{t('Payment Amount')}</Label>
                    <Input
                      id="paymentAmount"
                      {...form.register("paymentAmount")}
                      className="mt-1"
                    />
                  </div>

                  {/* Kind */}
                  <div>
                    <Label htmlFor="kind">{t('Kind')}</Label>
                    <Select value={form.watch("kind")} onValueChange={(value) => form.setValue("kind", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Customer Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('Customer Details')}:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">{t('Phone')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">-</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Email')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">-</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('Outstanding Balance')}:</Label>
                  <p className="text-sm text-gray-600 mt-1">-</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {t('Value of Money')} - {t('All rights reserved © 2025 VoM')}
          </p>
        </div>
      </div>
    </div>
  );
}
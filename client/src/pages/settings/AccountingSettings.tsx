import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AccountingSettingsProps {
  onLogout: () => void;
}

export function AccountingSettings({ onLogout }: AccountingSettingsProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    yearStartMonth: "January",
    yearStartDay: "1",
    defaultTaxRate: "Vat 15%",
    booksClosing: false,
    inventorySystem: "Periodic",
    closingDate: "2025-06-30",
    enableRetention: false
  });

  // Fetch settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/settings/accounting'],
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/settings/accounting', data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Accounting settings saved successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save accounting settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">Settings</span>
            <span className="text-gray-400">/</span>
            <span className="text-teal-600 font-medium">Accounting Settings</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-md"
            >
              {saveSettingsMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <img src="/api/placeholder/120/40" alt="VoM Logo" className="h-8" />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Year Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Start Date
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Month</label>
                      <select
                        value={formData.yearStartMonth}
                        onChange={(e) => handleInputChange('yearStartMonth', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Day</label>
                      <select
                        value={formData.yearStartDay}
                        onChange={(e) => handleInputChange('yearStartDay', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {[...Array(31)].map((_, i) => (
                          <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Default Tax Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Tax Rate
                  </label>
                  <select
                    value={formData.defaultTaxRate}
                    onChange={(e) => handleInputChange('defaultTaxRate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Vat 15%">Vat 15%</option>
                    <option value="Vat 5%">Vat 5%</option>
                    <option value="Vat 0%">Vat 0%</option>
                  </select>
                </div>

                {/* Books Closing */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Books Closing <span className="text-blue-500 text-sm">ⓘ</span>
                  </label>
                  <div className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={formData.booksClosing}
                      onChange={(e) => handleInputChange('booksClosing', e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Inventory System */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inventory System <span className="text-blue-500 text-sm">ⓘ</span>
                  </label>
                  <select
                    value={formData.inventorySystem}
                    onChange={(e) => handleInputChange('inventorySystem', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Periodic">Periodic</option>
                    <option value="Perpetual">Perpetual</option>
                  </select>
                </div>

                {/* Closing Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Closing Date
                  </label>
                  <input
                    type="date"
                    value={formData.closingDate}
                    onChange={(e) => handleInputChange('closingDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Enable Retention */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enable Retention?
                  </label>
                  <div className="flex items-center">
                    <input 
                      type="checkbox"
                      checked={formData.enableRetention}
                      onChange={(e) => handleInputChange('enableRetention', e.target.checked)}
                      className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AccountingSettings;
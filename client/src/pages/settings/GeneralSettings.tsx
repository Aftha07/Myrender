import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft, Upload, Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface GeneralSettingsProps {
  onLogout: () => void;
}

export function GeneralSettings({ onLogout }: GeneralSettingsProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    companyNameArabic: "مؤسسة السيارة الثانية للمقاولات العامة",
    companyNameEnglish: "Second Support for General Cont. Est",
    vatName: "",
    vatNumber: "310183597800003",
    address: "P.O. Box 2017 - Al-Jubayl 31951 King Khalid IBn Abdulaziz St, Kingdom of Saudi Arabia",
    mobile: "530155514",
    country: "Saudi Arabia",
    language: "English",
    commercialNumber: "2055115472"
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [hasLogo, setHasLogo] = useState(true);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/settings/general', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to save settings');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "General settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setHasLogo(true);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setHasLogo(false);
    
    // Clear the file input
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="p-2 hover:bg-gray-100 rounded-md">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <nav className="text-sm text-gray-500">
                  Settings / General Settings
                </nav>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveSettingsMutation.isPending ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-6">
                {/* Logo Section */}
                <div className="mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative">
                      {hasLogo && !logoPreview ? (
                        <div className="w-32 h-20 bg-gradient-to-br from-blue-400 via-blue-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                          <span className="text-white font-bold text-lg">Second Support</span>
                        </div>
                      ) : logoPreview ? (
                        <div className="w-32 h-20 rounded-lg overflow-hidden shadow-lg">
                          <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-32 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <span className="text-gray-400 text-sm">No Logo</span>
                        </div>
                      )}
                      {(hasLogo || logoPreview) && (
                        <button 
                          onClick={handleDeleteLogo}
                          className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <span className="text-white text-xs font-bold">×</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Logo
                    </label>
                    <div className="flex items-center justify-center space-x-0">
                      <input 
                        type="file" 
                        id="logo-upload"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label 
                        htmlFor="logo-upload"
                        className="flex items-center justify-center px-6 py-2 bg-white border border-gray-300 text-teal-500 rounded-l cursor-pointer hover:bg-gray-50 transition-colors"
                        style={{ minWidth: '120px' }}
                      >
                        <span className="text-sm">Choose file</span>
                      </label>
                      <button 
                        onClick={() => document.getElementById('logo-upload')?.click()}
                        className="px-6 py-2 bg-teal-500 text-white rounded-r hover:bg-teal-600 transition-colors"
                        style={{ minWidth: '80px' }}
                      >
                        <span className="text-sm">Browse</span>
                      </button>
                    </div>
                    {logoFile && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: {logoFile.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name in Arabic *
                    </label>
                    <input 
                      type="text" 
                      value={formData.companyNameArabic}
                      onChange={(e) => handleInputChange('companyNameArabic', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name in English *
                    </label>
                    <input 
                      type="text" 
                      value={formData.companyNameEnglish}
                      onChange={(e) => handleInputChange('companyNameEnglish', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Name
                    </label>
                    <input 
                      type="text" 
                      value={formData.vatName}
                      onChange={(e) => handleInputChange('vatName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Taxable?
                    </label>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        defaultChecked
                        className="mr-2 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Enable VAT</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vat Registration Number *
                    </label>
                    <input 
                      type="text" 
                      value={formData.vatNumber}
                      onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea 
                      rows={3}
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile
                    </label>
                    <div className="flex">
                      <select className="px-3 py-2 border border-gray-300 border-r-0 rounded-l-md focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gray-50">
                        <option value="+966">Saudi Arabia (+966)</option>
                      </select>
                      <input 
                        type="text" 
                        value={formData.mobile}
                        onChange={(e) => handleInputChange('mobile', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <select 
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="Saudi Arabia">🇸🇦 Saudi Arabia (المملكة العربية السعودية)</option>
                      <option value="UAE">🇦🇪 United Arab Emirates</option>
                      <option value="Kuwait">🇰🇼 Kuwait</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred language
                    </label>
                    <select 
                      value={formData.language}
                      onChange={(e) => handleInputChange('language', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="English">English</option>
                      <option value="Arabic">العربية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commercial number
                    </label>
                    <input 
                      type="text" 
                      value={formData.commercialNumber}
                      onChange={(e) => handleInputChange('commercialNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>


                </div>


              </div>
            </div>
          </div>
        </main>
    </div>
  );
}

export default GeneralSettings;
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft } from "lucide-react";

interface FinancialYearsProps {
  onLogout: () => void;
}

export function FinancialYears({ onLogout }: FinancialYearsProps) {
  const { t } = useLanguage();

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
                Settings / Financial Years
              </nav>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <img src="/api/placeholder/120/40" alt="VoM Logo" className="h-8" />
          </div>
        </div>
      </div>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900">{t('Financial Years')}</h1>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Manage your financial year periods</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Financial Year
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="2025">2025 (Jan 1, 2025 - Dec 31, 2025)</option>
                      <option value="2024">2024 (Jan 1, 2024 - Dec 31, 2024)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Financial Year Start Month
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="1">January</option>
                      <option value="4">April</option>
                      <option value="7">July</option>
                      <option value="10">October</option>
                    </select>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Previous Years</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <span>2024 (Jan 1, 2024 - Dec 31, 2024)</span>
                        <span className="text-green-600 text-sm">Closed</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <span>2023 (Jan 1, 2023 - Dec 31, 2023)</span>
                        <span className="text-green-600 text-sm">Closed</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600 transition-colors mr-3">
                      Save Settings
                    </button>
                    <button className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors">
                      Create New Year
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
    </div>
  );
}

export default FinancialYears;
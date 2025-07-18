import { useLanguage } from "@/contexts/LanguageContext";
import { Sidebar } from "@/components/Sidebar";

interface TaxesProps {
  onLogout: () => void;
}

export function Taxes({ onLogout }: TaxesProps) {
  const { t } = useLanguage();

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onLogout={onLogout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900">{t('Taxes')}</h1>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Configure tax settings and ZATCA compliance</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default VAT Rate
                    </label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="15.00"
                      defaultValue="15.00"
                    />
                    <span className="text-sm text-gray-500">Percentage (%)</span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      VAT Registration Number
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter VAT registration number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZATCA Integration
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span>Enable ZATCA compliance</span>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" className="mr-2" />
                        <span>Auto-submit to ZATCA</span>
                      </div>
                      <div className="flex items-center">
                        <input type="checkbox" className="mr-2" defaultChecked />
                        <span>Generate QR codes on invoices</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Tax Categories</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <span>Standard Rate (15%)</span>
                        <span className="text-green-600 text-sm">Active</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <span>Zero Rate (0%)</span>
                        <span className="text-green-600 text-sm">Active</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                        <span>Exempt</span>
                        <span className="text-green-600 text-sm">Active</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4">
                    <button className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600 transition-colors mr-3">
                      Save Settings
                    </button>
                    <button className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors">
                      Test ZATCA Connection
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Taxes;
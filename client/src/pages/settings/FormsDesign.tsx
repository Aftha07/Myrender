import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft } from "lucide-react";

interface FormsDesignProps {
  onLogout: () => void;
}

export function FormsDesign({ onLogout }: FormsDesignProps) {
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
                Settings / Forms Design
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
                <h1 className="text-2xl font-semibold text-gray-900">{t('Forms Design')}</h1>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-4">Customize the design and layout of your forms</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Template
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="modern">Modern Template</option>
                      <option value="classic">Classic Template</option>
                      <option value="minimal">Minimal Template</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Logo Position
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <option value="top-left">Top Left</option>
                      <option value="top-center">Top Center</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color Scheme
                    </label>
                    <div className="flex space-x-4">
                      <div className="flex items-center">
                        <input type="radio" name="color" value="teal" className="mr-2" defaultChecked />
                        <div className="w-6 h-6 bg-teal-500 rounded mr-2"></div>
                        <span>Teal</span>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="color" value="blue" className="mr-2" />
                        <div className="w-6 h-6 bg-blue-500 rounded mr-2"></div>
                        <span>Blue</span>
                      </div>
                      <div className="flex items-center">
                        <input type="radio" name="color" value="gray" className="mr-2" />
                        <div className="w-6 h-6 bg-gray-500 rounded mr-2"></div>
                        <span>Gray</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Logo Upload
                    </label>
                    <input 
                      type="file" 
                      accept="image/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="pt-4">
                    <button className="bg-teal-500 text-white px-6 py-2 rounded-md hover:bg-teal-600 transition-colors mr-3">
                      Save Settings
                    </button>
                    <button className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors">
                      Preview
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

export default FormsDesign;
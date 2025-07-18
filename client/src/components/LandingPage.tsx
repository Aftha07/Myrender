import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, 
  Calculator, 
  FileText, 
  Shield, 
  TrendingUp, 
  Users,
  CheckCircle,
  ArrowRight,
  Globe,
  Zap,
  BarChart3
} from "lucide-react";

export function LandingPage() {
  const { t, language } = useLanguage();

  const features = [
    {
      icon: <Calculator className="w-8 h-8 text-teal-600" />,
      title: "Advanced Financial Management",
      description: "Comprehensive accounting solutions with real-time financial reporting and automated calculations"
    },
    {
      icon: <Shield className="w-8 h-8 text-teal-600" />,
      title: "ZATCA Compliance",
      description: "Full compliance with Saudi Arabian tax authority requirements including e-invoicing and QR codes"
    },
    {
      icon: <Globe className="w-8 h-8 text-teal-600" />,
      title: "Bilingual Support",
      description: "Native English and Arabic support with RTL layout for seamless Middle East operations"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-teal-600" />,
      title: "Business Intelligence",
      description: "Advanced analytics and reporting to drive informed business decisions"
    },
    {
      icon: <Users className="w-8 h-8 text-teal-600" />,
      title: "Multi-User Access",
      description: "Role-based access control for teams with secure authentication and permissions"
    },
    {
      icon: <Zap className="w-8 h-8 text-teal-600" />,
      title: "Enterprise Performance",
      description: "Built for scale with high-performance architecture and enterprise-grade security"
    }
  ];

  const benefits = [
    "Reduce accounting processing time by 80%",
    "Ensure 100% ZATCA compliance",
    "Real-time financial visibility",
    "Automated invoice generation",
    "Multi-currency support",
    "Advanced expense tracking",
    "Custom financial reports",
    "Secure cloud infrastructure"
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-white ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Building2 className="w-8 h-8 text-teal-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">VoM Accounting</h1>
                <p className="text-sm text-gray-600">Enterprise Financial Solutions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSwitcher variant="login" />
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg font-medium"
              >
                {t('Sign In')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Enterprise Accounting Platform
            <span className="block text-teal-600">Built for Saudi Arabian Businesses</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Streamline your financial operations with our comprehensive, ZATCA-compliant accounting solution. 
            Designed for enterprises that demand reliability, security, and performance.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 text-lg rounded-lg font-semibold flex items-center space-x-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button 
              variant="outline"
              className="border-teal-600 text-teal-600 hover:bg-teal-50 px-8 py-4 text-lg rounded-lg font-semibold"
            >
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything your business needs to manage finances efficiently and comply with regulations
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="bg-white hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardContent className="p-8">
                  <div className="mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Trusted by Leading Enterprises
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Join hundreds of businesses that have transformed their financial operations with our platform.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <BarChart3 className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <Users className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">1000+</div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <Shield className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">100%</div>
                  <div className="text-sm text-gray-600">ZATCA Compliant</div>
                </div>
                <div className="bg-white rounded-lg p-6 text-center shadow-sm">
                  <TrendingUp className="w-8 h-8 text-teal-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">80%</div>
                  <div className="text-sm text-gray-600">Time Saved</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-teal-600">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Financial Operations?
          </h2>
          <p className="text-xl text-teal-100 mb-8 max-w-2xl mx-auto">
            Join the growing number of enterprises that trust VoM Accounting for their financial management needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="bg-white text-teal-600 hover:bg-gray-50 px-8 py-4 text-lg rounded-lg font-semibold"
            >
              Start Free Trial
            </Button>
            <Button 
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-teal-600 px-8 py-4 text-lg rounded-lg font-semibold"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building2 className="w-6 h-6 text-teal-400" />
                <span className="text-lg font-semibold">VoM Accounting</span>
              </div>
              <p className="text-gray-400">
                Enterprise financial solutions for the modern business.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Features</li>
                <li>Pricing</li>
                <li>Security</li>
                <li>Integrations</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Documentation</li>
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Status</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li>About</li>
                <li>Careers</li>
                <li>Privacy</li>
                <li>Terms</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 VoM Accounting. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
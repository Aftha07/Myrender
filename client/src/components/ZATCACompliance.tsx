import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function ZATCACompliance() {
  const { t } = useLanguage();

  const complianceStats = [
    {
      title: t('E-Invoice Status'),
      value: "98.5%",
      subtitle: t('Compliance Rate'),
      status: "active",
    },
    {
      title: t('QR Code Generation'),
      value: "1,247",
      subtitle: t('QR Codes Generated'),
      status: "active",
    },
    {
      title: t('VAT Compliance'),
      value: "15%",
      subtitle: t('Current VAT Rate'),
      status: "warning",
    },
  ];

  const features = [
    {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      title: t('Electronic Invoice Generation'),
      description: t('XML format compliant with ZATCA standards'),
      status: "completed",
    },
    {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      title: t('QR Code Integration'),
      description: t('Automatic QR code generation for invoices'),
      status: "completed",
    },
    {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      title: t('VAT Calculation'),
      description: t('Automated 15% VAT calculation and reporting'),
      status: "completed",
    },
    {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      title: t('Digital Signatures'),
      description: t('Cryptographic signing for invoice authenticity'),
      status: "completed",
    },
    {
      icon: Clock,
      iconColor: "text-amber-600",
      iconBg: "bg-amber-100",
      title: t('Real-time Validation'),
      description: t('Coming soon - Direct ZATCA API integration'),
      status: "pending",
    },
    {
      icon: CheckCircle,
      iconColor: "text-green-600",
      iconBg: "bg-green-100",
      title: t('Audit Trail'),
      description: t('Complete transaction history for compliance'),
      status: "completed",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">{t('ZATCA Compliance')}</h2>
        <p className="text-gray-600 mt-2">
          {t('Saudi Arabian tax authority compliance and e-invoicing')}
        </p>
      </div>

      {/* Compliance Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {complianceStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{stat.title}</h3>
                <div className={`w-3 h-3 rounded-full ${
                  stat.status === 'active' ? 'bg-green-500' : 'bg-amber-500'
                }`}></div>
              </div>
              <p className={`text-3xl font-bold ${
                stat.status === 'active' ? 'text-green-600' : 'text-amber-600'
              }`}>
                {stat.value}
              </p>
              <p className="text-sm text-gray-600 mt-2">{stat.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ZATCA Features */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">{t('ZATCA Features')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`w-8 h-8 ${feature.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{feature.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

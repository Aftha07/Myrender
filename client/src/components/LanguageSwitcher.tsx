import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface LanguageSwitcherProps {
  variant?: 'login' | 'dashboard';
}

export function LanguageSwitcher({ variant = 'login' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  if (variant === 'login') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-1 flex">
        <Button
          variant={language === 'en' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('en')}
          className="px-4 py-2 text-sm font-medium transition-all"
        >
          English
        </Button>
        <Button
          variant={language === 'ar' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLanguage('ar')}
          className="px-4 py-2 text-sm font-medium transition-all"
        >
          العربية
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 rounded-lg p-1 flex">
      <Button
        variant={language === 'en' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('en')}
        className="px-3 py-1 text-sm font-medium transition-all"
      >
        EN
      </Button>
      <Button
        variant={language === 'ar' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => setLanguage('ar')}
        className="px-3 py-1 text-sm font-medium transition-all"
      >
        AR
      </Button>
    </div>
  );
}

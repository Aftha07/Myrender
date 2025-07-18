import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ChartLine, Shield } from "lucide-react";
import { companyLoginSchema, type CompanyLoginData } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CompanyLoginData>({
    resolver: zodResolver(companyLoginSchema),
    defaultValues: {
      email: "",
      password: "",
      recaptchaToken: "dummy-token", // For demo purposes
    },
  });

  const onSubmit = async (data: CompanyLoginData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/auth/company/login", data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/company/user"] });
      toast({
        title: "Success",
        description: "Login successful",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Switcher */}
        <div className="flex justify-center mb-6">
          <LanguageSwitcher variant="login" />
        </div>

        {/* Login Card */}
        <Card className="shadow-lg fade-in">
          <CardContent className="pt-6">
            {/* Logo and Title */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <ChartLine className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('VoM Accounting Platform')}
              </h1>
              <p className="text-gray-600 mt-2">
                {t('Sign in to your account')}
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Email Address')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="demo@company.com"
                  {...register("email")}
                  className="w-full"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('Password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="password123"
                    {...register("password")}
                    className="w-full pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                )}
              </div>

              {/* reCAPTCHA Placeholder */}
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 flex items-center justify-center">
                <div className="flex items-center space-x-3">
                  <Checkbox
                    id="recaptcha"
                    checked={!!watch("recaptchaToken")}
                    onCheckedChange={(checked) => {
                      setValue("recaptchaToken", checked ? "dummy-token" : "");
                    }}
                  />
                  <Label htmlFor="recaptcha" className="text-sm text-gray-700">
                    {t("I'm not a robot")}
                  </Label>
                  <Shield className="h-4 w-4 text-gray-400" />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Signing in..." : t('Sign In')}
              </Button>

              <div className="text-center">
                <a href="#" className="text-sm text-primary hover:underline">
                  {t('Forgot your password?')}
                </a>
              </div>
            </form>

            {/* Test Credentials Info */}
            <Alert className="mt-8 bg-amber-50 border-amber-200">
              <AlertDescription>
                <h3 className="text-sm font-medium text-amber-800 mb-2">
                  {t('Test Credentials')}
                </h3>
                <div className="text-xs text-amber-700 space-y-1">
                  <div><strong>Email:</strong> demo@company.com</div>
                  <div><strong>{t('Password')}:</strong> password123</div>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

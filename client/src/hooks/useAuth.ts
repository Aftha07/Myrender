import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check for company user authentication first
  const { data: companyUser, isLoading: isCompanyLoading, error: companyError } = useQuery({
    queryKey: ["/api/auth/company/user"],
    retry: false,
  });

  // Check for Replit user authentication 
  const { data: replitUser, isLoading: isReplitLoading, error: replitError } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Determine which user to use (company user takes precedence)
  const user = companyUser || replitUser;
  const isLoading = isCompanyLoading || isReplitLoading;

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

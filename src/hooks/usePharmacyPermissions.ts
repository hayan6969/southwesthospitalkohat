import { useAuth } from "./useAuth";

export function usePharmacyPermissions() {
  const { profile } = useAuth();
  
  const role = profile?.role;
  
  const isAdmin = role === 'admin';
  const isHeadPharmacist = role === 'head_pharmacist';
  const isAssistantPharmacist = role === 'assistant_pharmacist';
  const isSalesmanPharmacist = role === 'salesman_pharmacist';
  const isPharmacyUser = isHeadPharmacist || isAssistantPharmacist || isSalesmanPharmacist;
  
  // Admin and Head pharmacist have all permissions
  const canManageMedicines = isAdmin || isHeadPharmacist;
  const canEditStock = isAdmin || isHeadPharmacist;
  const canViewMedicines = isAdmin || isPharmacyUser;
  const canSellMedicine = isAdmin || isPharmacyUser;
  const canManageReturns = isAdmin || isHeadPharmacist || isAssistantPharmacist;
  const canViewStock = isAdmin || isPharmacyUser;
  const canViewAnalytics = isAdmin || isPharmacyUser;
  const canViewExpiry = isAdmin || isPharmacyUser;
  const canViewLabReports = isAdmin || isHeadPharmacist || isAssistantPharmacist;
  
  return {
    role,
    isAdmin,
    isHeadPharmacist,
    isAssistantPharmacist,
    isSalesmanPharmacist,
    isPharmacyUser,
    canManageMedicines,
    canEditStock,
    canViewMedicines,
    canSellMedicine,
    canManageReturns,
    canViewStock,
    canViewAnalytics,
    canViewExpiry,
    canViewLabReports,
  };
}
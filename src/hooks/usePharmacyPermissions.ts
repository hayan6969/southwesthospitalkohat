import { useAuth } from "./useAuth";

export function usePharmacyPermissions() {
  const { profile } = useAuth();
  
  const role = profile?.role;
  
  const isHeadPharmacist = role === 'head_pharmacist';
  const isAssistantPharmacist = role === 'assistant_pharmacist';
  const isSalesmanPharmacist = role === 'salesman_pharmacist';
  const isPharmacyUser = isHeadPharmacist || isAssistantPharmacist || isSalesmanPharmacist;
  
  // Head pharmacist has all permissions
  const canManageMedicines = isHeadPharmacist;
  const canEditStock = isHeadPharmacist;
  const canViewMedicines = isPharmacyUser;
  const canSellMedicine = isPharmacyUser;
  const canManageReturns = isHeadPharmacist || isAssistantPharmacist;
  const canViewStock = isPharmacyUser;
  const canViewAnalytics = isPharmacyUser;
  const canViewExpiry = isPharmacyUser;
  
  return {
    role,
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
  };
}
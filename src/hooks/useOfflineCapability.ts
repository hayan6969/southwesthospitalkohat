import { useAuth } from '@/hooks/useAuth';

// Define which features are available offline for specific roles
export const useOfflineCapability = () => {
  const { profile } = useAuth();

  const canUseOffline = (feature: string): boolean => {
    if (!profile) return false;

    // Only allow specific features offline for staff roles
    const offlineCapabilities: Record<string, string[]> = {
      'staff': ['lab_orders', 'ot_operations', 'patient_registration', 'invoices'],
      'admin': ['lab_orders', 'ot_operations', 'patient_registration', 'invoices'],
      'doctor': [], // Doctors cannot use offline features
      'pharmacy': [], // Pharmacy cannot use offline features
      'patient': [], // Patients cannot use offline features
      'finance': [] // Finance cannot use offline features
    };

    const allowedFeatures = offlineCapabilities[profile.role] || [];
    return allowedFeatures.includes(feature);
  };

  const getOfflineMessage = (feature: string): string => {
    if (!profile) return 'Please log in to use this feature.';

    if (!canUseOffline(feature)) {
      return `Offline access for ${feature} is only available for OT Staff and Lab Staff.`;
    }

    return '';
  };

  return {
    canUseOffline,
    getOfflineMessage,
    isOfflineCapable: (feature: string) => canUseOffline(feature)
  };
};
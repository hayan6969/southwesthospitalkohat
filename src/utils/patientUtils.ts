// Utility functions for patient data handling

// Extract phone number from system-generated email
export const extractPhoneFromEmail = (email: string): string | null => {
  // Pattern: patient{phone}@hims.app
  const match = email.match(/patient(\d+)@hims\.app/);
  return match ? match[1] : null;
};

// Get the best available contact number for a patient
export const getPatientContactNumber = (
  patientData: any,
  profileData: any
): string => {
  // Priority: emergency_contact_phone > extracted phone from email > phone from profile
  if (patientData?.emergency_contact_phone) {
    return patientData.emergency_contact_phone;
  }
  
  if (profileData?.email) {
    const extractedPhone = extractPhoneFromEmail(profileData.email);
    if (extractedPhone) {
      return extractedPhone;
    }
  }
  
  if (profileData?.phone) {
    return profileData.phone;
  }
  
  return 'Not provided';
};

// Format patient info for display
export const formatPatientInfo = (patientData: any, profileData: any) => {
  const contactNumber = getPatientContactNumber(patientData, profileData);
  
  return {
    fullName: `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim(),
    email: profileData?.email || 'Not provided',
    phone: contactNumber,
    dateOfBirth: patientData?.date_of_birth || 'Not provided',
    bloodType: patientData?.blood_type || 'Not provided',
    allergies: patientData?.allergies || 'None reported',
    address: patientData?.address || 'Not provided',
    emergencyContact: patientData?.emergency_contact_name || 'Not provided',
    emergencyPhone: patientData?.emergency_contact_phone || contactNumber,
    cnic: patientData?.cnic || 'Not provided',
    patientNumber: patientData?.patient_number || 'Not assigned'
  };
};
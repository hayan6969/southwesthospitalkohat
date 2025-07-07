-- Fix foreign key relationships for proper data joins

-- Add foreign key constraints for patients table
ALTER TABLE patients 
ADD CONSTRAINT patients_id_fkey 
FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for doctors table  
ALTER TABLE doctors 
ADD CONSTRAINT doctors_id_fkey 
FOREIGN KEY (id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key constraints for medical_records
ALTER TABLE medical_records 
ADD CONSTRAINT medical_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE medical_records 
ADD CONSTRAINT medical_records_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints for appointments
ALTER TABLE appointments 
ADD CONSTRAINT appointments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE appointments 
ADD CONSTRAINT appointments_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints for lab_reports
ALTER TABLE lab_reports 
ADD CONSTRAINT lab_reports_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE lab_reports 
ADD CONSTRAINT lab_reports_doctor_id_fkey 
FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE;

-- Add foreign key constraints for invoices
ALTER TABLE invoices 
ADD CONSTRAINT invoices_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
CREATE TRIGGER auto_xray_payment_trigger BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.auto_set_xray_paid();

CREATE TRIGGER auto_xray_reports_payment_trigger BEFORE INSERT OR UPDATE ON public.xray_reports FOR EACH ROW EXECUTE FUNCTION public.auto_set_xray_reports_paid();

CREATE TRIGGER set_consultation_fee_trigger BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_appointment_consultation_fee();

CREATE TRIGGER set_patient_defaults_trigger BEFORE INSERT ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_patient_defaults();

CREATE TRIGGER set_updated_at_appointments BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_doctor_specific_schedules BEFORE UPDATE ON public.doctor_specific_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_doctor_working_hours BEFORE UPDATE ON public.doctor_working_hours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_admission_defaults BEFORE INSERT ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION public.set_admission_defaults();

CREATE TRIGGER trg_beds_updated BEFORE UPDATE ON public.beds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_invoice_audit AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.log_invoice_change();

CREATE TRIGGER trg_ipd_admissions_updated BEFORE UPDATE ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ipd_invoice_defaults BEFORE INSERT ON public.ipd_invoices FOR EACH ROW EXECUTE FUNCTION public.set_ipd_invoice_defaults();

CREATE TRIGGER trg_ipd_invoices_updated BEFORE UPDATE ON public.ipd_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ipd_lab_orders_updated BEFORE UPDATE ON public.ipd_lab_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ipd_med_orders_updated BEFORE UPDATE ON public.ipd_medicine_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lab_pathology_reports_updated BEFORE UPDATE ON public.lab_pathology_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lab_pathology_results_updated BEFORE UPDATE ON public.lab_pathology_report_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lab_test_parameters_updated BEFORE UPDATE ON public.lab_test_parameters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lab_test_types_updated BEFORE UPDATE ON public.lab_test_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_pathology_orders_updated_at BEFORE UPDATE ON public.lab_pathology_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_sync_bed_status AFTER INSERT OR UPDATE ON public.ipd_admissions FOR EACH ROW EXECUTE FUNCTION public.sync_bed_status_on_admission();

CREATE TRIGGER trg_sync_pathology_amounts AFTER UPDATE OF amount ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.sync_pathology_amounts_from_invoice();

CREATE TRIGGER trg_sync_patient_name_snapshots AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_patient_name_snapshots();

CREATE TRIGGER trg_wards_updated BEFORE UPDATE ON public.wards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_auto_assign_queue_position AFTER INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.auto_assign_queue_position();

CREATE TRIGGER trigger_update_queue_on_completion AFTER UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_queue_on_completion();

CREATE TRIGGER update_assessment_entries_updated_at BEFORE UPDATE ON public.assessment_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_closings_updated_at BEFORE UPDATE ON public.daily_closings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_availability_updated_at BEFORE UPDATE ON public.doctor_availability FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_daily_status_updated_at BEFORE UPDATE ON public.doctor_daily_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctor_payments_updated_at BEFORE UPDATE ON public.doctor_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emergency_expenses_updated_at BEFORE UPDATE ON public.emergency_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_finance_settings_updated_at BEFORE UPDATE ON public.finance_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hospital_closing_balance_updated_at BEFORE UPDATE ON public.hospital_closing_balance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hospital_services_updated_at BEFORE UPDATE ON public.hospital_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_stock_batches_updated_at BEFORE UPDATE ON public.lab_stock_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_store_batches_updated_at BEFORE UPDATE ON public.lab_store_batches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_tests_updated_at BEFORE UPDATE ON public.lab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_miscellaneous_income_updated_at BEFORE UPDATE ON public.miscellaneous_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_expenses_updated_at BEFORE UPDATE ON public.ot_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_operations_updated_at BEFORE UPDATE ON public.ot_operations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_rooms_updated_at BEFORE UPDATE ON public.ot_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ot_schedules_updated_at BEFORE UPDATE ON public.ot_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_documents_updated_at BEFORE UPDATE ON public.patient_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_templates_updated_at BEFORE UPDATE ON public.payroll_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.payroll FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_account_updated_at BEFORE UPDATE ON public.pharmacy_account FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_expenses_updated_at BEFORE UPDATE ON public.pharmacy_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_postop_progress_entries_updated_at BEFORE UPDATE ON public.postop_progress_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treatment_chart_entries_updated_at BEFORE UPDATE ON public.treatment_chart_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_xray_tests_updated_at BEFORE UPDATE ON public.xray_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

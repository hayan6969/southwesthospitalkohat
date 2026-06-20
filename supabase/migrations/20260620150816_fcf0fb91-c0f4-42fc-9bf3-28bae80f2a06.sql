ALTER TABLE public.lab_pathology_report_results DROP CONSTRAINT IF EXISTS lab_pathology_report_results_parameter_id_fkey, ADD CONSTRAINT lab_pathology_report_results_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lab_test_parameters(id) ON DELETE CASCADE;

ALTER TABLE public.lab_pathology_report_results DROP CONSTRAINT IF EXISTS lab_pathology_report_results_subrange_id_fkey, ADD CONSTRAINT lab_pathology_report_results_subrange_id_fkey FOREIGN KEY (subrange_id) REFERENCES public.lab_parameter_subranges(id) ON DELETE SET NULL;

ALTER TABLE public.lab_parameter_subranges DROP CONSTRAINT IF EXISTS lab_parameter_subranges_parameter_id_fkey, ADD CONSTRAINT lab_parameter_subranges_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.lab_test_parameters(id) ON DELETE CASCADE;

DELETE FROM public.lab_pathology_report_results WHERE parameter_id NOT IN (SELECT id FROM public.lab_test_parameters);
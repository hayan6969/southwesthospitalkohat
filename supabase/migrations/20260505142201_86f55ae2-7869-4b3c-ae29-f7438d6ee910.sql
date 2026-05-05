-- Add display_all_subranges flag to parameters and is_result_row flag to subranges
ALTER TABLE public.lab_test_parameters
  ADD COLUMN IF NOT EXISTS display_all_subranges boolean NOT NULL DEFAULT false;

ALTER TABLE public.lab_parameter_subranges
  ADD COLUMN IF NOT EXISTS is_result_row boolean NOT NULL DEFAULT false;
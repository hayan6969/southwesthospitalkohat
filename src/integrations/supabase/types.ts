export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          booking_type: string | null
          cleared_at: string | null
          consultation_fee_at_time: number | null
          created_at: string | null
          doctor_id: string
          id: string
          invoice_generated_at: string | null
          notes: string | null
          patient_id: string
          payment_due_time: string | null
          payment_status: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          booking_type?: string | null
          cleared_at?: string | null
          consultation_fee_at_time?: number | null
          created_at?: string | null
          doctor_id: string
          id?: string
          invoice_generated_at?: string | null
          notes?: string | null
          patient_id: string
          payment_due_time?: string | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          type: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          booking_type?: string | null
          cleared_at?: string | null
          consultation_fee_at_time?: number | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          invoice_generated_at?: string | null
          notes?: string | null
          patient_id?: string
          payment_due_time?: string | null
          payment_status?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_entries: {
        Row: {
          assessment: string | null
          created_at: string | null
          entry_date: string | null
          entry_time: string | null
          id: string
          ot_schedule_id: string
          plan: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          assessment?: string | null
          created_at?: string | null
          entry_date?: string | null
          entry_time?: string | null
          id?: string
          ot_schedule_id: string
          plan?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          assessment?: string | null
          created_at?: string | null
          entry_date?: string | null
          entry_time?: string | null
          id?: string
          ot_schedule_id?: string
          plan?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_closings: {
        Row: {
          closing_date: string
          closing_time: string
          created_at: string | null
          day_name: string
          hospital_revenue: number | null
          id: string
          net_profit: number | null
          pharmacy_profit: number | null
          pharmacy_revenue: number | null
          total_expenses: number | null
          total_refunds: number | null
          transactions_data: Json | null
          updated_at: string | null
        }
        Insert: {
          closing_date: string
          closing_time: string
          created_at?: string | null
          day_name: string
          hospital_revenue?: number | null
          id?: string
          net_profit?: number | null
          pharmacy_profit?: number | null
          pharmacy_revenue?: number | null
          total_expenses?: number | null
          total_refunds?: number | null
          transactions_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          closing_date?: string
          closing_time?: string
          created_at?: string | null
          day_name?: string
          hospital_revenue?: number | null
          id?: string
          net_profit?: number | null
          pharmacy_profit?: number | null
          pharmacy_revenue?: number | null
          total_expenses?: number | null
          total_refunds?: number | null
          transactions_data?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      doctor_availability: {
        Row: {
          availability_date: string
          created_at: string | null
          doctor_id: string
          id: string
          is_available: boolean | null
          updated_at: string | null
        }
        Insert: {
          availability_date: string
          created_at?: string | null
          doctor_id: string
          id?: string
          is_available?: boolean | null
          updated_at?: string | null
        }
        Update: {
          availability_date?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          is_available?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_daily_status: {
        Row: {
          accepting_appointments: boolean | null
          created_at: string | null
          doctor_id: string
          id: string
          status_date: string
          updated_at: string | null
        }
        Insert: {
          accepting_appointments?: boolean | null
          created_at?: string | null
          doctor_id: string
          id?: string
          status_date: string
          updated_at?: string | null
        }
        Update: {
          accepting_appointments?: boolean | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          status_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      doctor_payments: {
        Row: {
          appointment_count: number | null
          consultation_earnings: number | null
          created_at: string | null
          doctor_id: string
          id: string
          notes: string | null
          ot_count: number | null
          ot_earnings: number | null
          paid_at: string | null
          paid_by: string | null
          payment_status: string | null
          period_end: string
          period_start: string
          total_earnings: number | null
          updated_at: string | null
        }
        Insert: {
          appointment_count?: number | null
          consultation_earnings?: number | null
          created_at?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          ot_count?: number | null
          ot_earnings?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string | null
          period_end: string
          period_start: string
          total_earnings?: number | null
          updated_at?: string | null
        }
        Update: {
          appointment_count?: number | null
          consultation_earnings?: number | null
          created_at?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          ot_count?: number | null
          ot_earnings?: number | null
          paid_at?: string | null
          paid_by?: string | null
          payment_status?: string | null
          period_end?: string
          period_start?: string
          total_earnings?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_payments_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_specific_schedules: {
        Row: {
          created_at: string | null
          doctor_id: string
          end_time: string | null
          id: string
          is_working: boolean | null
          notes: string | null
          specific_date: string
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          end_time?: string | null
          id?: string
          is_working?: boolean | null
          notes?: string | null
          specific_date: string
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          end_time?: string | null
          id?: string
          is_working?: boolean | null
          notes?: string | null
          specific_date?: string
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_specific_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_working_hours: {
        Row: {
          created_at: string | null
          day_of_week: number
          doctor_id: string
          end_time: string | null
          id: string
          is_working: boolean | null
          start_time: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          doctor_id: string
          end_time?: string | null
          id?: string
          is_working?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          doctor_id?: string
          end_time?: string | null
          id?: string
          is_working?: boolean | null
          start_time?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_working_hours_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          avatar_url: string | null
          consultation_fee: number | null
          experience_years: number | null
          id: string
          license_number: string | null
          specialization: string | null
        }
        Insert: {
          avatar_url?: string | null
          consultation_fee?: number | null
          experience_years?: number | null
          id: string
          license_number?: string | null
          specialization?: string | null
        }
        Update: {
          avatar_url?: string | null
          consultation_fee?: number | null
          experience_years?: number | null
          id?: string
          license_number?: string | null
          specialization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_expenses: {
        Row: {
          cost: number | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          description: string
          expense_date: string
          id: string
          proof_url: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          proof_url?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          proof_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hospital_closing_balance: {
        Row: {
          closing_balance: number | null
          closing_date: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          closing_balance?: number | null
          closing_date: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          closing_balance?: number | null
          closing_date?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      hospital_settings: {
        Row: {
          booking_lead_time_hours: number | null
          closing_time: string | null
          contact_number: string | null
          created_at: string | null
          emergency_consultation_fee: number | null
          emergency_slots_percentage: number | null
          hospital_address: string | null
          hospital_name: string | null
          id: string
          logo_url: string | null
          max_appointments_per_doctor: number | null
          opening_time: string | null
          payroll_payment_date: number | null
          updated_at: string | null
          working_days: string[] | null
        }
        Insert: {
          booking_lead_time_hours?: number | null
          closing_time?: string | null
          contact_number?: string | null
          created_at?: string | null
          emergency_consultation_fee?: number | null
          emergency_slots_percentage?: number | null
          hospital_address?: string | null
          hospital_name?: string | null
          id?: string
          logo_url?: string | null
          max_appointments_per_doctor?: number | null
          opening_time?: string | null
          payroll_payment_date?: number | null
          updated_at?: string | null
          working_days?: string[] | null
        }
        Update: {
          booking_lead_time_hours?: number | null
          closing_time?: string | null
          contact_number?: string | null
          created_at?: string | null
          emergency_consultation_fee?: number | null
          emergency_slots_percentage?: number | null
          hospital_address?: string | null
          hospital_name?: string | null
          id?: string
          logo_url?: string | null
          max_appointments_per_doctor?: number | null
          opening_time?: string | null
          payroll_payment_date?: number | null
          updated_at?: string | null
          working_days?: string[] | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          doctor_id: string | null
          due_date: string | null
          emergency_patient_data: Json | null
          id: string
          invoice_number: string
          paid_at: string | null
          patient_id: string
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          doctor_id?: string | null
          due_date?: string | null
          emergency_patient_data?: Json | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          patient_id: string
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          doctor_id?: string | null
          due_date?: string | null
          emergency_patient_data?: Json | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          patient_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_reports: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          external_doctor_name: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string
          price: number | null
          result_file_url: string | null
          results: string | null
          status: string | null
          test_date: string | null
          test_id: string | null
          test_name: string
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          external_doctor_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id: string
          price?: number | null
          result_file_url?: string | null
          results?: string | null
          status?: string | null
          test_date?: string | null
          test_id?: string | null
          test_name: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          external_doctor_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string
          price?: number | null
          result_file_url?: string | null
          results?: string | null
          status?: string | null
          test_date?: string | null
          test_id?: string | null
          test_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "lab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          normal_range: string | null
          preparation_instructions: string | null
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          normal_range?: string | null
          preparation_instructions?: string | null
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          normal_range?: string | null
          preparation_instructions?: string | null
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      medical_records: {
        Row: {
          created_at: string | null
          diagnosis: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          prescription: string | null
          treatment: string | null
          visit_date: string | null
        }
        Insert: {
          created_at?: string | null
          diagnosis?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          prescription?: string | null
          treatment?: string | null
          visit_date?: string | null
        }
        Update: {
          created_at?: string | null
          diagnosis?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          prescription?: string | null
          treatment?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medical_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          batch_number: string | null
          company_name: string | null
          created_at: string | null
          description: string | null
          expiry_date: string
          formula: string | null
          id: string
          manufacturing_date: string | null
          minimum_stock_level: number | null
          name: string
          purchase_price: number
          selling_price: number
          stock_quantity: number
          updated_at: string | null
        }
        Insert: {
          batch_number?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          expiry_date: string
          formula?: string | null
          id?: string
          manufacturing_date?: string | null
          minimum_stock_level?: number | null
          name: string
          purchase_price: number
          selling_price: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Update: {
          batch_number?: string | null
          company_name?: string | null
          created_at?: string | null
          description?: string | null
          expiry_date?: string
          formula?: string | null
          id?: string
          manufacturing_date?: string | null
          minimum_stock_level?: number | null
          name?: string
          purchase_price?: number
          selling_price?: number
          stock_quantity?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      miscellaneous_income: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          income_date: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          income_date?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          income_date?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ot_expenses: {
        Row: {
          cost: number
          created_at: string | null
          expense_name: string
          id: string
          operation_id: string
          updated_at: string | null
        }
        Insert: {
          cost: number
          created_at?: string | null
          expense_name: string
          id?: string
          operation_id: string
          updated_at?: string | null
        }
        Update: {
          cost?: number
          created_at?: string | null
          expense_name?: string
          id?: string
          operation_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_expenses_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "ot_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      ot_operations: {
        Row: {
          created_at: string | null
          id: string
          operation_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          operation_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          operation_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ot_rooms: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean | null
          room_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          room_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean | null
          room_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ot_schedules: {
        Row: {
          created_at: string | null
          doctor_expense: number | null
          doctor_id: string | null
          doctor_name: string | null
          id: string
          notes: string | null
          operation_date: string
          operation_id: string | null
          ot_notes: Json | null
          patient_id: string
          queue_position: number
          room_id: string | null
          status: string | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_expense?: number | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          operation_date: string
          operation_id?: string | null
          ot_notes?: Json | null
          patient_id: string
          queue_position: number
          room_id?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_expense?: number | null
          doctor_id?: string | null
          doctor_name?: string | null
          id?: string
          notes?: string | null
          operation_date?: string
          operation_id?: string | null
          ot_notes?: Json | null
          patient_id?: string
          queue_position?: number
          room_id?: string | null
          status?: string | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ot_schedules_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "ot_operations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ot_schedules_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "ot_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_documents: {
        Row: {
          created_at: string | null
          document_label: string
          document_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          patient_id: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_label: string
          document_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          patient_id: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_label?: string
          document_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          patient_id?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          area: string | null
          blood_type: string | null
          city: string | null
          cnic: string | null
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          patient_number: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          area?: string | null
          blood_type?: string | null
          city?: string | null
          cnic?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id: string
          patient_number?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
          area?: string | null
          blood_type?: string | null
          city?: string | null
          cnic?: string | null
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          patient_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll: {
        Row: {
          allowances: number | null
          base_salary: number
          created_at: string | null
          created_by: string | null
          deductions: number | null
          employee_id: string
          employee_name: string
          id: string
          net_salary: number
          paid_at: string | null
          pay_period: string
          role: string
          status: string
          updated_at: string | null
        }
        Insert: {
          allowances?: number | null
          base_salary: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          employee_name: string
          id?: string
          net_salary: number
          paid_at?: string | null
          pay_period: string
          role: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          employee_name?: string
          id?: string
          net_salary?: number
          paid_at?: string | null
          pay_period?: string
          role?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_templates: {
        Row: {
          allowances: number | null
          base_salary: number
          created_at: string | null
          created_by: string | null
          deductions: number | null
          employee_id: string
          employee_name: string
          id: string
          is_active: boolean | null
          net_salary: number
          role: string
          updated_at: string | null
        }
        Insert: {
          allowances?: number | null
          base_salary: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          employee_name: string
          id?: string
          is_active?: boolean | null
          net_salary: number
          role: string
          updated_at?: string | null
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string | null
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          employee_name?: string
          id?: string
          is_active?: boolean | null
          net_salary?: number
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_account: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          starting_balance: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          starting_balance?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          starting_balance?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pharmacy_expenses: {
        Row: {
          amount: number
          bill_number: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          bill_number?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          bill_number?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pharmacy_invoice_items: {
        Row: {
          created_at: string | null
          id: string
          invoice_id: string | null
          medicine_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          medicine_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          medicine_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_invoice_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_invoices: {
        Row: {
          created_at: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          final_amount: number
          id: string
          invoice_number: string
          status: string | null
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          final_amount: number
          id?: string
          invoice_number: string
          status?: string | null
          total_amount: number
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          final_amount?: number
          id?: string
          invoice_number?: string
          status?: string | null
          total_amount?: number
        }
        Relationships: []
      }
      postop_progress_entries: {
        Row: {
          blood_pressure: string | null
          created_at: string | null
          entry_date: string
          id: string
          input_data: string | null
          ot_schedule_id: string
          output_data: string | null
          pulses: string | null
          remarks: string | null
          temperature: string | null
          updated_at: string | null
          user_email: string
        }
        Insert: {
          blood_pressure?: string | null
          created_at?: string | null
          entry_date: string
          id?: string
          input_data?: string | null
          ot_schedule_id: string
          output_data?: string | null
          pulses?: string | null
          remarks?: string | null
          temperature?: string | null
          updated_at?: string | null
          user_email: string
        }
        Update: {
          blood_pressure?: string | null
          created_at?: string | null
          entry_date?: string
          id?: string
          input_data?: string | null
          ot_schedule_id?: string
          output_data?: string | null
          pulses?: string | null
          remarks?: string | null
          temperature?: string | null
          updated_at?: string | null
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "postop_progress_entries_ot_schedule_id_fkey"
            columns: ["ot_schedule_id"]
            isOneToOne: false
            referencedRelation: "ot_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string
          created_at: string | null
          doctor_id: string
          id: string
          patient_id: string
          prescription_text: string
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string | null
          doctor_id: string
          id?: string
          patient_id: string
          prescription_text: string
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          patient_id?: string
          prescription_text?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          last_name: string
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_positions: {
        Row: {
          appointment_date: string
          appointment_id: string
          created_at: string | null
          doctor_id: string
          id: string
          queue_position: number
          status: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          appointment_id: string
          created_at?: string | null
          doctor_id: string
          id?: string
          queue_position: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_id?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          queue_position?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "queue_positions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_positions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          doctor_id: string | null
          id: string
          patient_id: string | null
          processed_by: string
          proof_url: string | null
          refund_type: string
          related_record_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          processed_by: string
          proof_url?: string | null
          refund_type: string
          related_record_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          processed_by?: string
          proof_url?: string | null
          refund_type?: string
          related_record_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_chart_entries: {
        Row: {
          created_at: string | null
          entry_date: string
          id: string
          investigation: string | null
          medicine: string | null
          ot_schedule_id: string
          updated_at: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          entry_date: string
          id?: string
          investigation?: string | null
          medicine?: string | null
          ot_schedule_id: string
          updated_at?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          id?: string
          investigation?: string | null
          medicine?: string | null
          ot_schedule_id?: string
          updated_at?: string | null
          user_email?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      xray_reports: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          external_doctor_name: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string
          price: number | null
          results: string | null
          status: string | null
          test_id: string | null
          test_name: string
          xray_date: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          external_doctor_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id: string
          price?: number | null
          results?: string | null
          status?: string | null
          test_id?: string | null
          test_name: string
          xray_date?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          external_doctor_name?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string
          price?: number | null
          results?: string | null
          status?: string | null
          test_id?: string | null
          test_name?: string
          xray_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "xray_reports_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xray_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xray_reports_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "xray_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      xray_tests: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          preparation_instructions: string | null
          price: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          preparation_instructions?: string | null
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          preparation_instructions?: string | null
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_cancel_overdue_appointments: { Args: never; Returns: undefined }
      calculate_doctor_earnings: {
        Args: { p_doctor_id: string; p_end_date: string; p_start_date: string }
        Returns: {
          appointment_count: number
          consultation_earnings: number
          ot_count: number
          ot_earnings: number
          total_earnings: number
        }[]
      }
      create_daily_closing: {
        Args: {
          p_closing_date: string
          p_closing_time: string
          p_day_name: string
          p_hospital_revenue: number
          p_net_profit: number
          p_pharmacy_profit: number
          p_pharmacy_revenue: number
          p_total_expenses: number
          p_total_refunds: number
          p_transactions_data: Json
        }
        Returns: string
      }
      create_user_account: {
        Args: {
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      delete_user_safely: { Args: { user_uuid: string }; Returns: boolean }
      generate_daily_doctor_payments: {
        Args: { target_date: string }
        Returns: number
      }
      generate_monthly_payroll: {
        Args: { target_month: string }
        Returns: number
      }
      generate_patient_number: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_last_daily_closing: {
        Args: never
        Returns: {
          closing_date: string
          closing_time: string
          created_at: string
          day_name: string
          hospital_revenue: number
          id: string
          net_profit: number
          pharmacy_profit: number
          pharmacy_revenue: number
          total_expenses: number
          total_refunds: number
          transactions_data: Json
          updated_at: string
        }[]
      }
      get_next_ot_queue_position: {
        Args: { operation_date_param: string; room_uuid: string }
        Returns: number
      }
      get_next_queue_position: {
        Args: { appointment_date_param: string; doctor_uuid: string }
        Returns: number
      }
      reorder_queue_after_cancellation: {
        Args: {
          p_appointment_date: string
          p_cancelled_position: number
          p_doctor_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "rescheduled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "scheduled",
        "completed",
        "cancelled",
        "rescheduled",
      ],
    },
  },
} as const

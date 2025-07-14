export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          appointment_date: string
          booking_type: string | null
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
          created_at: string
          doctor_id: string
          id: string
          is_available: boolean
          updated_at: string
        }
        Insert: {
          availability_date: string
          created_at?: string
          doctor_id: string
          id?: string
          is_available?: boolean
          updated_at?: string
        }
        Update: {
          availability_date?: string
          created_at?: string
          doctor_id?: string
          id?: string
          is_available?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      doctor_daily_status: {
        Row: {
          accepting_appointments: boolean
          created_at: string
          doctor_id: string
          id: string
          status_date: string
          updated_at: string
        }
        Insert: {
          accepting_appointments?: boolean
          created_at?: string
          doctor_id: string
          id?: string
          status_date: string
          updated_at?: string
        }
        Update: {
          accepting_appointments?: boolean
          created_at?: string
          doctor_id?: string
          id?: string
          status_date?: string
          updated_at?: string
        }
        Relationships: []
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
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hospital_settings: {
        Row: {
          booking_lead_time_hours: number
          closing_time: string
          contact_number: string | null
          created_at: string | null
          emergency_slots_percentage: number
          hospital_address: string | null
          hospital_name: string
          id: string
          logo_url: string | null
          max_appointments_per_doctor: number
          opening_time: string
          payroll_payment_date: number | null
          updated_at: string | null
          working_days: string[]
        }
        Insert: {
          booking_lead_time_hours?: number
          closing_time?: string
          contact_number?: string | null
          created_at?: string | null
          emergency_slots_percentage?: number
          hospital_address?: string | null
          hospital_name?: string
          id?: string
          logo_url?: string | null
          max_appointments_per_doctor?: number
          opening_time?: string
          payroll_payment_date?: number | null
          updated_at?: string | null
          working_days?: string[]
        }
        Update: {
          booking_lead_time_hours?: number
          closing_time?: string
          contact_number?: string | null
          created_at?: string | null
          emergency_slots_percentage?: number
          hospital_address?: string | null
          hospital_name?: string
          id?: string
          logo_url?: string | null
          max_appointments_per_doctor?: number
          opening_time?: string
          payroll_payment_date?: number | null
          updated_at?: string | null
          working_days?: string[]
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          patient_id: string
          status: Database["public"]["Enums"]["invoice_status"] | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["invoice_status"] | null
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
          doctor_id: string
          id: string
          invoice_id: string | null
          notes: string | null
          patient_id: string
          price: number | null
          result_file_url: string | null
          results: string | null
          status: Database["public"]["Enums"]["lab_status"] | null
          test_date: string | null
          test_id: string | null
          test_name: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id: string
          price?: number | null
          result_file_url?: string | null
          results?: string | null
          status?: Database["public"]["Enums"]["lab_status"] | null
          test_date?: string | null
          test_id?: string | null
          test_name: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          patient_id?: string
          price?: number | null
          result_file_url?: string | null
          results?: string | null
          status?: Database["public"]["Enums"]["lab_status"] | null
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
          created_at: string
          description: string | null
          id: string
          name: string
          normal_range: string | null
          preparation_instructions: string | null
          price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          normal_range?: string | null
          preparation_instructions?: string | null
          price: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          normal_range?: string | null
          preparation_instructions?: string | null
          price?: number
          updated_at?: string
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
      ot_expenses: {
        Row: {
          cost: number
          created_at: string
          expense_name: string
          id: string
          operation_id: string
          updated_at: string
        }
        Insert: {
          cost: number
          created_at?: string
          expense_name: string
          id?: string
          operation_id: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          expense_name?: string
          id?: string
          operation_id?: string
          updated_at?: string
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
          created_at: string
          id: string
          operation_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          operation_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          operation_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ot_rooms: {
        Row: {
          created_at: string | null
          id: string
          is_available: boolean
          room_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_available?: boolean
          room_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_available?: boolean
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
      patients: {
        Row: {
          address: string | null
          allergies: string | null
          blood_type: string | null
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
          blood_type?: string | null
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
          blood_type?: string | null
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
          created_at: string
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
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          base_salary: number
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_employee_id_fkey"
            columns: ["employee_id"]
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
          created_at: string
          created_by: string | null
          deductions: number | null
          employee_id: string
          employee_name: string
          id: string
          is_active: boolean | null
          net_salary: number
          role: string
          updated_at: string
        }
        Insert: {
          allowances?: number | null
          base_salary: number
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          employee_id: string
          employee_name: string
          id?: string
          is_active?: boolean | null
          net_salary: number
          role: string
          updated_at?: string
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string
          created_by?: string | null
          deductions?: number | null
          employee_id?: string
          employee_name?: string
          id?: string
          is_active?: boolean | null
          net_salary?: number
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_templates_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      users: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
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
          role: Database["public"]["Enums"]["user_role"]
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
          role?: Database["public"]["Enums"]["user_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_cancel_overdue_appointments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_monthly_payroll: {
        Args: { target_month: string }
        Returns: number
      }
      generate_patient_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_next_ot_queue_position: {
        Args: { room_uuid: string; operation_date_param: string }
        Returns: number
      }
      get_next_queue_position: {
        Args: { doctor_uuid: string; appointment_date_param: string }
        Returns: number
      }
    }
    Enums: {
      appointment_status:
        | "scheduled"
        | "completed"
        | "cancelled"
        | "rescheduled"
      invoice_status: "paid" | "pending" | "overdue"
      lab_status: "pending" | "completed" | "reviewed"
      user_role: "patient" | "doctor" | "staff" | "admin"
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
      invoice_status: ["paid", "pending", "overdue"],
      lab_status: ["pending", "completed", "reviewed"],
      user_role: ["patient", "doctor", "staff", "admin"],
    },
  },
} as const

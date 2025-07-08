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
          created_at: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["appointment_status"] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
          type: string
          updated_at?: string | null
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
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
      doctors: {
        Row: {
          consultation_fee: number | null
          experience_years: number | null
          id: string
          license_number: string | null
          specialization: string | null
        }
        Insert: {
          consultation_fee?: number | null
          experience_years?: number | null
          id: string
          license_number?: string | null
          specialization?: string | null
        }
        Update: {
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
          notes: string | null
          patient_id: string
          results: string | null
          status: Database["public"]["Enums"]["lab_status"] | null
          test_date: string | null
          test_name: string
        }
        Insert: {
          created_at?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          results?: string | null
          status?: Database["public"]["Enums"]["lab_status"] | null
          test_date?: string | null
          test_name: string
        }
        Update: {
          created_at?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          results?: string | null
          status?: Database["public"]["Enums"]["lab_status"] | null
          test_date?: string | null
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
        ]
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
      generate_patient_number: {
        Args: Record<PropertyKey, never>
        Returns: string
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

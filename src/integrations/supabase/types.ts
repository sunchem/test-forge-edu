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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      classes: {
        Row: {
          academic_year: string
          created_at: string | null
          grade: number | null
          id: string
          name: string
          school_id: string
          subject: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          grade?: number | null
          id?: string
          name: string
          school_id: string
          subject?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          grade?: number | null
          id?: string
          name?: string
          school_id?: string
          subject?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          class_name: string | null
          created_at: string | null
          first_name: string
          id: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          class_name?: string | null
          created_at?: string | null
          first_name: string
          id?: string
          last_name: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          class_name?: string | null
          created_at?: string | null
          first_name?: string
          id?: string
          last_name?: string
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      question_options: {
        Row: {
          created_at: string | null
          id: string
          is_correct: boolean | null
          option_order: number
          option_text: string
          question_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_order: number
          option_text: string
          question_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          option_order?: number
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          created_at: string | null
          id: string
          points: number | null
          question_order: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          test_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_order: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_order?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          test_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_answers: {
        Row: {
          answered_at: string | null
          attempt_id: string
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string
          selected_option_id: string | null
          text_answer: string | null
        }
        Insert: {
          answered_at?: string | null
          attempt_id: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id: string
          selected_option_id?: string | null
          text_answer?: string | null
        }
        Update: {
          answered_at?: string | null
          attempt_id?: string
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string
          selected_option_id?: string | null
          text_answer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_answers_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "question_options"
            referencedColumns: ["id"]
          },
        ]
      }
      test_assignments: {
        Row: {
          assigned_at: string | null
          due_date: string | null
          id: string
          student_id: string
          test_id: string
        }
        Insert: {
          assigned_at?: string | null
          due_date?: string | null
          id?: string
          student_id: string
          test_id: string
        }
        Update: {
          assigned_at?: string | null
          due_date?: string | null
          id?: string
          student_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_assignments_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          academic_year: string
          completed_at: string | null
          id: string
          is_completed: boolean | null
          max_score: number | null
          percentage_score: number | null
          quarter: string | null
          started_at: string | null
          student_id: string
          test_id: string
          total_score: number | null
        }
        Insert: {
          academic_year: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          max_score?: number | null
          percentage_score?: number | null
          quarter?: string | null
          started_at?: string | null
          student_id: string
          test_id: string
          total_score?: number | null
        }
        Update: {
          academic_year?: string
          completed_at?: string | null
          id?: string
          is_completed?: boolean | null
          max_score?: number | null
          percentage_score?: number | null
          quarter?: string | null
          started_at?: string | null
          student_id?: string
          test_id?: string
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          academic_year: string
          allow_retake: boolean | null
          class_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          quarter: string | null
          school_id: string
          teacher_id: string
          time_limit_minutes: number | null
          title: string
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          academic_year: string
          allow_retake?: boolean | null
          class_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          quarter?: string | null
          school_id: string
          teacher_id: string
          time_limit_minutes?: number | null
          title: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string
          allow_retake?: boolean | null
          class_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          quarter?: string | null
          school_id?: string
          teacher_id?: string
          time_limit_minutes?: number | null
          title?: string
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tests_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_school: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      question_type: "multiple_choice" | "true_false" | "text"
      user_role: "admin" | "teacher" | "student" | "school_admin"
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
      question_type: ["multiple_choice", "true_false", "text"],
      user_role: ["admin", "teacher", "student", "school_admin"],
    },
  },
} as const

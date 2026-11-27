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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      controllers: {
        Row: {
          ch_ai: number | null
          ch_ao: number | null
          ch_di: number | null
          ch_do: number | null
          ch_pi: number | null
          commissioned: string | null
          created_at: string
          ctype: string
          eth_capacity: number | null
          eth_devices: number | null
          eth_signals: number | null
          id: string
          io_ai: number | null
          io_ao: number | null
          io_di: number | null
          io_do: number | null
          io_pi: number | null
          ip: string | null
          main_equipment: string | null
          main_equipment_name: string | null
          manufacturer: string | null
          mb_capacity: number | null
          mb_devices: number | null
          mb_signals: number | null
          mod_ai: number | null
          mod_ao: number | null
          mod_di: number | null
          mod_do: number | null
          mod_pi: number | null
          model: string | null
          notes: string | null
          pb_capacity: number | null
          pb_devices: number | null
          pb_signals: number | null
          section: string
          status: string
          sub_section: string | null
          tag: string
          unit: string
          updated_at: string
        }
        Insert: {
          ch_ai?: number | null
          ch_ao?: number | null
          ch_di?: number | null
          ch_do?: number | null
          ch_pi?: number | null
          commissioned?: string | null
          created_at?: string
          ctype: string
          eth_capacity?: number | null
          eth_devices?: number | null
          eth_signals?: number | null
          id?: string
          io_ai?: number | null
          io_ao?: number | null
          io_di?: number | null
          io_do?: number | null
          io_pi?: number | null
          ip?: string | null
          main_equipment?: string | null
          main_equipment_name?: string | null
          manufacturer?: string | null
          mb_capacity?: number | null
          mb_devices?: number | null
          mb_signals?: number | null
          mod_ai?: number | null
          mod_ao?: number | null
          mod_di?: number | null
          mod_do?: number | null
          mod_pi?: number | null
          model?: string | null
          notes?: string | null
          pb_capacity?: number | null
          pb_devices?: number | null
          pb_signals?: number | null
          section: string
          status?: string
          sub_section?: string | null
          tag: string
          unit: string
          updated_at?: string
        }
        Update: {
          ch_ai?: number | null
          ch_ao?: number | null
          ch_di?: number | null
          ch_do?: number | null
          ch_pi?: number | null
          commissioned?: string | null
          created_at?: string
          ctype?: string
          eth_capacity?: number | null
          eth_devices?: number | null
          eth_signals?: number | null
          id?: string
          io_ai?: number | null
          io_ao?: number | null
          io_di?: number | null
          io_do?: number | null
          io_pi?: number | null
          ip?: string | null
          main_equipment?: string | null
          main_equipment_name?: string | null
          manufacturer?: string | null
          mb_capacity?: number | null
          mb_devices?: number | null
          mb_signals?: number | null
          mod_ai?: number | null
          mod_ao?: number | null
          mod_di?: number | null
          mod_do?: number | null
          mod_pi?: number | null
          model?: string | null
          notes?: string | null
          pb_capacity?: number | null
          pb_devices?: number | null
          pb_signals?: number | null
          section?: string
          status?: string
          sub_section?: string | null
          tag?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      equipment: {
        Row: {
          asset_serial: string | null
          category: string
          created_at: string
          factory_serial: string | null
          function_code: string | null
          id: string
          isotope: string | null
          main_equipment: string
          main_equipment_name: string | null
          maintenance_history: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          parameter: string | null
          section: string
          sequence: string
          source_code: string | null
          source_serial: string | null
          status: string
          sub_section: string
          subtype: string
          tag_name: string
          unit: string
          updated_at: string
          year: string
        }
        Insert: {
          asset_serial?: string | null
          category: string
          created_at?: string
          factory_serial?: string | null
          function_code?: string | null
          id?: string
          isotope?: string | null
          main_equipment: string
          main_equipment_name?: string | null
          maintenance_history?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          parameter?: string | null
          section: string
          sequence: string
          source_code?: string | null
          source_serial?: string | null
          status?: string
          sub_section: string
          subtype: string
          tag_name: string
          unit: string
          updated_at?: string
          year: string
        }
        Update: {
          asset_serial?: string | null
          category?: string
          created_at?: string
          factory_serial?: string | null
          function_code?: string | null
          id?: string
          isotope?: string | null
          main_equipment?: string
          main_equipment_name?: string | null
          maintenance_history?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          parameter?: string | null
          section?: string
          sequence?: string
          source_code?: string | null
          source_serial?: string | null
          status?: string
          sub_section?: string
          subtype?: string
          tag_name?: string
          unit?: string
          updated_at?: string
          year?: string
        }
        Relationships: []
      }
      rsl_equipment: {
        Row: {
          activity_date: string | null
          activity_mbq: number | null
          analyzer_code: string | null
          category: string
          code: string | null
          commissioned: string | null
          created_at: string
          id: string
          isotope: string | null
          kind: string | null
          line: string | null
          maintenance_history: string | null
          manufacturer: string | null
          model: string | null
          notes: string | null
          permit_no: string | null
          points: string | null
          sample_name: string | null
          section: string | null
          serial: string | null
          source_code: string | null
          status: string
          sub_section: string | null
          tag: string
          trace: string | null
          updated_at: string
          utilization: number | null
          year: number | null
        }
        Insert: {
          activity_date?: string | null
          activity_mbq?: number | null
          analyzer_code?: string | null
          category: string
          code?: string | null
          commissioned?: string | null
          created_at?: string
          id?: string
          isotope?: string | null
          kind?: string | null
          line?: string | null
          maintenance_history?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          permit_no?: string | null
          points?: string | null
          sample_name?: string | null
          section?: string | null
          serial?: string | null
          source_code?: string | null
          status?: string
          sub_section?: string | null
          tag: string
          trace?: string | null
          updated_at?: string
          utilization?: number | null
          year?: number | null
        }
        Update: {
          activity_date?: string | null
          activity_mbq?: number | null
          analyzer_code?: string | null
          category?: string
          code?: string | null
          commissioned?: string | null
          created_at?: string
          id?: string
          isotope?: string | null
          kind?: string | null
          line?: string | null
          maintenance_history?: string | null
          manufacturer?: string | null
          model?: string | null
          notes?: string | null
          permit_no?: string | null
          points?: string | null
          sample_name?: string | null
          section?: string | null
          serial?: string | null
          source_code?: string | null
          status?: string
          sub_section?: string | null
          tag?: string
          trace?: string | null
          updated_at?: string
          utilization?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rsl_equipment_trace_fkey"
            columns: ["trace"]
            isOneToOne: false
            referencedRelation: "rsl_traces"
            referencedColumns: ["code"]
          },
        ]
      }
      rsl_traces: {
        Row: {
          analyzer_code: string | null
          ap_group: string | null
          code: string
          created_at: string
          length_m: number | null
          notes: string | null
          sample_name: string | null
          section: string | null
          signal_m: number | null
          sub_section: string | null
          updated_at: string
        }
        Insert: {
          analyzer_code?: string | null
          ap_group?: string | null
          code: string
          created_at?: string
          length_m?: number | null
          notes?: string | null
          sample_name?: string | null
          section?: string | null
          signal_m?: number | null
          sub_section?: string | null
          updated_at?: string
        }
        Update: {
          analyzer_code?: string | null
          ap_group?: string | null
          code?: string
          created_at?: string
          length_m?: number | null
          notes?: string | null
          sample_name?: string | null
          section?: string | null
          signal_m?: number | null
          sub_section?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          section: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          section?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          section?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_controllers: { Args: { _user_id: string }; Returns: boolean }
      can_edit_rsl: { Args: { _user_id: string }; Returns: boolean }
      can_edit_section: {
        Args: { _section: string; _user_id: string }
        Returns: boolean
      }
      dashboard_equipment_stats: {
        Args: never
        Returns: {
          category: string
          function_code: string
          manufacturer: string
          parameter: string
          subtype: string
          unit: string
          year: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "section_user" | "controller_editor" | "rsl_editor" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "section_user", "controller_editor", "rsl_editor", "editor"],
    },
  },
} as const

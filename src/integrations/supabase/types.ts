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
      admins: {
        Row: {
          created_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      },
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          published: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leonbergers: {
        Row: {
          birth_date: string | null
          bonitation_code: string | null
          breeder_country: string | null
          breeder_name: string | null
          created_at: string
          created_by: string | null
          dam_name: string | null
          health: Database["public"]["CompositeTypes"]["jsonb"]
          height_cm: number | null
          height_note: string | null
          id: string
          is_deceased: boolean
          is_veteran: boolean
          litters_count: number | null
          litters_note: string | null
          mating_count: number | null
          name: string
          note: string | null
          other_exams: string | null
          owner_address: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_web: string | null
          pedigree_url: string | null
          profile_image_url: string | null
          published: boolean
          sex: Database["public"]["Enums"]["dog_sex"]
          short_note: string | null
          sire_name: string | null
          slug: string | null
          spkp: number | null
          updated_at: string
          weight_kg: number | null
          weight_note: string | null
        }
        Insert: {
          birth_date?: string | null
          bonitation_code?: string | null
          breeder_country?: string | null
          breeder_name?: string | null
          created_at?: string
          created_by?: string | null
          dam_name?: string | null
          health?: Database["public"]["CompositeTypes"]["jsonb"]
          height_cm?: number | null
          height_note?: string | null
          id?: string
          is_deceased?: boolean
          is_veteran?: boolean
          litters_count?: number | null
          litters_note?: string | null
          mating_count?: number | null
          name: string
          note?: string | null
          other_exams?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_web?: string | null
          pedigree_url?: string | null
          profile_image_url?: string | null
          published?: boolean
          sex: Database["public"]["Enums"]["dog_sex"]
          short_note?: string | null
          sire_name?: string | null
          slug?: string | null
          spkp?: number | null
          updated_at?: string
          weight_kg?: number | null
          weight_note?: string | null
        }
        Update: {
          birth_date?: string | null
          bonitation_code?: string | null
          breeder_country?: string | null
          breeder_name?: string | null
          created_at?: string
          created_by?: string | null
          dam_name?: string | null
          health?: Database["public"]["CompositeTypes"]["jsonb"]
          height_cm?: number | null
          height_note?: string | null
          id?: string
          is_deceased?: boolean
          is_veteran?: boolean
          litters_count?: number | null
          litters_note?: string | null
          mating_count?: number | null
          name?: string
          note?: string | null
          other_exams?: string | null
          owner_address?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_web?: string | null
          pedigree_url?: string | null
          profile_image_url?: string | null
          published?: boolean
          sex?: Database["public"]["Enums"]["dog_sex"]
          short_note?: string | null
          sire_name?: string | null
          slug?: string | null
          spkp?: number | null
          updated_at?: string
          weight_kg?: number | null
          weight_note?: string | null
        }
        Relationships: []
      }
      leonberger_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_profile: boolean
          leonberger_id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_profile?: boolean
          leonberger_id: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_profile?: boolean
          leonberger_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "leonberger_images_leonberger_id_fkey"
            columns: ["leonberger_id"]
            isOneToOne: false
            referencedRelation: "leonbergers"
            referencedColumns: ["id"]
          },
        ]
      }
      navbar_images: {
        Row: {
          alt: string | null
          created_at: string
          enabled: boolean
          id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      pages: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          leonberger_list_mode: string | null
          meta_description: string | null
          meta_title: string | null
          parent_page_id: string | null
          published: boolean
          section_id: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          leonberger_list_mode?: string | null
          meta_description?: string | null
          meta_title?: string | null
          parent_page_id?: string | null
          published?: boolean
          section_id?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          leonberger_list_mode?: string | null
          meta_description?: string | null
          meta_title?: string | null
          parent_page_id?: string | null
          published?: boolean
          section_id?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_parent_page_id_fkey"
            columns: ["parent_page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          page_id: string
          published: boolean
          published_date: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          page_id: string
          published?: boolean
          published_date?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          page_id?: string
          published?: boolean
          published_date?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Database["public"]["CompositeTypes"]["jsonb"]
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Database["public"]["CompositeTypes"]["jsonb"]
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Database["public"]["CompositeTypes"]["jsonb"]
        }
        Relationships: []
      }
      show_results: {
        Row: {
          created_at: string
          date: string
          gallery_url: string | null
          id: string
          judge: string | null
          page_id: string
          place: string | null
          results_file_storage_path: string | null
          results_file_url: string | null
          results_text: string | null
          show_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          gallery_url?: string | null
          id?: string
          judge?: string | null
          page_id: string
          place?: string | null
          results_file_storage_path?: string | null
          results_file_url?: string | null
          results_text?: string | null
          show_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          gallery_url?: string | null
          id?: string
          judge?: string | null
          page_id?: string
          place?: string | null
          results_file_storage_path?: string | null
          results_file_url?: string | null
          results_text?: string | null
          show_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "show_results_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          page_id: string
          place: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          page_id: string
          place?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          page_id?: string
          place?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      mating_sheet_puppies: {
        Row: {
          created_at: string
          exterior_note: string | null
          external_url: string | null
          id: string
          kennel_name: string | null
          name: string
          photo_storage_path: string | null
          photo_url: string | null
          sheet_id: string
          sex: Database["public"]["Enums"]["dog_sex"]
          sort_order: number
          spkp_number: number | null
        }
        Insert: {
          created_at?: string
          exterior_note?: string | null
          external_url?: string | null
          id?: string
          kennel_name?: string | null
          name: string
          photo_storage_path?: string | null
          photo_url?: string | null
          sheet_id: string
          sex: Database["public"]["Enums"]["dog_sex"]
          sort_order?: number
          spkp_number?: number | null
        }
        Update: {
          created_at?: string
          exterior_note?: string | null
          external_url?: string | null
          id?: string
          kennel_name?: string | null
          name?: string
          photo_storage_path?: string | null
          photo_url?: string | null
          sheet_id?: string
          sex?: Database["public"]["Enums"]["dog_sex"]
          sort_order?: number
          spkp_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mating_sheet_puppies_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "mating_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      mating_sheet_sires: {
        Row: {
          country: string | null
          created_at: string
          external_url: string | null
          id: string
          is_used: boolean
          sheet_id: string
          sire_name: string
          sort_order: number
        }
        Insert: {
          country?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          is_used?: boolean
          sheet_id: string
          sire_name: string
          sort_order?: number
        }
        Update: {
          country?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          is_used?: boolean
          sheet_id?: string
          sire_name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "mating_sheet_sires_sheet_id_fkey"
            columns: ["sheet_id"]
            isOneToOne: false
            referencedRelation: "mating_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      kennels: {
        Row: {
          address: string | null
          breeder_name: string | null
          city: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          kennel_name: string
          phone: string | null
          published: boolean
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          breeder_name?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          kennel_name: string
          phone?: string | null
          published?: boolean
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          breeder_name?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          kennel_name?: string
          phone?: string | null
          published?: boolean
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      footer_links: {
        Row: {
          alt: string | null
          created_at: string
          enabled: boolean
          href: string
          id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          enabled?: boolean
          href: string
          id?: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          enabled?: boolean
          href?: string
          id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          photo_storage_path: string | null
          photo_url: string | null
          position_title: string
          published: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          position_title: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          photo_storage_path?: string | null
          photo_url?: string | null
          position_title?: string
          published?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      mating_sheets: {
        Row: {
          archived_in_overview: boolean
          breeder_name: string
          created_at: string
          created_by: string | null
          dam_leonberger_id: string | null
          dam_name_fallback: string | null
          id: string
          issue_date: string | null
          kennel_name: string
          litter_check_date: string | null
          litter_check_done: boolean
          mating_date: string | null
          outcome: Database["public"]["Enums"]["mating_outcome"]
          outcome_date: string | null
          pregnancy_confirmed: boolean
          pregnancy_confirmed_date: string | null
          published: boolean
          sheet_number: number
          sheet_year: number
          updated_at: string
        }
        Insert: {
          archived_in_overview?: boolean
          breeder_name: string
          created_at?: string
          created_by?: string | null
          dam_leonberger_id?: string | null
          dam_name_fallback?: string | null
          id?: string
          issue_date?: string | null
          kennel_name: string
          litter_check_date?: string | null
          litter_check_done?: boolean
          mating_date?: string | null
          outcome?: Database["public"]["Enums"]["mating_outcome"]
          outcome_date?: string | null
          pregnancy_confirmed?: boolean
          pregnancy_confirmed_date?: string | null
          published?: boolean
          sheet_number: number
          sheet_year: number
          updated_at?: string
        }
        Update: {
          archived_in_overview?: boolean
          breeder_name?: string
          created_at?: string
          created_by?: string | null
          dam_leonberger_id?: string | null
          dam_name_fallback?: string | null
          id?: string
          issue_date?: string | null
          kennel_name?: string
          litter_check_date?: string | null
          litter_check_done?: boolean
          mating_date?: string | null
          outcome?: Database["public"]["Enums"]["mating_outcome"]
          outcome_date?: string | null
          pregnancy_confirmed?: boolean
          pregnancy_confirmed_date?: string | null
          published?: boolean
          sheet_number?: number
          sheet_year?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mating_sheets_dam_leonberger_id_fkey"
            columns: ["dam_leonberger_id"]
            isOneToOne: false
            referencedRelation: "leonbergers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: {
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      dog_sex: "pes" | "suka"
      mating_outcome: "unknown" | "born" | "not_pregnant" | "lost"
    }
    CompositeTypes: {
      jsonb: Json
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
      app_role: ["admin", "user"],
      dog_sex: ["pes", "suka"],
      mating_outcome: ["unknown", "born", "not_pregnant", "lost"],
    },
  },
} as const

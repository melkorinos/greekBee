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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      community_leksiarxeio_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: number
          status: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
        }
        Relationships: []
      }
      community_leksindeseis_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: number
          status: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
        }
        Relationships: []
      }
      community_stavrolekso_puzzles: {
        Row: {
          created_at: string
          data: Json
          edit_pin: string
          id: number
          status: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name: string
          title: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          edit_pin: string
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          edit_pin?: string
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
          title?: string | null
        }
        Relationships: []
      }
      community_vrestifrasi_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: number
          status: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          status?: Database["public"]["Enums"]["community_puzzle_status"]
          submitter_name?: string
        }
        Relationships: []
      }
      game_scores: {
        Row: {
          data: Json
          device_id: string
          display_name: string
          game_id: string
          id: number
          is_perfect: boolean
          puzzle_date: string
          score: number
        }
        Insert: {
          data?: Json
          device_id: string
          display_name?: string
          game_id: string
          id?: number
          is_perfect?: boolean
          puzzle_date: string
          score: number
        }
        Update: {
          data?: Json
          device_id?: string
          display_name?: string
          game_id?: string
          id?: number
          is_perfect?: boolean
          puzzle_date?: string
          score?: number
        }
        Relationships: []
      }
      game_state: {
        Row: {
          device_uuid: string
          game_id: string
          id: number
          puzzle_date: string
          state: Json
          updated_at: string
        }
        Insert: {
          device_uuid: string
          game_id: string
          id?: number
          puzzle_date: string
          state?: Json
          updated_at?: string
        }
        Update: {
          device_uuid?: string
          game_id?: string
          id?: number
          puzzle_date?: string
          state?: Json
          updated_at?: string
        }
        Relationships: []
      }
      identity_audit: {
        Row: {
          at: string
          auth_user_id: string
          device_uuid: string
          id: number
        }
        Insert: {
          at?: string
          auth_user_id: string
          device_uuid: string
          id?: never
        }
        Update: {
          at?: string
          auth_user_id?: string
          device_uuid?: string
          id?: never
        }
        Relationships: []
      }
      nomination_votes: {
        Row: {
          created_at: string
          device_id: string
          id: string
          nomination_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          nomination_id: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          nomination_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "nomination_votes_nomination_id_fkey"
            columns: ["nomination_id"]
            isOneToOne: false
            referencedRelation: "nominations"
            referencedColumns: ["id"]
          },
        ]
      }
      nominations: {
        Row: {
          created_at: string
          device_id: string
          direction: string
          id: string
          note: string | null
          player_name: string | null
          reviewed_at: string | null
          status: string
          word: string
        }
        Insert: {
          created_at?: string
          device_id: string
          direction?: string
          id?: string
          note?: string | null
          player_name?: string | null
          reviewed_at?: string | null
          status?: string
          word: string
        }
        Update: {
          created_at?: string
          device_id?: string
          direction?: string
          id?: string
          note?: string | null
          player_name?: string | null
          reviewed_at?: string | null
          status?: string
          word?: string
        }
        Relationships: []
      }
      player_achievements: {
        Row: {
          achievement_id: string
          device_uuid: string
          earned_at: string
          id: number
        }
        Insert: {
          achievement_id: string
          device_uuid: string
          earned_at?: string
          id?: never
        }
        Update: {
          achievement_id?: string
          device_uuid?: string
          earned_at?: string
          id?: never
        }
        Relationships: []
      }
      player_pangrams: {
        Row: {
          device_uuid: string
          found_at: string
          id: number
          puzzle_date: string
          word: string
        }
        Insert: {
          device_uuid: string
          found_at?: string
          id?: never
          puzzle_date: string
          word: string
        }
        Update: {
          device_uuid?: string
          found_at?: string
          id?: never
          puzzle_date?: string
          word?: string
        }
        Relationships: []
      }
      player_profiles: {
        Row: {
          auth_user_id: string | null
          created_at: string
          device_uuid: string
          display_name: string
          id: number
          last_active: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          device_uuid: string
          display_name: string
          id?: number
          last_active?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          device_uuid?: string
          display_name?: string
          id?: number
          last_active?: string
        }
        Relationships: []
      }
      player_words: {
        Row: {
          created_at: string
          device_uuid: string
          game_id: string
          id: number
          length: number
          puzzle_date: string
          word: string
        }
        Insert: {
          created_at?: string
          device_uuid: string
          game_id?: string
          id?: never
          length: number
          puzzle_date: string
          word: string
        }
        Update: {
          created_at?: string
          device_uuid?: string
          game_id?: string
          id?: never
          length?: number
          puzzle_date?: string
          word?: string
        }
        Relationships: []
      }
      transfer_codes: {
        Row: {
          code: string
          created_at: string
          device_uuid: string
          expires_at: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          device_uuid: string
          expires_at?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          device_uuid?: string
          expires_at?: string
          used?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      player_words_by_length: {
        Args: { p_device_uuid: string }
        Returns: { length: number; count: number }[]
      }
    }
    Enums: {
      community_puzzle_status: "pending" | "approved"
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
      community_puzzle_status: ["pending", "approved"],
    },
  },
} as const

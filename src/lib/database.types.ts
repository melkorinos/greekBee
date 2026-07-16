export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
          status: string
          submitter_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          status?: string
          submitter_name?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          status?: string
          submitter_name?: string
        }
        Relationships: []
      }
      community_leksindeseis_puzzles: {
        Row: {
          created_at: string
          data: Json
          id: number
          status: string
          submitter_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          status?: string
          submitter_name?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          status?: string
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
          status: string
          submitter_name: string
          title: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          edit_pin: string
          id?: number
          status?: string
          submitter_name?: string
          title?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          edit_pin?: string
          id?: number
          status?: string
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
          status: string
          submitter_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: number
          status?: string
          submitter_name?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          status?: string
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
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

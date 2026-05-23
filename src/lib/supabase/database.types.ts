export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      backlog_items: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backlog_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "backlog_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          current_progress: number
          joined_at: string
          member_id: string
        }
        Insert: {
          challenge_id: string
          current_progress?: number
          joined_at?: string
          member_id: string
        }
        Update: {
          challenge_id?: string
          current_progress?: number
          joined_at?: string
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "challenge_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          description: string | null
          ends_at: string
          goal_metric: string | null
          goal_target: number | null
          id: string
          name: string
          reward_text: string | null
          slug: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ends_at: string
          goal_metric?: string | null
          goal_target?: number | null
          id?: string
          name: string
          reward_text?: string | null
          slug: string
          starts_at: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ends_at?: string
          goal_metric?: string | null
          goal_target?: number | null
          id?: string
          name?: string
          reward_text?: string | null
          slug?: string
          starts_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          last_message_at: string | null
          member_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          member_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "conversations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "conversations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string | null
          created_at: string
          cue: string | null
          cues: Json
          demo_asset_url: string | null
          difficulty: string | null
          display_order: number
          equipment: string | null
          id: string
          is_published: boolean
          mistakes: Json
          name: string
          pattern: string | null
          phases: Json
          primary_muscle: string | null
          primary_muscles: string[]
          progression: string | null
          regression: string | null
          secondary_muscles: string[]
          setup: string | null
          slug: string
          tertiary_muscles: string[]
          thumbnail_url: string | null
          video_url: string | null
          why_matters: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          cue?: string | null
          cues?: Json
          demo_asset_url?: string | null
          difficulty?: string | null
          display_order?: number
          equipment?: string | null
          id?: string
          is_published?: boolean
          mistakes?: Json
          name: string
          pattern?: string | null
          phases?: Json
          primary_muscle?: string | null
          primary_muscles?: string[]
          progression?: string | null
          regression?: string | null
          secondary_muscles?: string[]
          setup?: string | null
          slug: string
          tertiary_muscles?: string[]
          thumbnail_url?: string | null
          video_url?: string | null
          why_matters?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          cue?: string | null
          cues?: Json
          demo_asset_url?: string | null
          difficulty?: string | null
          display_order?: number
          equipment?: string | null
          id?: string
          is_published?: boolean
          mistakes?: Json
          name?: string
          pattern?: string | null
          phases?: Json
          primary_muscle?: string | null
          primary_muscles?: string[]
          progression?: string | null
          regression?: string | null
          secondary_muscles?: string[]
          setup?: string | null
          slug?: string
          tertiary_muscles?: string[]
          thumbnail_url?: string | null
          video_url?: string | null
          why_matters?: string | null
        }
        Relationships: []
      }
      form_checks: {
        Row: {
          ai_fix: string | null
          ai_headline: string | null
          ai_neg: Json | null
          ai_pos: Json | null
          ai_score: number | null
          coach_notes: string | null
          coach_reviewed_at: string | null
          coach_reviewed_by: string | null
          created_at: string
          exercise_id: string | null
          exercise_name: string | null
          id: string
          member_id: string
          video_url: string | null
        }
        Insert: {
          ai_fix?: string | null
          ai_headline?: string | null
          ai_neg?: Json | null
          ai_pos?: Json | null
          ai_score?: number | null
          coach_notes?: string | null
          coach_reviewed_at?: string | null
          coach_reviewed_by?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string | null
          id?: string
          member_id: string
          video_url?: string | null
        }
        Update: {
          ai_fix?: string | null
          ai_headline?: string | null
          ai_neg?: Json | null
          ai_pos?: Json | null
          ai_score?: number | null
          coach_notes?: string | null
          coach_reviewed_at?: string | null
          coach_reviewed_by?: string | null
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string | null
          id?: string
          member_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_checks_coach_reviewed_by_fkey"
            columns: ["coach_reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "form_checks_coach_reviewed_by_fkey"
            columns: ["coach_reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_checks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_checks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "form_checks_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_alerts: {
        Row: {
          coach_note_text: string | null
          conditions_met: Json
          id: string
          member_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          session_modifier_id: string | null
          status: string
          triggered_at: string | null
        }
        Insert: {
          coach_note_text?: string | null
          conditions_met: Json
          id?: string
          member_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_modifier_id?: string | null
          status?: string
          triggered_at?: string | null
        }
        Update: {
          coach_note_text?: string | null
          conditions_met?: Json
          id?: string
          member_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          session_modifier_id?: string | null
          status?: string
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hrv_alerts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_alerts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_alerts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_alerts_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_alerts_session_modifier_id_fkey"
            columns: ["session_modifier_id"]
            isOneToOne: false
            referencedRelation: "hrv_session_modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_lifestyle_logs: {
        Row: {
          event_type: string
          id: string
          inserted_at: string | null
          logged_for_date: string
          member_id: string
          value: Json
        }
        Insert: {
          event_type: string
          id?: string
          inserted_at?: string | null
          logged_for_date: string
          member_id: string
          value: Json
        }
        Update: {
          event_type?: string
          id?: string
          inserted_at?: string | null
          logged_for_date?: string
          member_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "hrv_lifestyle_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_lifestyle_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_readings: {
        Row: {
          baseline_60d_mean_lnrmssd: number | null
          baseline_60d_swc: number | null
          confidence: string
          connection_id: string | null
          cycle_phase: string | null
          id: string
          inserted_at: string | null
          is_sick: boolean | null
          ln_rmssd: number
          mean_hr_bpm: number | null
          measured_at: string
          member_id: string
          provider_recorded_at: string | null
          quality_warnings: Json | null
          readiness_bucket: string | null
          resting_hr_bpm: number | null
          rmssd_ms: number
          rolling_7d_mean_lnrmssd: number | null
          rr_intervals: Json | null
          source: string
          timezone: string | null
          warm_up_state: string
        }
        Insert: {
          baseline_60d_mean_lnrmssd?: number | null
          baseline_60d_swc?: number | null
          confidence: string
          connection_id?: string | null
          cycle_phase?: string | null
          id?: string
          inserted_at?: string | null
          is_sick?: boolean | null
          ln_rmssd: number
          mean_hr_bpm?: number | null
          measured_at: string
          member_id: string
          provider_recorded_at?: string | null
          quality_warnings?: Json | null
          readiness_bucket?: string | null
          resting_hr_bpm?: number | null
          rmssd_ms: number
          rolling_7d_mean_lnrmssd?: number | null
          rr_intervals?: Json | null
          source: string
          timezone?: string | null
          warm_up_state: string
        }
        Update: {
          baseline_60d_mean_lnrmssd?: number | null
          baseline_60d_swc?: number | null
          confidence?: string
          connection_id?: string | null
          cycle_phase?: string | null
          id?: string
          inserted_at?: string | null
          is_sick?: boolean | null
          ln_rmssd?: number
          mean_hr_bpm?: number | null
          measured_at?: string
          member_id?: string
          provider_recorded_at?: string | null
          quality_warnings?: Json | null
          readiness_bucket?: string | null
          resting_hr_bpm?: number | null
          rmssd_ms?: number
          rolling_7d_mean_lnrmssd?: number | null
          rr_intervals?: Json | null
          source?: string
          timezone?: string | null
          warm_up_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "hrv_readings_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "hrv_wearable_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_readings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_readings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_session_modifiers: {
        Row: {
          accepted_by_member: boolean | null
          applied_value: Json | null
          created_at: string | null
          id: string
          member_id: string
          modifier_type: string
          program_id: string | null
          reason: string
          session_id: string | null
        }
        Insert: {
          accepted_by_member?: boolean | null
          applied_value?: Json | null
          created_at?: string | null
          id?: string
          member_id: string
          modifier_type: string
          program_id?: string | null
          reason: string
          session_id?: string | null
        }
        Update: {
          accepted_by_member?: boolean | null
          applied_value?: Json | null
          created_at?: string | null
          id?: string
          member_id?: string
          modifier_type?: string
          program_id?: string | null
          reason?: string
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hrv_session_modifiers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_session_modifiers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_session_modifiers_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hrv_session_modifiers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_settings: {
        Row: {
          cycle_tracking_enabled: boolean | null
          inserted_at: string | null
          member_id: string
          session_suggestion_enabled: boolean | null
          share_to_coach: boolean | null
          updated_at: string | null
        }
        Insert: {
          cycle_tracking_enabled?: boolean | null
          inserted_at?: string | null
          member_id: string
          session_suggestion_enabled?: boolean | null
          share_to_coach?: boolean | null
          updated_at?: string | null
        }
        Update: {
          cycle_tracking_enabled?: boolean | null
          inserted_at?: string | null
          member_id?: string
          session_suggestion_enabled?: boolean | null
          share_to_coach?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hrv_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_settings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_streak_events: {
        Row: {
          id: string
          member_id: string
          milestone: number
          reps_awarded: number
          seen_at: string | null
          triggered_at: string | null
        }
        Insert: {
          id?: string
          member_id: string
          milestone: number
          reps_awarded: number
          seen_at?: string | null
          triggered_at?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          milestone?: number
          reps_awarded?: number
          seen_at?: string | null
          triggered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hrv_streak_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_streak_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_wearable_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          id: string
          is_primary: boolean
          last_synced_at: string | null
          member_id: string
          provider: string
          provider_user_id: string | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          id?: string
          is_primary?: boolean
          last_synced_at?: string | null
          member_id: string
          provider: string
          provider_user_id?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          id?: string
          is_primary?: boolean
          last_synced_at?: string | null
          member_id?: string
          provider?: string
          provider_user_id?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hrv_wearable_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_wearable_connections_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      hrv_weekly_insights: {
        Row: {
          claude_model_id: string
          correlation_cards: Json
          generated_at: string | null
          id: string
          member_id: string
          summary_text: string
          tokens_used: number | null
          week_start: string
        }
        Insert: {
          claude_model_id: string
          correlation_cards: Json
          generated_at?: string | null
          id?: string
          member_id: string
          summary_text: string
          tokens_used?: number | null
          week_start: string
        }
        Update: {
          claude_model_id?: string
          correlation_cards?: Json
          generated_at?: string | null
          id?: string
          member_id?: string
          summary_text?: string
          tokens_used?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "hrv_weekly_insights_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "hrv_weekly_insights_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          max_uses: number
          note: string | null
          used_at: string | null
          used_by: string | null
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          max_uses?: number
          note?: string | null
          used_at?: string | null
          used_by?: string | null
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          max_uses?: number
          note?: string | null
          used_at?: string | null
          used_by?: string | null
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "invite_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "invite_codes_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_image_cache: {
        Row: {
          attribution_name: string
          attribution_url: string
          cached_at: string
          source: string
          thumb_url: string
          title_normalized: string
          url: string
        }
        Insert: {
          attribution_name: string
          attribution_url: string
          cached_at?: string
          source?: string
          thumb_url: string
          title_normalized: string
          url: string
        }
        Update: {
          attribution_name?: string
          attribution_url?: string
          cached_at?: string
          source?: string
          thumb_url?: string
          title_normalized?: string
          url?: string
        }
        Relationships: []
      }
      member_action_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          member_id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          member_id: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          member_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "member_action_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_action_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          equipment_level: string | null
          experience_level: string | null
          goal_focus: string | null
          handle: string
          id: string
          is_admin: boolean
          is_coach: boolean
          joined_at: string
          locale: string
          max_bench_kg: number | null
          max_deadlift_kg: number | null
          max_ohp_kg: number | null
          max_squat_kg: number | null
          notes_injuries: string | null
          notif_digest: boolean
          notif_form_check_review: boolean
          notif_mention: boolean
          notif_tier_up: boolean
          onboarded_at: string | null
          stripe_customer_id: string | null
          tier: string
          updated_at: string
          weekly_frequency: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          equipment_level?: string | null
          experience_level?: string | null
          goal_focus?: string | null
          handle: string
          id: string
          is_admin?: boolean
          is_coach?: boolean
          joined_at?: string
          locale?: string
          max_bench_kg?: number | null
          max_deadlift_kg?: number | null
          max_ohp_kg?: number | null
          max_squat_kg?: number | null
          notes_injuries?: string | null
          notif_digest?: boolean
          notif_form_check_review?: boolean
          notif_mention?: boolean
          notif_tier_up?: boolean
          onboarded_at?: string | null
          stripe_customer_id?: string | null
          tier?: string
          updated_at?: string
          weekly_frequency?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          equipment_level?: string | null
          experience_level?: string | null
          goal_focus?: string | null
          handle?: string
          id?: string
          is_admin?: boolean
          is_coach?: boolean
          joined_at?: string
          locale?: string
          max_bench_kg?: number | null
          max_deadlift_kg?: number | null
          max_ohp_kg?: number | null
          max_squat_kg?: number | null
          notes_injuries?: string | null
          notif_digest?: boolean
          notif_form_check_review?: boolean
          notif_mention?: boolean
          notif_tier_up?: boolean
          onboarded_at?: string | null
          stripe_customer_id?: string | null
          tier?: string
          updated_at?: string
          weekly_frequency?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          kind: string
          media_duration_sec: number | null
          media_mime: string | null
          media_path: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          kind: string
          media_duration_sec?: number | null
          media_mime?: string | null
          media_path?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          kind?: string
          media_duration_sec?: number | null
          media_mime?: string | null
          media_path?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_logs: {
        Row: {
          ai_headline: string | null
          ai_notes: string | null
          created_at: string
          graded_at: string | null
          id: string
          kcal: number | null
          logged_for_date: string
          logged_for_slot: string | null
          match_score: number | null
          meal_id: string | null
          member_id: string
          notes: string | null
          off_plan: boolean
          photo_path: string | null
          protein_estimate: string | null
          protein_g: number | null
          rating: number | null
          status: string
        }
        Insert: {
          ai_headline?: string | null
          ai_notes?: string | null
          created_at?: string
          graded_at?: string | null
          id?: string
          kcal?: number | null
          logged_for_date: string
          logged_for_slot?: string | null
          match_score?: number | null
          meal_id?: string | null
          member_id: string
          notes?: string | null
          off_plan?: boolean
          photo_path?: string | null
          protein_estimate?: string | null
          protein_g?: number | null
          rating?: number | null
          status?: string
        }
        Update: {
          ai_headline?: string | null
          ai_notes?: string | null
          created_at?: string
          graded_at?: string | null
          id?: string
          kcal?: number | null
          logged_for_date?: string
          logged_for_slot?: string | null
          match_score?: number | null
          meal_id?: string | null
          member_id?: string
          notes?: string | null
          off_plan?: boolean
          photo_path?: string | null
          protein_estimate?: string | null
          protein_g?: number | null
          rating?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "nutrition_meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "nutrition_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_meals: {
        Row: {
          carb_density: string
          created_at: string
          day_index: number
          description: string | null
          est_carbs_g: number | null
          est_fat_g: number | null
          est_kcal: number | null
          est_protein_g: number | null
          id: string
          image_attribution_name: string | null
          image_attribution_url: string | null
          image_thumb_url: string | null
          image_url: string | null
          ingredients: Json
          kind: string
          plan_id: string
          position: number
          prep_minutes: number | null
          slot: string
          steps: Json
          swappable: boolean
          title: string
        }
        Insert: {
          carb_density?: string
          created_at?: string
          day_index: number
          description?: string | null
          est_carbs_g?: number | null
          est_fat_g?: number | null
          est_kcal?: number | null
          est_protein_g?: number | null
          id?: string
          image_attribution_name?: string | null
          image_attribution_url?: string | null
          image_thumb_url?: string | null
          image_url?: string | null
          ingredients?: Json
          kind?: string
          plan_id: string
          position?: number
          prep_minutes?: number | null
          slot: string
          steps?: Json
          swappable?: boolean
          title: string
        }
        Update: {
          carb_density?: string
          created_at?: string
          day_index?: number
          description?: string | null
          est_carbs_g?: number | null
          est_fat_g?: number | null
          est_kcal?: number | null
          est_protein_g?: number | null
          id?: string
          image_attribution_name?: string | null
          image_attribution_url?: string | null
          image_thumb_url?: string | null
          image_url?: string | null
          ingredients?: Json
          kind?: string
          plan_id?: string
          position?: number
          prep_minutes?: number | null
          slot?: string
          steps?: Json
          swappable?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_meals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          archived_at: string | null
          daily_carbs_g: number | null
          daily_fat_g: number | null
          daily_kcal: number | null
          daily_protein_g: number | null
          generated_at: string
          generator: string
          generator_model: string | null
          id: string
          member_id: string
          notes: string | null
          updated_at: string
          week_start: string
        }
        Insert: {
          archived_at?: string | null
          daily_carbs_g?: number | null
          daily_fat_g?: number | null
          daily_kcal?: number | null
          daily_protein_g?: number | null
          generated_at?: string
          generator?: string
          generator_model?: string | null
          id?: string
          member_id: string
          notes?: string | null
          updated_at?: string
          week_start: string
        }
        Update: {
          archived_at?: string | null
          daily_carbs_g?: number | null
          daily_fat_g?: number | null
          daily_kcal?: number | null
          daily_protein_g?: number | null
          generated_at?: string
          generator?: string
          generator_model?: string | null
          id?: string
          member_id?: string
          notes?: string | null
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "nutrition_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_profiles: {
        Row: {
          allergies: string[]
          budget_level: string
          cook_days: string[]
          cooking_level: string
          created_at: string
          daily_kcal_target: number | null
          daily_protein_g_target: number | null
          diet: string
          dislikes: string[]
          fish_per_week: number
          goal: string
          household_size: number
          meal_prep_mode: boolean
          meals_per_day: number
          member_id: string
          preferences: string[]
          updated_at: string
        }
        Insert: {
          allergies?: string[]
          budget_level?: string
          cook_days?: string[]
          cooking_level?: string
          created_at?: string
          daily_kcal_target?: number | null
          daily_protein_g_target?: number | null
          diet?: string
          dislikes?: string[]
          fish_per_week?: number
          goal?: string
          household_size?: number
          meal_prep_mode?: boolean
          meals_per_day?: number
          member_id: string
          preferences?: string[]
          updated_at?: string
        }
        Update: {
          allergies?: string[]
          budget_level?: string
          cook_days?: string[]
          cooking_level?: string
          created_at?: string
          daily_kcal_target?: number | null
          daily_protein_g_target?: number | null
          diet?: string
          dislikes?: string[]
          fish_per_week?: number
          goal?: string
          household_size?: number
          meal_prep_mode?: boolean
          meals_per_day?: number
          member_id?: string
          preferences?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "nutrition_profiles_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_skip_days: {
        Row: {
          created_at: string
          id: string
          member_id: string
          reason: string | null
          skip_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          reason?: string | null
          skip_date: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          reason?: string | null
          skip_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_skip_days_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "nutrition_skip_days_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          member_id: string
          post_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          member_id: string
          post_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          member_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "post_comments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          member_id: string
          post_id: string
        }
        Insert: {
          created_at?: string
          member_id: string
          post_id: string
        }
        Update: {
          created_at?: string
          member_id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "post_reactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          form_check_id: string | null
          id: string
          is_pr: boolean
          member_id: string
          tag: string | null
        }
        Insert: {
          content: string
          created_at?: string
          form_check_id?: string | null
          id?: string
          is_pr?: boolean
          member_id: string
          tag?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          form_check_id?: string | null
          id?: string
          is_pr?: boolean
          member_id?: string
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "posts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      program_assignments: {
        Row: {
          completed_at: string | null
          current_week: number
          id: string
          member_id: string
          program_id: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          current_week?: number
          id?: string
          member_id: string
          program_id: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          current_week?: number
          id?: string
          member_id?: string
          program_id?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "program_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_assignments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_day_exercises: {
        Row: {
          created_at: string
          cue: string | null
          exercise_id: string | null
          exercise_name: string
          id: string
          position: number
          program_day_id: string
          sets: Json
        }
        Insert: {
          created_at?: string
          cue?: string | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          position: number
          program_day_id: string
          sets?: Json
        }
        Update: {
          created_at?: string
          cue?: string | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          position?: number
          program_day_id?: string
          sets?: Json
        }
        Relationships: [
          {
            foreignKeyName: "program_day_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_day_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      program_days: {
        Row: {
          created_at: string
          day_label: string
          estimated_minutes: number | null
          id: string
          position: number
          program_id: string
          title: string
        }
        Insert: {
          created_at?: string
          day_label: string
          estimated_minutes?: number | null
          id?: string
          position: number
          program_id: string
          title: string
        }
        Update: {
          created_at?: string
          day_label?: string
          estimated_minutes?: number | null
          id?: string
          position?: number
          program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          coach_id: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          level: string | null
          name: string
          type: string
          weeks: number
        }
        Insert: {
          coach_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          name: string
          type: string
          weeks: number
        }
        Update: {
          coach_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          level?: string | null
          name?: string
          type?: string
          weeks?: number
        }
        Relationships: [
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "programs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          member_id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          member_id: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          member_id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "push_subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reps_transactions: {
        Row: {
          created_at: string
          delta: number
          id: string
          member_id: string
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          member_id: string
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          member_id?: string
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reps_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reps_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          cost_reps: number
          fulfilled_at: string | null
          fulfilled_by: string | null
          fulfillment_notes: string | null
          id: string
          member_id: string
          redeemed_at: string
          reward_id: string
          reward_name_snapshot: string
          status: string
        }
        Insert: {
          cost_reps: number
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          id?: string
          member_id: string
          redeemed_at?: string
          reward_id: string
          reward_name_snapshot: string
          status?: string
        }
        Update: {
          cost_reps?: number
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          fulfillment_notes?: string | null
          id?: string
          member_id?: string
          redeemed_at?: string
          reward_id?: string
          reward_name_snapshot?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reward_redemptions_fulfilled_by_fkey"
            columns: ["fulfilled_by"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "reward_redemptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          cost_reps: number
          created_at: string
          description: string | null
          drop_at: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: string
          name: string
          slug: string
          stock: number | null
        }
        Insert: {
          cost_reps: number
          created_at?: string
          description?: string | null
          drop_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind: string
          name: string
          slug: string
          stock?: number | null
        }
        Update: {
          cost_reps?: number
          created_at?: string
          description?: string | null
          drop_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: string
          name?: string
          slug?: string
          stock?: number | null
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          cue: string | null
          exercise_id: string | null
          exercise_name: string
          id: string
          position: number
          session_id: string
        }
        Insert: {
          cue?: string | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          position: number
          session_id: string
        }
        Update: {
          cue?: string | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          position?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_sets: {
        Row: {
          id: string
          logged_at: string | null
          logged_reps: number | null
          logged_rpe: number | null
          logged_weight: number | null
          position: number
          rest_sec: number | null
          session_exercise_id: string
          target_reps: number | null
          target_rpe: number | null
          target_weight: number | null
        }
        Insert: {
          id?: string
          logged_at?: string | null
          logged_reps?: number | null
          logged_rpe?: number | null
          logged_weight?: number | null
          position: number
          rest_sec?: number | null
          session_exercise_id: string
          target_reps?: number | null
          target_rpe?: number | null
          target_weight?: number | null
        }
        Update: {
          id?: string
          logged_at?: string | null
          logged_reps?: number | null
          logged_rpe?: number | null
          logged_weight?: number | null
          position?: number
          rest_sec?: number | null
          session_exercise_id?: string
          target_reps?: number | null
          target_rpe?: number | null
          target_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_sets_session_exercise_id_fkey"
            columns: ["session_exercise_id"]
            isOneToOne: false
            referencedRelation: "session_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          day_label: string | null
          estimated_minutes: number | null
          id: string
          member_id: string
          program_id: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          title: string
          week: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_label?: string | null
          estimated_minutes?: number | null
          id?: string
          member_id: string
          program_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          title: string
          week?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_label?: string | null
          estimated_minutes?: number | null
          id?: string
          member_id?: string
          program_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          title?: string
          week?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "sessions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          id: string
          member_id: string
          product_kind: string
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          member_id: string
          product_kind: string
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          id?: string
          member_id?: string
          product_kind?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_events: {
        Row: {
          balance_at: number
          created_at: string
          emailed_at: string | null
          from_tier: string
          id: string
          member_id: string
          promoted: boolean
          seen_at: string | null
          to_tier: string
        }
        Insert: {
          balance_at: number
          created_at?: string
          emailed_at?: string | null
          from_tier: string
          id?: string
          member_id: string
          promoted: boolean
          seen_at?: string | null
          to_tier: string
        }
        Update: {
          balance_at?: number
          created_at?: string
          emailed_at?: string | null
          from_tier?: string
          id?: string
          member_id?: string
          promoted?: boolean
          seen_at?: string | null
          to_tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "tier_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "tier_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      weight_logs: {
        Row: {
          id: string
          kg: number
          logged_at: string
          member_id: string
          notes: string | null
        }
        Insert: {
          id?: string
          kg: number
          logged_at?: string
          member_id: string
          notes?: string | null
        }
        Update: {
          id?: string
          kg?: number
          logged_at?: string
          member_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weight_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "weight_logs_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      member_active_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          current_period_end: string | null
          member_id: string | null
          product_kind: string | null
          status: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          member_id?: string | null
          product_kind?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          cancel_at_period_end?: boolean | null
          current_period_end?: string | null
          member_id?: string | null
          product_kind?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_reps_balance"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "subscriptions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_reps_balance: {
        Row: {
          balance: number | null
          member_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_session_reps: { Args: { p_session_id: string }; Returns: number }
      get_hrv_distinct_day_count: {
        Args: { p_member_id: string }
        Returns: number
      }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_current_user_coach: { Args: never; Returns: boolean }
      is_invite_valid: { Args: { p_code: string }; Returns: boolean }
      redeem_reward: { Args: { p_reward_id: string }; Returns: string }
      tier_for_balance: { Args: { balance: number }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const


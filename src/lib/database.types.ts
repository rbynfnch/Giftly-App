/**
 * Hand-written to match supabase/migrations/0001_init.sql.
 * Once the Supabase CLI is linked to the project, regenerate with:
 *   supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name: string
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      networks: {
        Row: {
          id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      network_members: {
        Row: {
          id: string
          network_id: string
          user_id: string
          role: 'owner' | 'member'
          created_at: string
        }
        Insert: {
          id?: string
          network_id: string
          user_id: string
          role?: 'owner' | 'member'
          created_at?: string
        }
        Update: {
          id?: string
          network_id?: string
          user_id?: string
          role?: 'owner' | 'member'
          created_at?: string
        }
        Relationships: []
      }
      groups: {
        Row: {
          id: string
          network_id: string
          name: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          network_id: string
          name: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          network_id?: string
          name?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          id: string
          network_id: string
          group_id: string | null
          created_by: string
          linked_user_id: string | null
          full_name: string
          relationship: string | null
          birthday: string | null
          notes: string | null
          avatar_url: string | null
          interests: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          network_id: string
          group_id?: string | null
          created_by: string
          linked_user_id?: string | null
          full_name: string
          relationship?: string | null
          birthday?: string | null
          notes?: string | null
          avatar_url?: string | null
          interests?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          network_id?: string
          group_id?: string | null
          created_by?: string
          linked_user_id?: string | null
          full_name?: string
          relationship?: string | null
          birthday?: string | null
          notes?: string | null
          avatar_url?: string | null
          interests?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      person_attributes: {
        Row: {
          id: string
          person_id: string
          category: string
          label: string
          value: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          person_id: string
          category?: string
          label: string
          value: string
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          person_id?: string
          category?: string
          label?: string
          value?: string
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          id: string
          network_id: string
          person_id: string
          created_by: string
          title: string
          status: 'idea' | 'planned' | 'purchased' | 'given'
          price: number | null
          url: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          network_id: string
          person_id: string
          created_by: string
          title: string
          status?: 'idea' | 'planned' | 'purchased' | 'given'
          price?: number | null
          url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          network_id?: string
          person_id?: string
          created_by?: string
          title?: string
          status?: 'idea' | 'planned' | 'purchased' | 'given'
          price?: number | null
          url?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      occasions: {
        Row: {
          id: string
          network_id: string
          name: string
          type: string
          date: string
          budget: number | null
          is_recurring_template: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          network_id: string
          name: string
          type?: string
          date: string
          budget?: number | null
          is_recurring_template?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          network_id?: string
          name?: string
          type?: string
          date?: string
          budget?: number | null
          is_recurring_template?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      occasion_participants: {
        Row: {
          id: string
          occasion_id: string
          person_id: string
          budget: number | null
          created_at: string
        }
        Insert: {
          id?: string
          occasion_id: string
          person_id: string
          budget?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          occasion_id?: string
          person_id?: string
          budget?: number | null
          created_at?: string
        }
        Relationships: []
      }
      occasion_group_budgets: {
        Row: {
          id: string
          occasion_id: string
          group_id: string
          budget: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          occasion_id: string
          group_id: string
          budget: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          occasion_id?: string
          group_id?: string
          budget?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}

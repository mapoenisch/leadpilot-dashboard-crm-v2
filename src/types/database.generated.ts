/* eslint-disable max-lines -- G45 (067B): maschinell erzeugte Supabase-Typen via `supabase gen types`, keine handgeschriebene Datei; Aufteilung würde Regeneration brechen. */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      companies: {
        Row: {
          city: string;
          created_at: string | null;
          domain: string;
          employee_count: number | null;
          id: string;
          industry: string;
          name: string;
          organization_id: string;
          postal_code: string;
        };
        Insert: {
          city: string;
          created_at?: string | null;
          domain: string;
          employee_count?: number | null;
          id: string;
          industry: string;
          name: string;
          organization_id: string;
          postal_code: string;
        };
        Update: {
          city?: string;
          created_at?: string | null;
          domain?: string;
          employee_count?: number | null;
          id?: string;
          industry?: string;
          name?: string;
          organization_id?: string;
          postal_code?: string;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          company_id: string;
          created_at: string | null;
          email: string;
          first_name: string;
          id: string;
          job_title: string;
          last_name: string;
          organization_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          email: string;
          first_name: string;
          id: string;
          job_title: string;
          last_name: string;
          organization_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          email?: string;
          first_name?: string;
          id?: string;
          job_title?: string;
          last_name?: string;
          organization_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contacts_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
        ];
      };
      imported_funnel_deals: {
        Row: {
          amount: number | null;
          close_date: string;
          created_at: string | null;
          deal_name: string;
          id: string;
          organization_id: string;
          pipeline: string;
          stage: string;
        };
        Insert: {
          amount?: number | null;
          close_date: string;
          created_at?: string | null;
          deal_name: string;
          id: string;
          organization_id: string;
          pipeline: string;
          stage: string;
        };
        Update: {
          amount?: number | null;
          close_date?: string;
          created_at?: string | null;
          deal_name?: string;
          id?: string;
          organization_id?: string;
          pipeline?: string;
          stage?: string;
        };
        Relationships: [];
      };
      live_kpi_events: {
        Row: {
          context: Json | null;
          contract_version: string;
          correlation_id: string;
          event_id: string;
          id: string;
          idempotency_key: string;
          ingested_at: string;
          kpi_id: string;
          occurred_at: string;
          provenance: string;
          quality_status: string;
          source_reference: string | null;
          source_system: string;
          unit: string;
          value: number;
        };
        Insert: {
          context?: Json | null;
          contract_version?: string;
          correlation_id: string;
          event_id: string;
          id?: string;
          idempotency_key: string;
          ingested_at?: string;
          kpi_id: string;
          occurred_at: string;
          provenance?: string;
          quality_status: string;
          source_reference?: string | null;
          source_system: string;
          unit: string;
          value: number;
        };
        Update: {
          context?: Json | null;
          contract_version?: string;
          correlation_id?: string;
          event_id?: string;
          id?: string;
          idempotency_key?: string;
          ingested_at?: string;
          kpi_id?: string;
          occurred_at?: string;
          provenance?: string;
          quality_status?: string;
          source_reference?: string | null;
          source_system?: string;
          unit?: string;
          value?: number;
        };
        Relationships: [];
      };
      live_kpi_public_feed: {
        Row: {
          id: string;
          ingested_at: string;
          kpi_id: string;
          occurred_at: string;
          quality_status: string;
          source_system: string;
          unit: string;
          value: number;
        };
        Insert: {
          id?: string;
          ingested_at: string;
          kpi_id: string;
          occurred_at: string;
          quality_status: string;
          source_system: string;
          unit: string;
          value: number;
        };
        Update: {
          id?: string;
          ingested_at?: string;
          kpi_id?: string;
          occurred_at?: string;
          quality_status?: string;
          source_system?: string;
          unit?: string;
          value?: number;
        };
        Relationships: [];
      };
      live_kpi_rejections: {
        Row: {
          correlation_id: string | null;
          error_code: string;
          error_message: string;
          event_id: string | null;
          id: string;
          rejected_at: string;
          sanitized_context: Json | null;
          source_system: string | null;
        };
        Insert: {
          correlation_id?: string | null;
          error_code: string;
          error_message: string;
          event_id?: string | null;
          id?: string;
          rejected_at?: string;
          sanitized_context?: Json | null;
          source_system?: string | null;
        };
        Update: {
          correlation_id?: string | null;
          error_code?: string;
          error_message?: string;
          event_id?: string | null;
          id?: string;
          rejected_at?: string;
          sanitized_context?: Json | null;
          source_system?: string | null;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          created_at: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          organization_id: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            isOneToOne: false;
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      organizations: {
        Row: {
          created_at: string;
          id: string;
          mode: string;
          name: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          mode: string;
          name: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          mode?: string;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      pg_all_foreign_keys: {
        Row: {
          fk_columns: unknown[] | null;
          fk_constraint_name: unknown;
          fk_schema_name: unknown;
          fk_table_name: unknown;
          fk_table_oid: unknown;
          is_deferrable: boolean | null;
          is_deferred: boolean | null;
          match_type: string | null;
          on_delete: string | null;
          on_update: string | null;
          pk_columns: unknown[] | null;
          pk_constraint_name: unknown;
          pk_index_name: unknown;
          pk_schema_name: unknown;
          pk_table_name: unknown;
          pk_table_oid: unknown;
        };
        Relationships: [];
      };
      tap_funky: {
        Row: {
          args: string | null;
          is_definer: boolean | null;
          is_strict: boolean | null;
          is_visible: boolean | null;
          kind: unknown;
          langoid: unknown;
          name: unknown;
          oid: unknown;
          owner: unknown;
          returns: string | null;
          returns_set: boolean | null;
          schema: unknown;
          volatility: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _cleanup: { Args: never; Returns: boolean };
      _contract_on: { Args: { '': string }; Returns: unknown };
      _currtest: { Args: never; Returns: number };
      _db_privs: { Args: never; Returns: unknown[] };
      _extensions: { Args: never; Returns: unknown[] };
      _get: { Args: { '': string }; Returns: number };
      _get_latest: { Args: { '': string }; Returns: number[] };
      _get_note: { Args: { '': string }; Returns: string };
      _is_verbose: { Args: never; Returns: boolean };
      _prokind: { Args: { p_oid: unknown }; Returns: unknown };
      _query: { Args: { '': string }; Returns: string };
      _refine_vol: { Args: { '': string }; Returns: string };
      _retval: { Args: { '': string }; Returns: string };
      _table_privs: { Args: never; Returns: unknown[] };
      _temptypes: { Args: { '': string }; Returns: string };
      _todo: { Args: never; Returns: string };
      col_is_null:
        | {
            Args: {
              column_name: unknown;
              description?: string;
              schema_name: unknown;
              table_name: unknown;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: unknown;
              description?: string;
              table_name: unknown;
            };
            Returns: string;
          };
      col_not_null:
        | {
            Args: {
              column_name: unknown;
              description?: string;
              schema_name: unknown;
              table_name: unknown;
            };
            Returns: string;
          }
        | {
            Args: {
              column_name: unknown;
              description?: string;
              table_name: unknown;
            };
            Returns: string;
          };
      current_organization_id: { Args: never; Returns: string };
      current_organization_role: { Args: never; Returns: string };
      diag:
        | {
            Args: { msg: unknown };
            Returns: {
              error: true;
            } & 'Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
          }
        | {
            Args: { msg: string };
            Returns: {
              error: true;
            } & 'Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved';
          };
      diag_test_name: { Args: { '': string }; Returns: string };
      do_tap: { Args: never; Returns: string[] } | { Args: { '': string }; Returns: string[] };
      fail: { Args: never; Returns: string } | { Args: { '': string }; Returns: string };
      findfuncs: { Args: { '': string }; Returns: string[] };
      finish: { Args: { exception_on_failure?: boolean }; Returns: string[] };
      format_type_string: { Args: { '': string }; Returns: string };
      has_org_role: { Args: { required_roles: string[] }; Returns: boolean };
      has_unique: { Args: { '': string }; Returns: string };
      in_todo: { Args: never; Returns: boolean };
      ingest_live_kpi_event: { Args: { p_event: Json }; Returns: Json };
      is_empty: { Args: { '': string }; Returns: string };
      isnt_empty: { Args: { '': string }; Returns: string };
      lives_ok: { Args: { '': string }; Returns: string };
      no_plan: { Args: never; Returns: boolean[] };
      num_failed: { Args: never; Returns: number };
      os_name: { Args: never; Returns: string };
      pass: { Args: never; Returns: string } | { Args: { '': string }; Returns: string };
      pg_version: { Args: never; Returns: string };
      pg_version_num: { Args: never; Returns: number };
      pgtap_version: { Args: never; Returns: number };
      runtests: { Args: never; Returns: string[] } | { Args: { '': string }; Returns: string[] };
      skip:
        | { Args: { '': string }; Returns: string }
        | { Args: { how_many: number; why: string }; Returns: string };
      throws_ok: { Args: { '': string }; Returns: string };
      todo:
        | { Args: { how_many: number }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
        | { Args: { why: string }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] };
      todo_end: { Args: never; Returns: boolean[] };
      todo_start:
        { Args: never; Returns: boolean[] } | { Args: { '': string }; Returns: boolean[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      _time_trial_type: {
        a_time: number | null;
      };
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;

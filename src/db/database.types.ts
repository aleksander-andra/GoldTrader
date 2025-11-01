// Types generated manually for MVP based on Supabase schema
// public schema only

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string; // uuid
          role: "admin" | "user";
          created_at: string; // timestamptz
        };
        Insert: {
          user_id: string;
          role?: "admin" | "user";
          created_at?: string;
        };
        Update: {
          role?: "admin" | "user";
          created_at?: string;
        };
      };
      assets: {
        Row: {
          id: string; // uuid
          symbol: string;
          name: string;
          currency: string;
          created_at: string; // timestamptz
          updated_at?: string; // timestamptz (added by trigger)
        };
        Insert: {
          id?: string;
          symbol: string;
          name: string;
          currency: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          symbol?: string;
          name?: string;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      strategies: {
        Row: {
          id: string;
          name: string;
          type: string;
          params_json: Json;
          status: "active" | "draft";
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: string;
          params_json?: Json;
          status?: "active" | "draft";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          type?: string;
          params_json?: Json;
          status?: "active" | "draft";
          created_at?: string;
          updated_at?: string;
        };
      };
      signals: {
        Row: {
          id: string;
          strategy_id: string;
          asset_id: string;
          ts: string;
          type: "BUY" | "SELL" | "HOLD";
          confidence: number;
          meta_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          strategy_id: string;
          asset_id: string;
          ts: string;
          type: "BUY" | "SELL" | "HOLD";
          confidence: number;
          meta_json?: Json;
          created_at?: string;
        };
        Update: {
          strategy_id?: string;
          asset_id?: string;
          ts?: string;
          type?: "BUY" | "SELL" | "HOLD";
          confidence?: number;
          meta_json?: Json;
          created_at?: string;
        };
      };
    };
  };
}

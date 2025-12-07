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
      asset_events: {
        Row: {
          id: string;
          asset: string;
          title: string;
          summary: string;
          published_at: string;
          source_name: string;
          source_url: string;
          direction: "POS" | "NEG" | "NEU";
          impact_score: number;
          source_score: number;
          final_score: number;
          prediction_direction: "POS" | "NEG" | "NEU" | null;
          observed_direction: "POS" | "NEG" | "NEU" | null;
          source_reliability_score: number | null;
          created_at: string;
          updated_at?: string;
        };
        Insert: {
          id?: string;
          asset: string;
          title: string;
          summary: string;
          published_at: string;
          source_name: string;
          source_url: string;
          direction: "POS" | "NEG" | "NEU";
          impact_score: number;
          source_score: number;
          final_score: number;
          prediction_direction?: "POS" | "NEG" | "NEU" | null;
          observed_direction?: "POS" | "NEG" | "NEU" | null;
          source_reliability_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          asset?: string;
          title?: string;
          summary?: string;
          published_at?: string;
          source_name?: string;
          source_url?: string;
          direction?: "POS" | "NEG" | "NEU";
          impact_score?: number;
          source_score?: number;
          final_score?: number;
          prediction_direction?: "POS" | "NEG" | "NEU" | null;
          observed_direction?: "POS" | "NEG" | "NEU" | null;
          source_reliability_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      price_history: {
        Row: {
          id: string;
          asset: string;
          timeframe: string;
          ts: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume: number | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset: string;
          timeframe: string;
          ts: string;
          open: number;
          high: number;
          low: number;
          close: number;
          volume?: number | null;
          source: string;
          created_at?: string;
        };
        Update: {
          asset?: string;
          timeframe?: string;
          ts?: string;
          open?: number;
          high?: number;
          low?: number;
          close?: number;
          volume?: number | null;
          source?: string;
          created_at?: string;
        };
      };
      price_forecasts: {
        Row: {
          id: string;
          asset: string;
          timeframe: string;
          forecast_horizon: string;
          target_type: string;
          prediction_value: number;
          prediction_direction: string;
          model_type: string;
          model_version: string;
          valid_from: string;
          valid_to: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          asset: string;
          timeframe: string;
          forecast_horizon: string;
          target_type: string;
          prediction_value: number;
          prediction_direction: string;
          model_type: string;
          model_version: string;
          valid_from: string;
          valid_to: string;
          created_at?: string;
        };
        Update: {
          asset?: string;
          timeframe?: string;
          forecast_horizon?: string;
          target_type?: string;
          prediction_value?: number;
          prediction_direction?: string;
          model_type?: string;
          model_version?: string;
          valid_from?: string;
          valid_to?: string;
          created_at?: string;
        };
      };
      model_runs: {
        Row: {
          id: string;
          model_type: string;
          model_version: string;
          asset: string;
          timeframe: string;
          train_start: string;
          train_end: string;
          val_metric_name: string;
          val_metric_value: number;
          params: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          model_type: string;
          model_version: string;
          asset: string;
          timeframe: string;
          train_start: string;
          train_end: string;
          val_metric_name: string;
          val_metric_value: number;
          params?: Json;
          created_at?: string;
        };
        Update: {
          model_type?: string;
          model_version?: string;
          asset?: string;
          timeframe?: string;
          train_start?: string;
          train_end?: string;
          val_metric_name?: string;
          val_metric_value?: number;
          params?: Json;
          created_at?: string;
        };
      };
    };
  };
}

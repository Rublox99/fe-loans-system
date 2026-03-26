import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  // ── SELECT ──────────────────────────────────────────
  async getAll<T>(table: string): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(table)
      .select('*');

    if (error) throw error;
    return data as T[];
  }

  async getById<T>(table: string, id: number | string): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as T;
  }

  // ── INSERT ──────────────────────────────────────────
  async insert<T>(table: string, record: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .insert(record)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  // ── UPDATE ──────────────────────────────────────────
  async update<T>(
    table: string,
    id: number | string,
    changes: Partial<T>
  ): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .update(changes)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  // ── DELETE ──────────────────────────────────────────
  async delete(table: string, id: number | string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
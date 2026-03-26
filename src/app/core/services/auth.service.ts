import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { Session, User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _session = new BehaviorSubject<Session | null>(null);
  session$ = this._session.asObservable();

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    // Escuchar cambios de sesión
    this.supabaseService.client.auth.onAuthStateChange((_, session) => {
      this._session.next(session);
    });
  }

  get currentUser(): User | null {
    return this._session.value?.user ?? null;
  }

  async signIn(email: string, password: string) {
    const { error } = await this.supabaseService.client.auth
      .signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signUp(email: string, password: string) {
    const { error } = await this.supabaseService.client.auth
      .signUp({ email, password });
    if (error) throw error;
  }

  async signOut() {
    await this.supabaseService.client.auth.signOut();
    this.router.navigate(['/auth/login']);
  }

  async isAuthenticated(): Promise<boolean> {
    const { data } = await this.supabaseService.client.auth.getSession();
    return !!data.session;
  }
}
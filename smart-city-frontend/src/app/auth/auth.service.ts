import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8081/api/auth';

  constructor(private http: HttpClient) { }

  register(user: any): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/register`, user);
  }

  login(user: any): Observable<string> {
    return this.http.post<string>(`${this.apiUrl}/login`, user);
  }

  saveToken(token: string) {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  private _role: string | null = null;
  private _municipality: string | null = null;  // NEW: Cache for municipality

  getRole(): string | null {
    if (this._role !== null) return this._role;  // cache hit

    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload (first read):', payload);
      this._role = payload.role || null;
      this._municipality = payload.municipality || null;  // NEW: Extract municipality
      return this._role;
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  // NEW: Getter for municipality
  getMunicipality(): string | null {
    if (this._municipality !== null) return this._municipality;
    this.getRole();  // Triggers extraction if not cached
    return this._municipality;
  }

  logout() {
    localStorage.removeItem('token');
    this._role = null;  // reset cache
    this._municipality = null;  // NEW: Reset municipality cache
  }
}
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

  getToken() {
    return localStorage.getItem('token');
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  // Decode JWT to get role (simple, no lib)
  private _role: string | null = null;

  getRole(): string | null {
    if (this._role !== null) return this._role;  // cache hit

    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload (first read):', payload);
      this._role = payload.role || null;
      return this._role;
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  logout() {
    localStorage.removeItem('token');
    this._role = null;  // reset cache
  }
}
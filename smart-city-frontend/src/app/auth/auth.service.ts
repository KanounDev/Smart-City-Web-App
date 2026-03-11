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
  private _municipality: string | null = null;  

  getRole(): string | null {
    if (this._role !== null) return this._role;  

    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('JWT payload (first read):', payload);
      this._role = payload.role || null;
      this._municipality = payload.municipality || null;  
      return this._role;
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  getMunicipality(): string | null {
    if (this._municipality !== null) return this._municipality;
    this.getRole();  
    return this._municipality;
  }
  getCurrentUser(): any {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload;
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  getCurrentUserId(): string | null {
    const user = this.getCurrentUser(); 
    return user?.id || null;
  }
  logout() {
    localStorage.removeItem('token');
    this._role = null;  
    this._municipality = null;  
  }
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IssueService {
  private apiUrl = 'http://localhost:8081/api/issues';

  constructor(private http: HttpClient, private authService: AuthService) { }

  private getHeaders() {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    const token = this.authService.getToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  createIssue(formData: FormData): Observable<any> {
    const token = this.authService.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post(`${this.apiUrl}`, formData, { headers });
  }
  // ADD THIS METHOD
  getAdminIssues(status: string | null = null): Observable<any[]> {
    let url = `${this.apiUrl}/admin`;
    if (status) url += `?status=${status}`;
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }
  getMyIssues(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
  }

  getPendingIssues(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pending`, { headers: this.getHeaders() });
  }

  updateIssue(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${id}`, payload, { headers: this.getHeaders() });
  }

  getApprovedPublic(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/approved/public`, { headers: this.getHeaders() });
  }

  getPhoto(id: string, index: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/photos/${index}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    });
  }
}

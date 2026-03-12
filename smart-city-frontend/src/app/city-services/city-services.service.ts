import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CityServicesService {
  private apiUrl = 'http://localhost:8081/api/city-services';

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

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  create(service: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, service, { headers: this.getHeaders() });
  }

  update(id: string, service: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, service, { headers: this.getHeaders() });
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}

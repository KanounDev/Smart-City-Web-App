import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Observable, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private apiUrl = 'http://localhost:8081/api/requests';
  private stompClient: Client | null = null;
  private requestUpdates = new Subject<any>();

  constructor(private http: HttpClient, private authService: AuthService) {
    this.initializeWebSocket();
  }

  private getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  getApproved(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/approved`);
  }

  getMyRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
  }

  // New: For admin pending requests
  getPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/pending`, { headers: this.getHeaders() });
  }

  submitRequest(formData: FormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, formData, { headers: this.getHeaders() });
  }

  addDocuments(id: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/documents`, formData, { headers: this.getHeaders() });
  }

  deleteDocument(id: string, index: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}/documents/${index}`, { headers: this.getHeaders() });
  }

  // New: For admin update
  updateRequest(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${id}`, payload, { headers: this.getHeaders() });
  }

  updateRequestOwner(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }

  deleteRequest(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // New: Public base URL getter (from earlier fix)
  public getApiBaseUrl(): string {
    return this.apiUrl;
  }

  getUpdates(): Observable<any> {
    return this.requestUpdates.asObservable();
  }

  private initializeWebSocket() {
    const socket = new SockJS('http://localhost:8081/ws');
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log('Connected to WebSocket');
        this.stompClient?.subscribe('/topic/requests', (message) => {
          if (message.body) {
            const updatedRequest = JSON.parse(message.body);
            this.requestUpdates.next(updatedRequest);
          }
        });
      },
      debug: (str) => console.log(str)
    });
    this.stompClient.activate();
  }
}
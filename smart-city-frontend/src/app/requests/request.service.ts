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

  submitRequest(request: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, request, { headers: this.getHeaders() });
  }

  getPending(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/pending`, { headers: this.getHeaders() });
  }

  updateRequest(id: string, updated: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${id}`, updated, { headers: this.getHeaders() });
  }

  // NEW: Update specific request (For Owner)
  updateRequestOwner(id: string, request: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, request, { headers: this.getHeaders() });
  }

  // NEW: Delete specific request (For Owner)
  deleteRequest(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  // --- NEW: Expose WebSocket Updates ---
  // This is the method your component was missing
  getUpdates(): Observable<any> {
    return this.requestUpdates.asObservable();
  }

  // NEW: WebSocket Setup
  private initializeWebSocket() {
    const socket = new SockJS('http://localhost:8081/ws');
    this.stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        console.log('Connected to WebSocket');
        // Subscribe to public topic
        this.stompClient?.subscribe('/topic/requests', (message) => {
          if (message.body) {
            const updatedRequest = JSON.parse(message.body);
            this.requestUpdates.next(updatedRequest); // Notify components
          }
        });
      },
      debug: (str) => console.log(str) // Optional: for debugging
    });
    this.stompClient.activate();
  }
}
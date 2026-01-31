import { Injectable, NgZone } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { Client, StompSubscription, IFrame } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { filter, first } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RequestService {
  private apiUrl = 'http://localhost:8081/api/requests';
  private stompClient: Client | null = null;
  private requestUpdates = new Subject<any>();

  // Connection state tracking
  private connectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.connectedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    this.initializeWebSocket();
  }

  private getHeaders() {
    const token = this.authService.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>('http://localhost:8081/api/auth/me', { headers: this.getHeaders() });
  }

  getAllOwners(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8081/api/conversations', { headers: this.getHeaders() });
  }

  getConversation(ownerId: string): Observable<any> {
    return this.http.get<any>(`http://localhost:8081/api/conversations/${ownerId}`, { headers: this.getHeaders() });
  }

  sendMessage(ownerId: string, content: string): Observable<any> {
    return this.http.post(
      `http://localhost:8081/api/conversations/${ownerId}/messages`,
      content,
      { headers: this.getHeaders().set('Content-Type', 'text/plain') }
    );
  }

  getApproved(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/approved`);
  }

  getMyRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my`, { headers: this.getHeaders() });
  }

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

  updateRequest(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/admin/${id}`, payload, { headers: this.getHeaders() });
  }

  updateRequestOwner(id: string, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }

  deleteRequest(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  getApiBaseUrl(): string {
    return this.apiUrl;
  }

  getUpdates(): Observable<any> {
    return this.requestUpdates.asObservable();
  }

  // Safe subscription: waits for connection if necessary
  subscribeToTopic(topic: string, callback: (message: any) => void): StompSubscription | undefined {
    if (!this.stompClient) {
      console.warn('[RequestService] STOMP client not initialized');
      return undefined;
    }

    const doSubscribe = () => {
      console.log('[RequestService] Subscribing to:', topic);
      return this.stompClient!.subscribe(topic, (msg) => {
        if (msg.body) {
          const parsed = JSON.parse(msg.body);
          this.ngZone.run(() => {
            console.log(`[RequestService] WS message received on ${topic}:`, parsed);
            callback(parsed);
          });
        }
      });
    };

    if (this.connectedSubject.value) {
      return doSubscribe();
    }

    // Wait for connection
    console.log('[RequestService] Connection not ready yet. Waiting...');
    this.isConnected$.pipe(
      filter(connected => connected === true),
      first()
    ).subscribe(() => {
      doSubscribe();
    });

    return undefined; // caller doesn't get subscription ref immediately
  }

  private initializeWebSocket() {
    const socket = new SockJS('http://localhost:8081/ws');

    this.stompClient = new Client({
      webSocketFactory: () => socket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => console.log('[STOMP]', str),
    });

    this.stompClient.onConnect = (frame: IFrame) => {
      this.ngZone.run(() => {
        console.log('[STOMP] Connected successfully');
        this.connectedSubject.next(true);

        // Global requests subscription
        this.stompClient?.subscribe('/topic/requests', (message) => {
          if (message.body) {
            const updatedRequest = JSON.parse(message.body);
            this.ngZone.run(() => {
              this.requestUpdates.next(updatedRequest);
            });
          }
        });
      });
    };

    this.stompClient.onStompError = (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
      this.connectedSubject.next(false);
    };

    this.stompClient.onWebSocketClose = () => {
      console.log('[STOMP] WebSocket closed');
      this.connectedSubject.next(false);
    };

    this.stompClient.activate();
  }

  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.connectedSubject.next(false);
      console.log('[STOMP] Disconnected');
    }
  }
}
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

  private connectedSubject = new BehaviorSubject<boolean>(false);
  private userNotificationsTopic = '';
  private userNotificationSub: StompSubscription | undefined = undefined;
  public isConnected$ = this.connectedSubject.asObservable();
  private notificationUpdates = new Subject<any>();
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    this.initializeWebSocket();
  }
  setCurrentUser(userId: string) {
    this.userNotificationsTopic = `/topic/notifications/${userId}`;
    if (this.connectedSubject.value) {
      this.subscribeToPersonalNotifications();
    } else {
      this.isConnected$.pipe(filter(connected => connected), first())
        .subscribe(() => this.subscribeToPersonalNotifications());
    }
  }
  private subscribeToPersonalNotifications() {
    if (this.userNotificationSub) {
      this.userNotificationSub.unsubscribe();
    }
    if (!this.userNotificationsTopic) return;

    this.userNotificationSub = this.subscribeToTopic(
      this.userNotificationsTopic,
      (notif: any) => {
        console.log('[REAL-TIME PERSONAL] Notification reçue :', notif);
        this.notificationUpdates.next(notif);
      }
    );
  }
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

  getNotificationUpdates(): Observable<object> {
    return this.notificationUpdates.asObservable();
  }
  getCurrentUser(): Observable<any> {
    return this.http.get<any>('http://localhost:8081/api/auth/me', { headers: this.getHeaders() });
  }

  getAllOwners(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8081/api/conversations', { headers: this.getHeaders() });
  }
 
  downloadDocument(requestId: string, index: number): void {
    const url = `${this.getApiBaseUrl()}/${requestId}/documents/${index}`;

    this.http.get(url, {
      responseType: 'blob' as const,
      headers: this.getHeaders()   // ← JWT required (already fixed in previous step)
    }).subscribe({
      next: (blob: Blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const newTab = window.open(blobUrl, '_blank');

        // Auto-cleanup memory after 15 seconds (safe for new tab)
        setTimeout(() => {
          window.URL.revokeObjectURL(blobUrl);
        }, 15000);
      },
      error: (err) => {
        console.error('Document open failed', err);
        if (err.status === 403) {
          alert('Accès refusé – Vous n\'êtes pas autorisé à ouvrir ce document.');
        } else {
          alert('Erreur lors de l\'ouverture du document');
        }
      }
    });
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

  getRequestsByStatus(status: string): Observable<any[]> {
    console.log(`RequestService: Fetching requests with status ${status}`);
    let endpoint: string;

    switch (status.toUpperCase()) {
      case 'PENDING':
        endpoint = '/pending';
        break;
      case 'APPROVED':
        endpoint = '/approved';
        break;
      case 'REJECTED':
        endpoint = '/rejected';
        break;
      default:
        throw new Error(`Invalid status: ${status}`);
    }

    return this.http.get<any[]>(`${this.apiUrl}${endpoint}`, { headers: this.getHeaders() });
  }
  getAdminByStatus(status: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/by-status?status=${status}`, { headers: this.getHeaders() });
  }
  getApprovedRequests(): Observable<any[]> {
    console.log('RequestService: Fetching approved requests from /approved');
    return this.http.get<any[]>(`${this.apiUrl}/approved`, { headers: this.getHeaders() });
  }
  getApprovedPublic(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8081/api/requests/approved/public', { headers: this.getHeaders() });
  }
  submitRequest(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}`, formData, {
      headers: this.getHeaders().delete('Content-Type')  
    });
  }

  addDocuments(id: string, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/documents`, formData, {
      headers: this.getHeaders().delete('Content-Type') 
    });
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
  getBusinessById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }


  getReviewsByBusinessId(businessId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8081/api/reviews/business/${businessId}`, { headers: this.getHeaders() });
  }

  addReview(review: any): Observable<any> {
    return this.http.post<any>(`http://localhost:8081/api/reviews`, review, { headers: this.getHeaders() });
  }
  getServicesByBusinessId(businessId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:8081/api/services/business/${businessId}`, {
      headers: this.getHeaders()
    });
  }

  addService(service: any): Observable<any> {
    return this.http.post<any>('http://localhost:8081/api/services', service, {
      headers: this.getHeaders()
    });
  }

  updateService(id: string, service: any): Observable<any> {
    return this.http.put<any>(`http://localhost:8081/api/services/${id}`, service, {
      headers: this.getHeaders()
    });
  }

  deleteService(id: string): Observable<any> {
    return this.http.delete<any>(`http://localhost:8081/api/services/${id}`, {
      headers: this.getHeaders()
    });
  }
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

    console.log('[RequestService] Connection not ready yet. Waiting...');
    this.isConnected$.pipe(
      filter(connected => connected === true),
      first()
    ).subscribe(() => {
      doSubscribe();
    });

    return undefined;
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

        this.stompClient?.subscribe('/topic/requests', (message) => {
          if (message.body) {
            const updatedRequest = JSON.parse(message.body);
            this.ngZone.run(() => {
              this.requestUpdates.next(updatedRequest);
            });
          }
        });

        this.stompClient?.subscribe('/topic/new-business', (message) => {
          if (message.body) {
            const newNotif = JSON.parse(message.body);
            this.ngZone.run(() => {
              console.log('[REAL-TIME BROADCAST] Nouvelle entreprise approuvée :', newNotif);
              this.notificationUpdates.next(newNotif);
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
  getNotifications(): Observable<any[]> {
    const url = `${this.apiUrl.replace('requests', 'notifications')}/my`;
    console.log('Fetching notifications from:', url);  // DEBUG
    return this.http.get<any[]>(url, { headers: this.getHeaders() });
  }

  markAsRead(notificationId: string): Observable<any> {
    return this.http.put<any>(
      `http://localhost:8081/api/notifications/${notificationId}/read`,
      {},
      { headers: this.getHeaders() }
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put<any>(
      'http://localhost:8081/api/notifications/mark-all-read',
      {},
      { headers: this.getHeaders() }
    );
  }
}
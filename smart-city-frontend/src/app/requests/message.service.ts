import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../auth/auth.service';
import { Observable, Subject } from 'rxjs';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private apiUrl = 'http://localhost:8081/api/conversations';
  private stompClient: Client | null = null;
  private messageUpdates = new Subject<any>();  

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders() {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }
  getConversation(ownerId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${ownerId}`, { headers: this.getHeaders() });
  }
  sendMessage(ownerId: string, content: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${ownerId}/messages`, { content }, { headers: this.getHeaders() });
  }

  getOwners(): Observable<any> {
    return this.http.get('http://localhost:8081/api/admin/owners', { headers: this.getHeaders() });
  }

  subscribeToConversation(ownerId: string) {
    if (this.stompClient && this.stompClient.connected) {
      this.stompClient.subscribe(`/topic/conversations/${ownerId}`, (message) => {
        if (message.body) {
          const newMessage = JSON.parse(message.body);
          this.messageUpdates.next(newMessage);
        }
      });
    } else {
      const socket = new SockJS('http://localhost:8081/ws');
      this.stompClient = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          console.log('Connected to WebSocket for messages');
          this.stompClient?.subscribe(`/topic/conversations/${ownerId}`, (message) => {
            if (message.body) {
              const newMessage = JSON.parse(message.body);
              this.messageUpdates.next(newMessage);
            }
          });
        },
        debug: (str) => console.log(str)
      });
      this.stompClient.activate();
    }
  }

  getUpdates(): Observable<any> {
    return this.messageUpdates.asObservable();
  }
  disconnect() {
    if (this.stompClient) {
      this.stompClient.deactivate();
    }
  }
}
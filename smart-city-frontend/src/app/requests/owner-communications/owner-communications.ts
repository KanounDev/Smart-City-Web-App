import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { StompSubscription } from '@stomp/stompjs';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-owner-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owner-communications.html',
  styleUrls: ['./owner-communications.css']
})
export class OwnerCommunicationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  messages: any[] = [];
  newMessage: string = '';
  ownerId: string | null = null;
  private stompSub: StompSubscription | undefined;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private requestService: RequestService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.requestService.getCurrentUser().subscribe({
      next: (user) => {
        this.ownerId = user.id;
        if (this.ownerId) {
          this.loadMessages();

          this.stompSub = this.requestService.subscribeToTopic(
            `/topic/conversations/${this.ownerId}`,
            (msg) => {
              this.ngZone.run(() => {
                this.messages = [...this.messages, msg];
                this.cdr.detectChanges();
                this.scrollToBottom();
              });
            }
          );
        }
      },
      error: (err) => console.error('Failed to load current user', err)
    });
  }

  loadMessages() {
    if (!this.ownerId) return;

    this.requestService.getConversation(this.ownerId).subscribe({
      next: (conv) => {
        this.messages = conv.messages || [];
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 100); // small delay for DOM render
      },
      error: (err) => console.error('Failed to load messages', err)
    });
  }

  sendMessage() {
    if (!this.newMessage.trim() || !this.ownerId) return;

    this.requestService.sendMessage(this.ownerId, this.newMessage).subscribe({
      next: () => {
        this.newMessage = '';
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: (err) => {
        console.error('Send failed', err);
        alert('Failed to send message');
      }
    });
  }

  private scrollToBottom(): void {
    if (this.messagesContainer?.nativeElement) {
      const container = this.messagesContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.stompSub) {
      this.stompSub.unsubscribe();
    }
  }
}
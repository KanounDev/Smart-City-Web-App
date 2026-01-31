import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { StompSubscription } from '@stomp/stompjs';

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.html',
  styleUrls: ['./communications.css']
})
export class CommunicationsComponent implements OnInit, OnDestroy, AfterViewChecked {
  owners: any[] = [];
  selectedOwner: any | null = null;
  messages: any[] = [];
  newMessage: string = '';
  private stompSub: StompSubscription | undefined;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private requestService: RequestService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    this.loadOwners();
  }

  loadOwners() {
    this.requestService.getAllOwners().subscribe(owners => {
      this.owners = owners;
      this.cdr.detectChanges();
    });
  }

  selectOwner(owner: any) {
    this.selectedOwner = owner;
    this.loadMessages(owner.id);

    if (this.stompSub) {
      this.stompSub.unsubscribe();
    }

    this.stompSub = this.requestService.subscribeToTopic(`/topic/conversations/${owner.id}`, (msg) => {
      this.ngZone.run(() => {
        this.messages = [...this.messages, msg];
        this.cdr.detectChanges();
        this.scrollToBottom();
      });
    });
  }

  private loadMessages(ownerId: string) {
    this.requestService.getConversation(ownerId).subscribe(conv => {
      this.messages = conv.messages || [];
      this.cdr.detectChanges();
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }

  sendMessage() {
    if (this.newMessage && this.selectedOwner) {
      this.requestService.sendMessage(this.selectedOwner.id, this.newMessage).subscribe(() => {
        this.newMessage = '';
        this.cdr.detectChanges();
        this.scrollToBottom();
      });
    }
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
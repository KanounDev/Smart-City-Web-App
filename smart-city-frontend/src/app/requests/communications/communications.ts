import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './communications.html',
  styleUrls: ['./communications.css']
})
export class CommunicationsComponent {
  // Static sample data
  owners: any[] = [
    { id: '1', username: 'BusinessOwner1', requestsCount: 2 },
    { id: '2', username: 'ShopKeeper2', requestsCount: 1 },
    { id: '3', username: 'ServiceProvider3', requestsCount: 3 }
  ];

  selectedOwner: any | null = null;

  // Static sample messages (will be per-owner in real impl)
  messages: any[] = [
    { sender: 'OWNER', text: 'Hello, I need clarification on my shop request.', timestamp: '2026-01-31 08:00 AM' },
    { sender: 'ADMIN', text: 'Sure, please upload the missing license document.', timestamp: '2026-01-31 08:05 AM' },
    { sender: 'OWNER', text: 'Uploaded. Please review.', timestamp: '2026-01-31 08:10 AM' },
    { sender: 'ADMIN', text: 'Looks good. Approving soon.', timestamp: '2026-01-31 08:15 AM' }
  ];

  selectOwner(owner: any) {
    this.selectedOwner = owner;
    // In real impl, fetch messages for this owner
  }
}
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-owner-communications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-communications.html',
  styleUrls: ['./owner-communications.css']
})
export class OwnerCommunicationsComponent {
  // Static sample messages (matching admin sample for shared convo simulation)
  messages: any[] = [
    { sender: 'OWNER', text: 'Hello, I need clarification on my shop request.', timestamp: '2026-01-31 08:00 AM' },
    { sender: 'ADMIN', text: 'Sure, please upload the missing license document.', timestamp: '2026-01-31 08:05 AM' },
    { sender: 'OWNER', text: 'Uploaded. Please review.', timestamp: '2026-01-31 08:10 AM' },
    { sender: 'ADMIN', text: 'Looks good. Approving soon.', timestamp: '2026-01-31 08:15 AM' }
  ];
}
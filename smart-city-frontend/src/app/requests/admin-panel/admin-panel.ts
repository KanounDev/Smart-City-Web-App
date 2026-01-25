import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.html',
  styleUrls: ['./admin-panel.css']
})
export class AdminPanelComponent implements OnInit, OnDestroy {
  private requestService = inject(RequestService);
  private cdr = inject(ChangeDetectorRef); // Needed for manual UI updates

  // Store requests in a standard array
  requests: any[] = [];
  
  private updateSub!: Subscription;

  ngOnInit() {
    // 1. Load initial data
    this.loadPendingRequests();

    // 2. Listen for Real-Time Updates
    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((updatedItem: any) => {
        this.handleRealTimeUpdate(updatedItem);
        this.cdr.detectChanges(); // Force the screen to refresh
      });
    }
  }

  ngOnDestroy() {
    if (this.updateSub) this.updateSub.unsubscribe();
  }

  loadPendingRequests() {
    this.requestService.getPending().subscribe({
      next: (data) => {
        this.requests = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading pending requests', err)
    });
  }

  // Logic to handle incoming WebSocket messages
  handleRealTimeUpdate(item: any) {
    // If the item was deleted or is no longer PENDING (e.g. processed by another admin), remove it
    if (item.status === 'DELETED' || item.status !== 'PENDING') {
      this.requests = this.requests.filter(r => r.id !== item.id);
      return;
    }

    // If it is still PENDING, it might be an update (e.g. Owner changed description) or a new request
    const index = this.requests.findIndex(r => r.id === item.id);
    if (index > -1) {
      // Update existing item
      this.requests[index] = item;
    } else {
      // Add new request to the top of the list
      this.requests.unshift(item);
    }
  }

  // Update status (Approve/Reject)
  update(id: string, status: string, comments: string, lat: number | null, lng: number | null) {
    const payload = { status, comments, lat, lng };
    
    this.requestService.updateRequest(id, payload).subscribe(() => {
      // We don't need to manually refresh the list here because:
      // 1. If you add WebSocket broadcast to the Admin Update endpoint, it will update automatically.
      // 2. Or we can optimistically remove it:
      this.requests = this.requests.filter(r => r.id !== id);
      this.cdr.detectChanges();
    });
  }
}
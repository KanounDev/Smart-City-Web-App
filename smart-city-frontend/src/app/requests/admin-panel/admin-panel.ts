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
  private cdr = inject(ChangeDetectorRef);

  requests: any[] = [];
  
  private updateSub!: Subscription;

  ngOnInit() {
    this.loadPendingRequests();

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((updatedItem: any) => {
        this.handleRealTimeUpdate(updatedItem);
        this.cdr.detectChanges();
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
      error: (err) => {
        console.error('Error loading pending requests', err);
        alert('Failed to load requests. Check console.');
      }
    });
  }

  handleRealTimeUpdate(item: any) {
    if (item.status === 'DELETED' || item.status !== 'PENDING') {
      this.requests = this.requests.filter(r => r.id !== item.id);
      return;
    }

    const index = this.requests.findIndex(r => r.id === item.id);
    if (index > -1) {
      this.requests[index] = item;
    } else {
      this.requests.unshift(item);
    }
  }

  update(id: string, status: string, comments: string, lat: number | null, lng: number | null) {
    const payload = { status, comments, lat, lng };
    
    this.requestService.updateRequest(id, payload).subscribe({
      next: () => {
        // Optimistically remove from list (real-time will handle if needed)
        this.requests = this.requests.filter(r => r.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Failed to update request.');
      }
    });
  }

  // Added: Functions for documents (aligned with owner's space)
  getDownloadUrl(requestId: string, index: number): string {
    return `${this.requestService.getApiBaseUrl()}/${requestId}/documents/${index}`;
  }

  getFileName(docPath: string): string {
    return docPath.split('/').pop() || 'Document';
  }
  // ... rest of the class remains the same ...

// Add this method (same as in MyRequestsComponent)
public getStatusClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'status-pending';
    case 'APPROVED':
      return 'status-approved';
    case 'REJECTED':
      return 'status-rejected';
    default:
      return '';
  }
}
}
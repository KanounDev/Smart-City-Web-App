import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-requests.html',
  styleUrls: ['./my-requests.css']
})
export class MyRequestsComponent implements OnInit, OnDestroy {
  private requestService = inject(RequestService);
  private cdr = inject(ChangeDetectorRef); // INJECT CHANGE DETECTOR

  // Data State
  requests: any[] = [];

  // Editing State
  editingId: string | null = null;
  editForm: any = {};

  // Subscription management
  private updateSub!: Subscription;

  ngOnInit() {
    console.log('MyRequests Component Initialized');

    // 1. Fetch initial data from HTTP
    this.requestService.getMyRequests().subscribe({
      next: (data) => {
        console.log('HTTP Data Received:', data); // DEBUG LOG
        this.requests = data || []; // Handle null safety
        this.cdr.detectChanges();   // FORCE VIEW UPDATE
      },
      error: (err) => console.error('Error fetching requests:', err)
    });

    // 2. Listen for Real-Time Updates via WebSocket
    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((updatedItem: any) => {
        console.log('Real-time update received:', updatedItem);
        this.handleRealTimeUpdate(updatedItem);
        this.cdr.detectChanges(); // FORCE VIEW UPDATE
      });
    }
  }

  ngOnDestroy() {
    if (this.updateSub) {
      this.updateSub.unsubscribe();
    }
  }

  // Logic to handle incoming WebSocket messages
  handleRealTimeUpdate(item: any) {
    if (item.status === 'DELETED') {
      this.requests = this.requests.filter(r => r.id !== item.id);
    } else {
      const index = this.requests.findIndex(r => r.id === item.id);
      if (index > -1) {
        this.requests[index] = item;
      } else {
        this.requests.push(item);
      }
    }
  }

  // --- User Actions ---

  delete(id: string) {
    if (confirm('Are you sure you want to delete this request?')) {
      this.requestService.deleteRequest(id).subscribe({
        error: (err) => alert('Error deleting request')
      });
    }
  }

  startEdit(item: any) {
    this.editingId = item.id;
    this.editForm = { ...item };
  }

  saveEdit() {
    if (this.editingId) {
      this.requestService.updateRequestOwner(this.editingId, this.editForm).subscribe({
        next: () => {
          // 1. Reset the edit state
          this.editingId = null;

          // 2. Force the view to update immediately so the input fields disappear
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Update failed', err);
          alert('Failed to update request.');
        }
      });
    }
  }
  cancelEdit() {
    this.editingId = null;
    this.editForm = {};
  }
}
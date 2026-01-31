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
  activeTab: string = 'pending';

  // Requests (static for now; later fetch all and filter)
  allRequests: any[] = [];
  get pendingRequests() { return this.allRequests.filter(r => r.status === 'PENDING'); }
  get approvedRequests() { return this.allRequests.filter(r => r.status === 'APPROVED'); }
  get rejectedRequests() { return this.allRequests.filter(r => r.status === 'REJECTED'); }

  // Categories static
  categories: string[] = ['Shop', 'Service', 'Restaurant']; // Demo
  newCategory: string = '';
  editingCategoryIndex: number | null = null;
  editCategoryValue: string = '';

  private updateSub!: Subscription;
  requests: any[] = [];

 ngOnInit() {
    // Static demo data (replace with real fetch later)
    this.allRequests = [
      { id: '1', name: 'Shop A', category: 'Shop', description: 'Desc', address: 'Addr', status: 'PENDING', comments: '', documents: [] },
      { id: '2', name: 'Service B', category: 'Service', description: 'Desc', address: 'Addr', status: 'APPROVED', lat: 36.8, lng: 10.1, documents: [] },
      { id: '3', name: 'Shop C', category: 'Shop', description: 'Desc', address: 'Addr', status: 'REJECTED', comments: 'Invalid docs', documents: [] }
    ];

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((updatedItem: any) => {
        this.handleRealTimeUpdate(updatedItem);
        this.cdr.detectChanges();
      });
    }
  }
setTab(tab: string) {
    this.activeTab = tab;
  }

  // Category CRUD (static)
  addCategory() {
    if (this.newCategory) {
      this.categories.push(this.newCategory);
      this.newCategory = '';
    }
  }

  editCategory(index: number) {
    this.editingCategoryIndex = index;
    this.editCategoryValue = this.categories[index];
  }

  saveCategory(index: number) {
    this.categories[index] = this.editCategoryValue;
    this.editingCategoryIndex = null;
  }

  cancelEdit() {
    this.editingCategoryIndex = null;
  }

  deleteCategory(index: number) {
    this.categories.splice(index, 1);
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
    const index = this.allRequests.findIndex(r => r.id === item.id);
    if (index > -1) {
      this.allRequests[index] = item;
    } else {
      this.allRequests.push(item);
    }
    this.cdr.detectChanges();
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
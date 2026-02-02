// admin-panel.ts
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { Subscription, forkJoin } from 'rxjs';

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

  // Requests
  allRequests: any[] = [];
  get pendingRequests() { return this.allRequests.filter(r => r.status === 'PENDING'); }
  get approvedRequests() { return this.allRequests.filter(r => r.status === 'APPROVED'); }
  get rejectedRequests() { return this.allRequests.filter(r => r.status === 'REJECTED'); }

  // Categories
  categories: any[] = [];
  newCategory: string = '';
  editingCategoryId: string | null = null;
  editCategoryValue: string = '';

  private updateSub!: Subscription;

  ngOnInit() {
    this.loadAllRequests();
    this.loadCategories();

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((updatedItem: any) => {
        this.handleRealTimeUpdate(updatedItem);
        this.cdr.detectChanges();
      });
    }
  }

  loadAllRequests() {
    console.log('ADMIN PANEL: Starting to load requests...');

    forkJoin({
      pending: this.requestService.getRequestsByStatus('PENDING'),
      approved: this.requestService.getRequestsByStatus('APPROVED'),
      rejected: this.requestService.getRequestsByStatus('REJECTED')
    }).subscribe({
      next: (results) => {
        console.log('ADMIN PANEL: Raw results →', results);

        // Merge all results into one array (single source of truth)
        const all = [
          ...(results.pending || []),
          ...(results.approved || []),
          ...(results.rejected || [])
        ];

        // Optional: remove duplicates if any overlap (by id)
        const uniqueMap = new Map<string, any>();
        all.forEach(req => uniqueMap.set(req.id, req));
        this.allRequests = Array.from(uniqueMap.values());

        console.log('ADMIN PANEL: Total unique requests loaded:', this.allRequests.length);
        console.log('ADMIN PANEL: Pending count (via getter):', this.pendingRequests.length);

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('ADMIN PANEL: Failed to load requests', err);
        if (err.status === 403) {
          alert('403 Forbidden - Check if you are really logged in as ADMIN');
        }
        if (err.status === 0) {
          alert('Network error - Backend not running?');
        }
      }
    });
  }

  loadCategories() {
    this.requestService.getCategories().subscribe({
      next: (data) => {
        this.categories = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading categories', err);
        alert('Failed to load categories.');
      }
    });
  }

  setTab(tab: string) {
    this.activeTab = tab;
  }

  // Category CRUD
  addCategory() {
    if (this.newCategory) {
      this.requestService.addCategory({ name: this.newCategory }).subscribe({
        next: (cat) => {
          this.categories.push(cat);
          this.newCategory = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Add category failed', err);
          alert('Failed to add category.');
        }
      });
    }
  }

  editCategory(id: string, name: string) {
    this.editingCategoryId = id;
    this.editCategoryValue = name;
  }

  saveCategory() {
    if (this.editingCategoryId) {
      this.requestService.updateCategory(this.editingCategoryId, { name: this.editCategoryValue }).subscribe({
        next: () => {
          const cat = this.categories.find(c => c.id === this.editingCategoryId);
          if (cat) {
            cat.name = this.editCategoryValue;
          }
          this.editingCategoryId = null;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Update category failed', err);
          alert('Failed to update category.');
        }
      });
    }
  }

  cancelEdit() {
    this.editingCategoryId = null;
  }

  deleteCategory(id: string) {
    this.requestService.deleteCategory(id).subscribe({
      next: () => {
        this.categories = this.categories.filter(c => c.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete category failed', err);
        alert('Failed to delete category.');
      }
    });
  }

  ngOnDestroy() {
    if (this.updateSub) this.updateSub.unsubscribe();
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

  // Replace the existing updateRequest() method with this updated version

  updateRequest(id: string, status: string, comments: string, lat: number | null, lng: number | null) {
    const payload = { status, comments, lat, lng };

    this.requestService.updateRequest(id, payload).subscribe({
      next: (updatedRequest) => {
        // Real-time should handle the list update, but we can help visually
        console.log(`Admin updated request ${id} to ${status}`);

        // ────────────────────────────────────────────────
        // ADD THIS BLOCK: User-friendly confirmation
        // ────────────────────────────────────────────────
        let message = '';
        if (status === 'APPROVED') {
          message = 'Request approved successfully!\n' +
            '→ Notification sent to the owner\n' +
            '→ Citizens in the area (~10 km) notified of the new business';
        } else if (status === 'REJECTED') {
          message = 'Request rejected successfully!\n' +
            '→ Notification sent to the owner';
        } else {
          message = `Request updated to ${status}`;
        }

        alert(message);  // ← temporary – later replace with toast/snackbar

        // Optional: force reload to be 100% sure (can remove once WebSocket is reliable)
        // this.loadAllRequests();

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Failed to update request: ' + (err.error?.message || err.message || 'Unknown error'));
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
import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { Subscription } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';  // Optional, not used but kept

@Component({
  selector: 'app-my-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-requests.html',
  styleUrls: ['./my-requests.css']
})
export class MyRequestsComponent implements OnInit, OnDestroy {
  private requestService = inject(RequestService);
  private cdr = inject(ChangeDetectorRef);

  requests: any[] = [];
  editingId: string | null = null;
  editForm: any = {};

  additionalFiles: { [requestId: string]: File[] } = {};

  private updateSub!: Subscription;

  ngOnInit() {
    console.log('MyRequests Component Initialized');

    this.requestService.getMyRequests().subscribe({
      next: (data: any[]) => {
        console.log('✅ Received requests:', data);           // ← debug
        console.log('Number of requests:', data.length);
        if (data.length > 0) {
          console.log('First request:', data[0]);
        }

        this.requests = data;
        this.cdr.detectChanges();                             // ← THIS FIXES THE DISPLAY ISSUE
      },
      error: (err: any) => {
        console.error('❌ Error fetching my requests:', err);
        alert('Failed to load requests. Check console.');
      }
    });

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((item: any) => {
        this.handleRealTimeUpdate(item);
        this.cdr.detectChanges();                             // ensure real-time updates also trigger view
      });
    }
  }

 ngOnDestroy() {
    if (this.updateSub) this.updateSub.unsubscribe();
  }

  private handleRealTimeUpdate(item: any) {
    if (item.status === 'DELETED') {
      this.requests = this.requests.filter(r => r.id !== item.id);
      return;
    }

    const index = this.requests.findIndex(r => r.id === item.id);
    if (index > -1) {
      this.requests[index] = item;
    } else {
      this.requests.push(item);
    }
  }

  public getStatusClass(status: string): string {  // Made public explicitly
    if (status === 'APPROVED') return 'status-approved';
    if (status === 'REJECTED') return 'status-rejected';
    return 'status-pending';
  }

  public getFileName(path: string): string {  // Public
    return path.split('/').pop() || 'Unknown file';
  }

  public getDownloadUrl(requestId: string, fileIndex: number): string {  // Public
    return `${this.requestService.getApiBaseUrl()}/${requestId}/documents/${fileIndex}`;
  }

  public onAdditionalFilesChange(event: Event, requestId: string) {  // Public
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.additionalFiles[requestId] = Array.from(input.files);
    }
  }

  public uploadAdditionalFiles(requestId: string) {
    if (this.additionalFiles[requestId] && this.additionalFiles[requestId].length > 0) {
      const formData = new FormData();
      this.additionalFiles[requestId].forEach(file => formData.append('additionalDocuments', file));

      this.requestService.addDocuments(requestId, formData).subscribe({
        next: (updatedRequest: any) => {
          const index = this.requests.findIndex(r => r.id === requestId);
          if (index > -1) this.requests[index] = updatedRequest;
          this.additionalFiles[requestId] = [];
          this.cdr.detectChanges();                           // already good
        },
        error: (err: any) => alert('Error uploading files')
      });
    }
  }

  public deleteFile(requestId: string, fileIndex: number) {
    if (confirm('Delete this file?')) {
      this.requestService.deleteDocument(requestId, fileIndex).subscribe({
        next: (updatedRequest: any) => {
          const index = this.requests.findIndex(r => r.id === requestId);
          if (index > -1) this.requests[index] = updatedRequest;
          this.cdr.detectChanges();                           // already good
        },
        error: (err: any) => alert('Error deleting file')
      });
    }
  }

  public delete(id: string) {  // Public
    if (confirm('Are you sure you want to delete this request?')) {
      this.requestService.deleteRequest(id).subscribe({
        next: () => {},  // No response body, but can handle
        error: (err: any) => alert('Error deleting request')  // Typed
      });
    }
  }

  public startEdit(item: any) {  // Public
    this.editingId = item.id;
    this.editForm = { ...item };
  }

  public saveEdit() {  // Public
    if (this.editingId) {
      this.requestService.updateRequestOwner(this.editingId, this.editForm).subscribe({
        next: () => {
          this.editingId = null;
          this.cdr.detectChanges();
        },
        error: (err: any) => {  // Typed
          console.error('Update failed', err);
          alert('Failed to update request.');
        }
      });
    }
  }

  public cancelEdit() {  // Public
    this.editingId = null;
    this.editForm = {};
  }
}
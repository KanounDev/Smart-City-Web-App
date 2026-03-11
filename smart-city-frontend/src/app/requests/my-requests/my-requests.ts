import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { Subscription } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';  

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
  selectedStatus: string = '';
  additionalFiles: { [requestId: string]: File[] } = {};

  private updateSub!: Subscription;

  ngOnInit() {
    console.log('MyRequests Component Initialized');

    this.requestService.getMyRequests().subscribe({
      next: (data: any[]) => {
        console.log('✅ Received requests:', data);         
        console.log('Number of requests:', data.length);
        if (data.length > 0) {
          console.log('First request:', data[0]);
        }

        this.requests = data;
        this.cdr.detectChanges();                           
      },
      error: (err: any) => {
        console.error('❌ Error fetching my requests:', err);
        alert('Failed to load requests. Check console.');
      }
    });

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((item: any) => {
        this.handleRealTimeUpdate(item);
        this.cdr.detectChanges();                            
      });
    }
  }
  get filteredRequests(): any[] {
    if (!this.selectedStatus) return this.requests;
    return this.requests.filter(r => r.status === this.selectedStatus);
  }
  onFilterChange() {
    this.cdr.detectChanges();
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

  public getStatusClass(status: string): string {  
    if (status === 'APPROVED') return 'status-approved';
    if (status === 'REJECTED') return 'status-rejected';
    return 'status-pending';
  }

  public getFileName(path: string): string {  
    return path.split('/').pop() || 'Unknown file';
  }

  downloadDocument(requestId: string, index: number) {
    this.requestService.downloadDocument(requestId, index);
  }

  public onAdditionalFilesChange(event: Event, requestId: string) { 
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.additionalFiles[requestId] = Array.from(input.files);
    }
  }

  public uploadAdditionalFiles(requestId: string) {
    if (this.additionalFiles[requestId] && this.additionalFiles[requestId].length > 0) {
      const formData = new FormData();
      this.additionalFiles[requestId].forEach(file => formData.append('documents', file));

      this.requestService.addDocuments(requestId, formData).subscribe({
        next: (updatedRequest: any) => {
          const index = this.requests.findIndex(r => r.id === requestId);
          if (index > -1) this.requests[index] = updatedRequest;
          this.additionalFiles[requestId] = [];
          this.cdr.detectChanges();                          
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
          this.cdr.detectChanges();                           
        },
        error: (err: any) => alert('Error deleting file')
      });
    }
  }

  public delete(id: string) {  
    if (confirm('Are you sure you want to delete this request?')) {
      this.requestService.deleteRequest(id).subscribe({
        next: () => { },  
        error: (err: any) => alert('Error deleting request')  
      });
    }
  }

  public startEdit(item: any) {  
    this.editingId = item.id;
    this.editForm = { ...item };
  }

  public saveEdit() {  
    if (this.editingId) {
      this.requestService.updateRequestOwner(this.editingId, this.editForm).subscribe({
        next: () => {
          this.editingId = null;
          this.cdr.detectChanges();
        },
        error: (err: any) => {  
          console.error('Update failed', err);
          alert('Failed to update request.');
        }
      });
    }
  }

  public cancelEdit() {  
    this.editingId = null;
    this.editForm = {};
  }
}
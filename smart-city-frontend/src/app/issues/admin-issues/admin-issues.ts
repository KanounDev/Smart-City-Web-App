import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssueService } from '../issue.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-admin-issues',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-issues.html',
  styleUrls: ['./admin-issues.css']
})
export class AdminIssuesComponent implements OnInit, OnDestroy {
  pendingIssues: any[] = [];
  loading = false;
  private pollSub?: Subscription;

  constructor(private issueService: IssueService, private cdr: ChangeDetectorRef) { }

 ngOnInit() {
  this.loadIssues(null);   // load ALL statuses by default
  this.pollSub = interval(5000).subscribe(() => this.loadIssues(this.currentStatus));
}

  currentStatus: string | null = null;
  loadIssues(status: string | null = null) {
  this.currentStatus = status;
  this.loading = true;
  this.issueService.getAdminIssues(status).subscribe({
    next: (data) => {
      this.pendingIssues = (data || []).map(i => ({ ...i, _comment: i.comments || '' }));
      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('Failed to load admin issues', err);
      alert('Failed to load issues.');
      this.loading = false;
    }
  });
}



  approve(issue: any) {
    this.updateIssue(issue, 'APPROVED');
  }

  reject(issue: any) {
    this.updateIssue(issue, 'REJECTED');
  }

  private updateIssue(issue: any, status: string) {
    const payload = { status, comments: issue._comment || '' };
    this.issueService.updateIssue(issue.id, payload).subscribe({
      next: () => {
        this.pendingIssues = this.pendingIssues.filter(i => i.id !== issue.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Update failed', err);
        alert('Failed to update issue.');
      }
    });
  }

  openPhoto(issueId: string, index: number) {
    this.issueService.getPhoto(issueId, index).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        console.error('Failed to load photo', err);
        alert('Failed to load photo.');
      }
    });
  }

  ngOnDestroy() {
    if (this.pollSub) this.pollSub.unsubscribe();
  }
}

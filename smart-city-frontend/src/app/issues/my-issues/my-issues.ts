import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssueService } from '../issue.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-my-issues',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-issues.html',
  styleUrls: ['./my-issues.css']
})
export class MyIssuesComponent implements OnInit {
  myIssues: any[] = [];
  filteredIssues: any[] = [];
  currentFilter = 'ALL';
  loading = true;

  constructor(private issueService: IssueService, private router: Router) {}

  ngOnInit() {
    this.issueService.getMyIssues().subscribe({
      next: (data) => {
        this.myIssues = data || [];
        this.filterIssues();
        this.loading = false;
      },
      error: () => { alert('Failed to load your issues'); this.loading = false; }
    });
  }

  filterIssues(status: string = 'ALL') {
    this.currentFilter = status;
    if (status === 'ALL') {
      this.filteredIssues = [...this.myIssues];
    } else {
      this.filteredIssues = this.myIssues.filter(i => i.status === status);
    }
  }

  openPhoto(issueId: string, index: number) {
    this.issueService.getPhoto(issueId, index).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
  }
}
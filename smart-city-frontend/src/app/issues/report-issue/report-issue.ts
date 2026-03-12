import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IssueService } from '../issue.service';

@Component({
  selector: 'app-report-issue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-issue.html',
  styleUrls: ['./report-issue.css']
})
export class ReportIssueComponent implements OnInit {
  issue = {
    title: '',
    description: '',
    category: 'POTHOLE',
    municipality: ''
  };

  lat: number | null = null;
  lng: number | null = null;
  isLocating = false;
  locationError: string | null = null;

  selectedPhotos: File[] = [];

  constructor(private issueService: IssueService, private router: Router) { }

  ngOnInit() {
    this.getLocation();
  }

  getLocation() {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser.';
      return;
    }

    this.isLocating = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        this.isLocating = false;
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.locationError = 'Unable to access your location. Please enable GPS.';
        this.isLocating = false;
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedPhotos = [...this.selectedPhotos, ...Array.from(input.files)];
      input.value = '';
    }
  }

  removeFile(index: number) {
    this.selectedPhotos.splice(index, 1);
  }

  submit() {
    if (this.lat == null || this.lng == null) {
      alert('Location is required to report an issue.');
      return;
    }
    if (!this.issue.title || !this.issue.description) {
      alert('Title and description are required.');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.issue.title);
    formData.append('description', this.issue.description);
    formData.append('category', this.issue.category);
    formData.append('municipality', this.issue.municipality || '');
    formData.append('lat', this.lat.toString());
    formData.append('lng', this.lng.toString());

    this.selectedPhotos.forEach(file => {
      formData.append('photos', file);
    });

    this.issueService.createIssue(formData).subscribe({
      next: () => {
        alert('Issue reported successfully.');
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Report failed', err);
        alert('Failed to report issue.');
      }
    });
  }
}
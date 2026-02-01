import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RequestService } from '../request.service';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';  // Adjust path if needed

@Component({
  selector: 'app-submit-request',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './submit-request.html',
  styleUrls: ['./submit-request.css']
})
export class SubmitRequestComponent {
  request = { name: '', description: '', category: 'Shop', address: '', municipality: '' };
  selectedFiles: File[] = [];  // New: Array to hold selected files

  constructor(private requestService: RequestService, private router: Router, private authService: AuthService) { }
  ngOnInit() {
    this.requestService.getCurrentUser().subscribe(user => {
      this.request.municipality = user.municipality;
    });
  }
  // New: Handle file selection
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      // FIX: Combine existing files with new ones using the spread operator (...)
      this.selectedFiles = [...this.selectedFiles, ...Array.from(input.files)];

      // Optional: Reset the input value so the same file can be selected again if needed
      input.value = '';
    }
  }

  // New: Remove a file from the list
  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  // In submit-request.ts → change how you call the service
  submit() {
    const formData = new FormData();
    formData.append('name', this.request.name);
    formData.append('description', this.request.description);
    formData.append('category', this.request.category);
    formData.append('address', this.request.address);
    formData.append('municipality', this.request.municipality);

    this.selectedFiles.forEach(file => {
      formData.append('documents', file);
    });

    // IMPORTANT: Do NOT set Content-Type header here!
    // Let browser set multipart/form-data + boundary
    this.requestService.submitRequest(formData).subscribe({
      next: () => this.router.navigate(['/my-requests']),
      error: (err) => console.error('Submit failed', err)
    });
  }
}
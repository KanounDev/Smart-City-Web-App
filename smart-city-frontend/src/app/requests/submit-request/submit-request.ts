import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { RequestService } from '../request.service';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-submit-request',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  templateUrl: './submit-request.html',
  styleUrls: ['./submit-request.css']
})
export class SubmitRequestComponent {
  request = {
    name: '',
    description: '',
    category: '',
    address: '',
    municipality: '',
    latitude: null as number | null,
    longitude: null as number | null
  };
  selectedFiles: File[] = [];

  constructor(private requestService: RequestService, private router: Router, private authService: AuthService) { }
  ngOnInit() {
    this.requestService.getCurrentUser().subscribe(user => {
      this.request.municipality = user.municipality;
    });
  }
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = [...this.selectedFiles, ...Array.from(input.files)];

      input.value = '';
    }
  }

  removeFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  submit() {
  const formData = new FormData();

  formData.append('name', this.request.name);
  formData.append('description', this.request.description);
  formData.append('category', this.request.category);
  formData.append('address', this.request.address);
  formData.append('municipality', this.request.municipality);

  // NEW: coordinates
  formData.append('latitude', this.request.latitude?.toString() ?? '');
  formData.append('longitude', this.request.longitude?.toString() ?? '');

  this.selectedFiles.forEach(file => {
    formData.append('documents', file);
  });

  this.requestService.submitRequest(formData).subscribe({
    next: () => this.router.navigate(['/my-requests']),
    error: (err) => console.error('Submit failed', err)
  });
}
}
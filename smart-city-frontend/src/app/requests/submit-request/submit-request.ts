import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-submit-request',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './submit-request.html'
})
export class SubmitRequestComponent {
  request = { name: '', description: '', category: 'Shop', address: '' };

  constructor(private requestService: RequestService, private router: Router) {}

  submit() {
    this.requestService.submitRequest(this.request).subscribe(() => {
      this.router.navigate(['/my-requests']);
    });
  }
}
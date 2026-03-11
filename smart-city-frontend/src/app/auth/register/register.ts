import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  user = { username: '', password: '', role: 'CITIZEN', municipality: '' };  

  constructor(private authService: AuthService, private router: Router) {}

register() {
  this.authService.register(this.user).subscribe({
    next: (response: any) => {
      this.authService.saveToken(response.token);
      this.router.navigate(['/']);
    },
    error: (err) => {
      console.error('Registration failed', err);
      let errorMsg = 'Registration failed. Please try again.';
      
      if (err.status === 400 && err.error?.error) {
        errorMsg = err.error.error; 
      }
      
      alert(errorMsg); 
    }
  });
}
}
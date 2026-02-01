import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  user = { 
    username: '', 
    password: '', 
    municipality: '',          // NEW
    role: 'CITIZEN' as const   // We will detect role after login, but helps UI
  };

  showMunicipality = false;    // Controls visibility

  constructor(private authService: AuthService, private router: Router) {}

  // Optional: auto-show field if user types something or after failed attempt
  updateForm() {
    this.showMunicipality = this.user.role !== 'CITIZEN';
  }

  login() {
    // Only send municipality if needed
    const payload: any = {
      username: this.user.username,
      password: this.user.password
    };
    if (this.showMunicipality) {
      payload.municipality = this.user.municipality;
    }

    this.authService.login(payload).subscribe({
      next: (response: any) => {
        this.authService.saveToken(response.token);
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('Login failed', err);
        alert(err.error?.error || 'Invalid credentials or municipality');
      }
    });
  }
}
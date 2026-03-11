import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  user = { 
    username: '', 
    password: '', 
    municipality: '',          
    role: 'CITIZEN' as const   
  };

  showMunicipality = false;    

  constructor(private authService: AuthService, private router: Router) {}

  updateForm() {
    this.showMunicipality = this.user.role !== 'CITIZEN';
  }

  login() {
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
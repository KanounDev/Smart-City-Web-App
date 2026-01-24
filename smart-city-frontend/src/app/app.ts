import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <nav>
      <a routerLink="/">Home</a>

      @if (authService.isLoggedIn()) {
        <!-- Owner links - no ROLE_ prefix -->
        @if (authService.getRole() === 'OWNER') {
          <a routerLink="/submit">Submit Request</a>
          <a routerLink="/my-requests">My Requests</a>
        }

        <!-- Admin link - no ROLE_ prefix -->
        @if (authService.getRole() === 'ADMIN') {
          <a routerLink="/admin">Admin Panel</a>
        }

        <button (click)="authService.logout()">Logout</button>
      } @else {
        <a routerLink="/login">Login</a>
        <a routerLink="/register">Register</a>
      }
    </nav>

    <router-outlet></router-outlet>
  `
})
export class AppComponent {
  constructor(public authService: AuthService) {}
}
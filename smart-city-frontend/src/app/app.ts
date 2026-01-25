import { Component, OnInit, OnDestroy, } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router'; // 1. Add Router import
import { AuthService } from './auth/auth.service';
import * as NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
   <nav>
  <div class="nav-left">
    <a routerLink="/">Home</a>
  </div>

  <div class="nav-right">
    @if (authService.isLoggedIn()) {
      @if (authService.getRole() === 'OWNER') {
        <a routerLink="/submit">Submit Request</a>
        <a routerLink="/my-requests">My Requests</a>
      }
      @if (authService.getRole() === 'ADMIN') {
        <a routerLink="/admin">Admin Panel</a>
      }
      <button (click)="logout()">Logout</button>
    } @else {
      <a routerLink="/login">Login</a>
      <a routerLink="/register">Register</a>
    }
  </div>
</nav>

    <router-outlet></router-outlet>
  `,
  styleUrls: ['./app.css']
})
export class AppComponent implements OnInit, OnDestroy {
  // 2. Inject Router here
  constructor(public authService: AuthService, private router: Router) { }
  
  private vantaEffect: any;

  // 3. Create the logout method
  logout() {
    this.authService.logout(); // Clear token
    this.router.navigate(['/']); // Redirect to Home
  }

  ngOnInit() {
    this.vantaEffect = NET.default({
      el: document.body,
      THREE: THREE,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,
      color: 0x00bfff,
      backgroundColor: 0xe3f2fd,
      points: 12.00,
      maxDistance: 30.00,
      spacing: 35.00,
      showDots: true
    });
  }

  ngOnDestroy() {
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
    }
  }
}
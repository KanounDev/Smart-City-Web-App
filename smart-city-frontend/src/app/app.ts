import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef , HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import * as NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
   <div #vantaBg id="vanta-bg"></div>

   <nav>
     <div class="nav-left">
      <a routerLink="/">Home</a>
    </div>

    <div class="nav-right">
      @if (authService.isLoggedIn()) {
        @if (authService.getRole() === 'OWNER') {
          <a routerLink="/submit">Submit Request</a>
          <a routerLink="/my-requests">My Requests</a>
          <a routerLink="/my-businesses">My Businesses</a>
          <a routerLink="/messages" class="messaging-icon" title="Messages">
            <span class="material-icons">message</span>
          </a>
        }
        @if (authService.getRole() === 'ADMIN') {
          <a routerLink="/admin">Admin Panel</a>
          <a routerLink="/communications" class="messaging-icon" title="Messages">
            <span class="material-icons">message</span>
          </a>
        }
          <div class="notification-wrapper">
            <span class="material-icons notification-icon" (click)="toggleNotifications()" title="Notifications">
              notifications
            </span>
            @if (unreadCount > 0) {
              <span class="unread-badge">{{ unreadCount }}</span>
            }
            @if (showNotifications) {
              <div class="notifications-dropdown">
                <h3>Notifications</h3>
                @if (notifications.length === 0) {
                  <p>No notifications yet.</p>
                } @else {
                  <ul>
                    @for (notif of notifications; track $index) {
                      <li>
                        <p>{{ notif.message }}</p>
                        <span class="timestamp">{{ notif.timestamp }}</span>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
          </div>
        <button (click)="logout()">Logout</button>
      } @else {
        <a routerLink="/login">Login</a>
        <a routerLink="/register">Register</a>
      }
    </div>
   </nav>

   <router-outlet />
  `,
  styleUrls: ['./app.css']
})
// 2. Implement AfterViewInit
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {

  // 3. Get reference to the background div
  @ViewChild('vantaBg') vantaBg!: ElementRef;

  constructor(public authService: AuthService, private router: Router) { }

  private vantaEffect: any;
  showNotifications = false;
  unreadCount = 3; // Static for demo
  notifications = [
    { message: 'Your shop request has been approved!', timestamp: '2 hours ago' },
    { message: 'New service added nearby.', timestamp: 'Yesterday' },
    { message: 'Reminder: Update your profile.', timestamp: '3 days ago' }
  ];

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  @HostListener('document:click', ['$event'])
  closeNotifications(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.notification-wrapper')) {
      this.showNotifications = false;
    }
  }
  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  ngOnInit() {
    // Moved Vanta logic to ngAfterViewInit
  }

  // 4. Initialize Vanta on the specific element
  ngAfterViewInit() {
    this.vantaEffect = NET.default({
      el: this.vantaBg.nativeElement, // Target the fixed div
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
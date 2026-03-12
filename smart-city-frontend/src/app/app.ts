import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { RequestService } from './requests/request.service';
import * as NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';
import { Subscription } from 'rxjs';

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
        @if (authService.getRole() === 'CITIZEN' || authService.getRole() === 'OWNER') {
          <a routerLink="/report-issue">Report Issue</a>
          <a routerLink="/my-issues">Issues Status</a>
         }
        @if (authService.getRole() === 'OWNER') {
          <a routerLink="/submit">Submit Request</a>
          <a routerLink="/my-requests">My Requests</a>
          <a routerLink="/my-businesses">My Businesses</a>
          <a routerLink="/report-issue">Report Issue</a>
          <a routerLink="/messages" class="messaging-icon" title="Messages">
            <span class="material-icons">message</span>
          </a>
        }
        @if (authService.getRole() === 'ADMIN') {
          <a routerLink="/admin">Admin Panel</a>
          <a routerLink="/admin/issues">Issue Moderation</a>
          <a routerLink="/communications" class="messaging-icon" title="Messages">
            <span class="material-icons">message</span>
          </a>
        }
          <div class="notification-wrapper">
  <span 
    class="material-icons notification-icon" 
    (click)="toggleNotifications()" 
    title="Notifications"
    aria-label="Open notifications"
  >
    notifications
  </span>

  @if (unreadCount > 0) {
    <span class="unread-badge">{{ unreadCount }}</span>
  }

  @if (showNotifications) {
    <div class="notifications-dropdown" #dropdownRef>
      <h3>Notifications</h3>

      @if (notifications.length === 0) {
        <p class="empty-state">No new notifications yet.</p>
      } @else {
        <ul class="notif-list">
          @for (notif of notifications; track notif.id) {
            <li 
              class="notif-item" 
              [class.unread]="!notif.isRead"
              (click)="markAsRead(notif.id)"
            >
              <div class="notif-icon">
                @switch (notif.type) {
                  @case ('REQUEST_STATUS_CHANGED') { <span class="material-icons">update</span> }
                  @case ('NEW_BUSINESS_APPROVED') { <span class="material-icons">store</span> }
                  @case ('NEW_MESSAGE') { <span class="material-icons">mail</span> }
                  @case ('REVIEW_ADDED') { <span class="material-icons">star</span> }
                  @case ('ISSUE_CREATED') { <span class="material-icons">report</span> }
                  @case ('ISSUE_STATUS_CHANGED') { <span class="material-icons">update</span> }
                  @default { <span class="material-icons">info</span> }
                }
              </div>

              <div class="notif-content">
                <strong class="notif-title">{{ notif.title }}</strong>
                <p class="notif-message">{{ notif.message }}</p>
                <span class="notif-time">{{ notif.createdAt | date:'short' }}</span>
              </div>
            </li>
          }
        </ul>
      }

      <button class="clear-all" (click)="markAllAsRead()" *ngIf="notifications.length > 0">
          Mark all as read
      </button>
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
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('vantaBg') vantaBg!: ElementRef;
  @ViewChild('notificationsDropdown') notificationsDropdown!: ElementRef;

  constructor(public authService: AuthService, private router: Router, private requestService: RequestService, private cdr: ChangeDetectorRef) { }

  private vantaEffect: any;
  private notifSub!: Subscription;
  private currentUserId: string | null = null;
  userLat: number | null = null;
  userLng: number | null = null;
  showNotifications = false;
  notifications: any[] = [];
  notificationSound = new Audio('assets/sounds/notification.mp3');

  clearAll() {
    this.notifications = [];
  }
  unreadCount = 0;
  showDropdown = false;

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;

    if (this.showNotifications) {
      this.loadNotifications();
    }
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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.userLat = pos.coords.latitude;
          this.userLng = pos.coords.longitude;
          console.log('Location set:', this.userLat, this.userLng);
          this.loadNotifications();
        },
        err => {
          console.warn('Geolocation error:', err);
          this.loadNotifications();
        }
      );
    } else {
      this.loadNotifications();
    }

    this.requestService.getCurrentUser().subscribe({
      next: (user) => {
        if (user?.id) {
          this.currentUserId = user.id;
          this.requestService.setCurrentUser(user.id);
          console.log('✅ Current user ID cached:', this.currentUserId);
          this.loadNotifications();
        }
      },
      error: (err) => console.warn('Could not get current user', err)
    });

    this.notifSub = this.requestService.getNotificationUpdates().subscribe((newNotif: any) => {
      console.log('Real-time notif received:', newNotif);

      if (!this.currentUserId) return;

      const processedNotif = {
        ...newNotif,
        isRead: newNotif.readBy?.includes(this.currentUserId) ?? false
      };

      if (this.filterRelevantNotifications([processedNotif]).length > 0) {
        const existingIndex = this.notifications.findIndex(n => n.id === processedNotif.id);

        if (existingIndex !== -1) {
          this.notifications[existingIndex] = { ...this.notifications[existingIndex], ...processedNotif };
        } else {
          this.notifications.push(processedNotif);
          this.notificationSound.currentTime = 0;
          this.notificationSound.play().catch(err => console.warn('Sound blocked:', err));
          this.notifications.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        this.updateUnreadCount();
        this.cdr.detectChanges();
      }
    });
  }

  ngAfterViewInit() {
    this.vantaEffect = NET.default({
      el: this.vantaBg.nativeElement,
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private loadNotifications() {
    if (!this.currentUserId) {
      console.warn('Cannot load notifications yet - waiting for user ID...');
      return;
    }

    this.requestService.getNotifications().subscribe({
      next: (rawNotifs: any[]) => {
        console.log('Raw notifications from server:', rawNotifs);

        this.notifications = this.filterRelevantNotifications(rawNotifs)
          .map(notif => ({
            ...notif,
            isRead: notif.readBy?.includes(this.currentUserId!) ?? false
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        console.log('Processed notifications:', this.notifications);
        this.updateUnreadCount();
        this.cdr.detectChanges();
      },
      error: err => console.error('Failed to load notifications', err)
    });
  }

 private filterRelevantNotifications(notifs: any[]): any[] {
  return notifs.filter(notif => {

    // Personal notifications
    if (notif.userId) {
      return true;
    }

    // Business approved notifications (with distance filter)
    if (notif.type === 'NEW_BUSINESS_APPROVED') {
      if (this.userLat === null || this.userLng === null || !notif.lat || !notif.lng) {
        return false;
      }

      const distance = this.calculateDistance(
        this.userLat,
        this.userLng,
        notif.lat,
        notif.lng
      );

      return distance < 10;
    }

    // Issue created notifications (broadcast)
    if (notif.type === 'ISSUE_CREATED') {
      return true;
    }

    return false;
  });
}

  private updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    console.log('Unread count updated to:', this.unreadCount);
  }

  markAsRead(notifId: string) {
    if (!this.currentUserId) return;

    this.requestService.markAsRead(notifId).subscribe({
      next: () => {
        const notif = this.notifications.find(n => n.id === notifId);
        if (notif) {
          notif.isRead = true;
          notif.readBy = notif.readBy || [];
          if (!notif.readBy.includes(this.currentUserId!)) notif.readBy.push(this.currentUserId!);
          this.updateUnreadCount();
          this.cdr.detectChanges();
        }
      },
      error: err => console.error('Mark as read failed', err)
    });
  }

  markAllAsRead() {
    if (!this.currentUserId) return;

    this.requestService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(notif => {
          notif.isRead = true;
          notif.readBy = notif.readBy || [];
          if (!notif.readBy.includes(this.currentUserId!)) notif.readBy.push(this.currentUserId!);
        });
        this.updateUnreadCount();
        this.cdr.detectChanges();
      },
      error: err => console.error('Mark all failed', err)
    });
  }

  ngOnDestroy() {
    if (this.vantaEffect) {
      this.vantaEffect.destroy();
    }
    if (this.notifSub) {
      this.notifSub.unsubscribe();
    }
  }
}
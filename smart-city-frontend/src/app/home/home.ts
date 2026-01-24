import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { latLng, tileLayer, marker, Layer } from 'leaflet';
import { RequestService } from '../requests/request.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, LeafletModule],
  templateUrl: './home.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  private requestService = inject(RequestService);
  private cdr = inject(ChangeDetectorRef); // Required for real-time UI updates

  // Data State
  approved: any[] = [];
  layers: Layer[] = [];
  
  private updateSub!: Subscription;

  // Map Config
  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      })
    ],
    zoom: 12,
    center: latLng(36.8065, 10.1815)  // Tunis
  };

  ngOnInit() {
    // 1. Load initial data
    this.requestService.getApproved().subscribe({
      next: (data) => {
        this.approved = data || [];
        this.updateMap(); // Create initial markers
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading home data', err)
    });

    // 2. Listen for Real-Time Updates
    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((item: any) => {
        this.handleRealTimeUpdate(item);
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy() {
    if (this.updateSub) this.updateSub.unsubscribe();
  }

  handleRealTimeUpdate(item: any) {
    // Check if the item is already in our list
    const index = this.approved.findIndex(r => r.id === item.id);

    // Scenario A: The request is APPROVED
    if (item.status === 'APPROVED') {
      if (index > -1) {
        this.approved[index] = item; // Update existing
      } else {
        this.approved.push(item); // Add new
      }
    } 
    // Scenario B: The request is NOT APPROVED (Rejected, Pending, or Deleted)
    else {
      if (index > -1) {
        this.approved.splice(index, 1); // Remove it from the home page
      }
    }

    // Refresh the map markers
    this.updateMap();
  }

  updateMap() {
    this.layers = this.approved
      .filter(r => r.lat && r.lng) // Only map items with coordinates
      .map(r => {
        return marker([r.lat, r.lng]).bindPopup(
          `<b>${r.name}</b><br>${r.category}<br>${r.description}`
        );
      });
  }
}
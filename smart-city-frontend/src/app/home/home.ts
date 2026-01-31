import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { latLng, tileLayer, marker, Layer, Map as LeafletMap, Icon, icon } from 'leaflet'; // Added Icon and icon
import { RequestService } from '../requests/request.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletModule],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  private requestService = inject(RequestService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  approved: any[] = [];
  layers: Layer[] = [];
  searchQuery: string = '';
  selectedCategory: string = '';
  private updateSub!: Subscription;
  private map!: LeafletMap;

  // 1. Fix the icons globally
  private fixLeafletIcons() {
    const defaultIcon = icon({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });

    // Set this as the default for all markers
    Marker.prototype.options.icon = defaultIcon;
  }

  // Define a special icon for the User/Visitor
  private visitorIcon = icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      })
    ],
    zoom: 12,
    center: latLng(36.8065, 10.1815)
  };

  ngOnInit() {
    this.fixLeafletIcons(); // Run the fix on init

    this.requestService.getApproved().subscribe({
      next: (data) => {
        this.approved = data || [];
        this.updateMap();
        this.cdr.detectChanges();
      }
    });

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((item: any) => {
        this.handleRealTimeUpdate(item);
        this.cdr.detectChanges();
      });
    }
  }

  onMapReady(map: LeafletMap) {
    this.map = map;
    this.getCurrentLocation();
  }
  get filteredApproved(): any[] {
    let filtered = this.approved;

    // Search filter (name, description, address)
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.address?.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(item => item.category === this.selectedCategory);
    }

    return filtered;
  }
  goToDetails(id: string) {
    this.router.navigate(['/details', id]);
  }
  getCurrentLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;

      // Use the custom red visitorIcon here
      marker([latitude, longitude], { icon: this.visitorIcon })
        .addTo(this.map)
        .bindPopup('<b>You are here</b>')
        .openPopup();

      this.map.setView([latitude, longitude], 14);
    });
  }

  updateMap() {
    this.layers = this.filteredApproved // Changed to filtered
      .filter(r => r.lat && r.lng)
      .map(r => {
        return marker([r.lat, r.lng]).bindPopup(
          `<b>${r.name}</b><br>${r.category}<br>${r.description}`
        );
      });
  }
  updateFilters() {
    this.updateMap();
    this.cdr.detectChanges(); // Ensure UI refresh
  }
  ngOnDestroy() {
    if (this.updateSub) this.updateSub.unsubscribe();
  }

  handleRealTimeUpdate(item: any) {
    const index = this.approved.findIndex(r => r.id === item.id);
    if (item.status === 'APPROVED') {
      if (index > -1) this.approved[index] = item;
      else this.approved.push(item);
    } else if (index > -1) {
      this.approved.splice(index, 1);
    }
    this.updateFilters(); // Changed to updateFilters to apply search/category
  }
}

// Small helper to ensure the Marker import is handled
import { Marker } from 'leaflet';
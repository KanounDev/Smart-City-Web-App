import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { latLng, tileLayer, marker, Layer, Map as LeafletMap, Icon, icon, Marker } from 'leaflet'; // Added Marker
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
  categories: any[] = [];
  layers: Layer[] = [];
  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      })
    ],
    zoom: 12,
    center: latLng(36.8065, 10.1815) // Tunis coordinates
  };
  searchQuery: string = '';
  selectedCategory: string = '';
  private updateSub!: Subscription;
  private map!: LeafletMap;

  // NEW: User location and error handling
  userLocation: { lat: number; lng: number } | null = null;
  locationError: string | null = null;

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
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
    className: 'red-marker'
  });

  ngOnInit() {
    this.fixLeafletIcons(); // Call the fix on init
    this.loadCategories();
    this.getUserLocation(); // NEW: Get location first

    if (this.requestService.getUpdates) {
      this.updateSub = this.requestService.getUpdates().subscribe((updatedItem: any) => {
        this.handleRealTimeUpdate(updatedItem);
        this.cdr.detectChanges();
      });
    }
  }

  // NEW: Get user location
  private getUserLocation() {
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser.';
      this.loadApprovedRequests();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('User location:', this.userLocation);
        this.loadApprovedRequests();
      },
      (error) => {
        console.error('Geolocation error:', error);
        this.locationError = 'Unable to access your location. Showing all approved businesses.';
        this.loadApprovedRequests(); // Fallback: load without distance filter
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }

  loadCategories() {
    this.requestService.getCategories().subscribe(cats => {
      this.categories = cats;
      this.cdr.detectChanges();
    });
  }

  // Updated: Load from public endpoint
  private loadApprovedRequests() {
    this.requestService.getApprovedPublic().subscribe({ // NEW: Use public endpoint
      next: (requests) => {
        this.approved = requests;
        this.updateFilters();
      },
      error: (err) => {
        console.error('Failed to load approved requests', err);
      }
    });
  }

  onMapReady(map: LeafletMap) {
    this.map = map;
    this.getCurrentLocation();
  }

  get filteredApproved() {
    const query = this.searchQuery.toLowerCase();
    let filtered = this.approved.filter(item => {
      // NEW: Must have lat/lng
      if (item.lat == null || item.lng == null) return false;

      // NEW: Distance filter if location available
      if (this.userLocation) {
        const distance = this.calculateDistance(
          this.userLocation.lat,
          this.userLocation.lng,
          item.lat,
          item.lng
        );
        if (distance > 10) return false; // > 10 km → exclude
      }

      return (
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.address?.toLowerCase().includes(query)
      );
    });

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

      // Use the custom visitorIcon here
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

  // NEW: Haversine distance formula (in km)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in km
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
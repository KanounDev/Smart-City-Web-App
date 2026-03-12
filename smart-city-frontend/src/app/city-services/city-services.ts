import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { latLng, tileLayer, marker, Layer, Map as LeafletMap, Icon, icon, Marker } from 'leaflet';
import { CityServicesService } from './city-services.service';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-city-services',
  standalone: true,
  imports: [CommonModule, FormsModule, LeafletModule],
  templateUrl: './city-services.html',
  styleUrls: ['./city-services.css']
})
export class CityServicesComponent implements OnInit, OnDestroy {
  services: any[] = [];
  layers: Layer[] = [];
  selectedType: string = '';
  searchQuery: string = '';

  private map!: LeafletMap;
  private pollSub?: Subscription;

  options = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '(c) OpenStreetMap contributors'
      })
    ],
    zoom: 12,
    center: latLng(36.8065, 10.1815)
  };

  constructor(private cityServices: CityServicesService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.fixLeafletIcons();
    this.loadServices();
    this.pollSub = interval(15000).subscribe(() => this.loadServices());
  }

  onMapReady(map: LeafletMap) {
    this.map = map;
  }

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
    Marker.prototype.options.icon = defaultIcon;
  }

  loadServices() {
    this.cityServices.getAll().subscribe({
      next: (data) => {
        this.services = data || [];
        this.updateMap();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load city services', err)
    });
  }

  get filteredServices() {
    const query = this.searchQuery.toLowerCase();
    let filtered = this.services.filter(s => {
      if (s.lat == null || s.lng == null) return false;
      return (
        s.name?.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.address?.toLowerCase().includes(query)
      );
    });

    if (this.selectedType) {
      filtered = filtered.filter(s => s.type === this.selectedType);
    }
    return filtered;
  }

  updateMap() {
    this.layers = this.filteredServices.map(s => {
      const popup = `<b>${s.name}</b><br>${s.type}<br>${s.description || ''}`;
      return marker([s.lat, s.lng]).bindPopup(popup);
    });
  }

  ngOnDestroy() {
    if (this.pollSub) this.pollSub.unsubscribe();
  }
}

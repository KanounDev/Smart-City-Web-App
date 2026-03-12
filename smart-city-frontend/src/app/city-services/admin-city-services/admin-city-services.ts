import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CityServicesService } from '../city-services.service';

@Component({
  selector: 'app-admin-city-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-city-services.html',
  styleUrls: ['./admin-city-services.css']
})
export class AdminCityServicesComponent implements OnInit {
  services: any[] = [];
  loading = false;

  form: any = {
    id: null,
    name: '',
    type: 'HEALTH',
    description: '',
    address: '',
    lat: null,
    lng: null
  };

  constructor(private cityServices: CityServicesService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.cityServices.getAll().subscribe({
      next: (data) => {
        this.services = data || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load city services', err);
        this.loading = false;
      }
    });
  }

  edit(service: any) {
    this.form = { ...service };
  }

  resetForm() {
    this.form = {
      id: null,
      name: '',
      type: 'HEALTH',
      description: '',
      address: '',
      lat: null,
      lng: null
    };
  }

  save() {
    if (!this.form.name || this.form.lat == null || this.form.lng == null) {
      alert('Name and location are required.');
      return;
    }

    const payload = {
      name: this.form.name,
      type: this.form.type,
      description: this.form.description,
      address: this.form.address,
      lat: Number(this.form.lat),
      lng: Number(this.form.lng)
    };

    if (this.form.id) {
      this.cityServices.update(this.form.id, payload).subscribe({
        next: () => {
          this.load();
          this.resetForm();
        },
        error: (err) => {
          console.error('Update failed', err);
          alert('Failed to update service.');
        }
      });
    } else {
      this.cityServices.create(payload).subscribe({
        next: () => {
          this.load();
          this.resetForm();
        },
        error: (err) => {
          console.error('Create failed', err);
          alert('Failed to create service.');
        }
      });
    }
  }

  delete(service: any) {
    if (!confirm('Delete this service?')) return;
    this.cityServices.delete(service.id).subscribe({
      next: () => {
        this.services = this.services.filter(s => s.id !== service.id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete failed', err);
        alert('Failed to delete service.');
      }
    });
  }

  useCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation not supported.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.lat = pos.coords.latitude;
        this.form.lng = pos.coords.longitude;
        this.cdr.detectChanges();
      },
      (err) => {
        console.error('Geolocation error', err);
        alert('Unable to access location.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }
}

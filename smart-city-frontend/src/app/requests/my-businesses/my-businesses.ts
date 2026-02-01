import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequestService } from '../request.service';

interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  description: string;
  documents: string[];
  lat?: number;
  lng?: number;
}

interface Service {
  id?: string;
  name: string;
  description: string;
  price: string;
}
interface Review {  // Added Review interface
  id: string;
  userId: string;  // Username
  comment: string;
  rating: number;
  date: string;
}
@Component({
  selector: 'app-my-businesses',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-businesses.html',
  styleUrls: ['./my-businesses.css']
})
export class MyBusinessesComponent implements OnInit {
  businesses: Business[] = [];
  selectedBusiness: Business | null = null;
  services: Service[] = [];
  reviews: Review[] = [];
  isLoadingBusinesses = true;
  isLoadingReviews = false;
  isLoadingServices = false;

  // Editing
  editingIndex: number | null = null;
  editForm: Service = { name: '', description: '', price: '' };

  // Add modal
  showAddModal = false;
  newService: Service = { name: '', description: '', price: '' };

  // Delete modal
  showDeleteModal = false;
  serviceToDeleteIndex: number | null = null;
  serviceToDelete: Service | null = null;

  constructor(
    private requestService: RequestService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.requestService.getMyRequests().subscribe({
      next: (allRequests) => {
        this.businesses = allRequests
          .filter(r => r.status === 'APPROVED')
          .map(r => ({
            id: r.id,
            name: r.name,
            category: r.category,
            address: r.address,
            description: r.description,
            documents: r.documents || [],
            lat: r.lat,
            lng: r.lng
          }));
        this.isLoadingBusinesses = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load businesses', err);
        this.isLoadingBusinesses = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Add Service Modal
  openAddModal() {
    this.newService = { name: '', description: '', price: '' };
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  saveNewService() {
    if (!this.selectedBusiness || !this.newService.name) return;

    this.requestService.addService({
      ...this.newService,
      businessId: this.selectedBusiness.id
    }).subscribe({
      next: (saved) => {
        this.services.push(saved);
        this.closeAddModal();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to add service');
      }
    });
  }

  // Inline Edit
  startEdit(index: number) {
    this.editingIndex = index;
    const service = this.services[index];
    this.editForm = { ...service };
  }

  cancelEdit() {
    this.editingIndex = null;
  }

  saveEdit(index: number) {
    if (!this.services[index].id || !this.editForm.name) return;

    this.requestService.updateService(this.services[index].id!, this.editForm).subscribe({
      next: (saved) => {
        this.services[index] = saved;
        this.editingIndex = null;
        this.cdr.detectChanges();
      },
      error: () => alert('Failed to update service')
    });
  }

  // Delete Modal
  openDeleteModal(index: number) {
    this.serviceToDeleteIndex = index;
    this.serviceToDelete = { ...this.services[index] };
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.serviceToDeleteIndex = null;
    this.serviceToDelete = null;
  }

  confirmDelete() {
    if (this.serviceToDeleteIndex === null || !this.services[this.serviceToDeleteIndex].id) {
      this.cancelDelete();
      return;
    }

    const id = this.services[this.serviceToDeleteIndex].id!;
    this.requestService.deleteService(id).subscribe({
      next: () => {
        this.services.splice(this.serviceToDeleteIndex!, 1);
        this.cancelDelete();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        alert('Failed to delete service');
        this.cancelDelete();
      }
    });
  }

  // Selection & Loading
  selectBusiness(business: Business) {
    this.selectedBusiness = business;
    this.loadServices(business.id);
    this.loadReviews(business.id);
  }

  loadServices(businessId: string) {
    this.isLoadingServices = true;
    this.services = [];

    this.requestService.getServicesByBusinessId(businessId).subscribe({
      next: (data) => {
        this.services = data || [];
        this.isLoadingServices = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load services', err);
        this.isLoadingServices = false;
        this.cdr.detectChanges();
      }
    });
  }
  loadReviews(businessId: string) {
    this.isLoadingReviews = true;
    this.reviews = [];

    this.requestService.getReviewsByBusinessId(businessId).subscribe({
      next: (data) => {
        this.reviews = data || [];
        this.isLoadingReviews = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load reviews', err);
        this.isLoadingReviews = false;
        this.cdr.detectChanges();
      }
    });
  }
}
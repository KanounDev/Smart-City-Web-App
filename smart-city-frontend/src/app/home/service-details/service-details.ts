import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; 
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { RequestService } from '../../requests/request.service';

interface Service {
  id: string;
  name: string;
  description: string;
  price: string;
}

interface Review {
  id: string;
  userId: string;
  comment: string;
  rating: number;
  date: string;
}

@Component({
  selector: 'app-service-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-details.html',
  styleUrls: ['./service-details.css']
})
export class ServiceDetailsComponent implements OnInit {
  shop: any = {};
  services: Service[] = [];
  reviews: Review[] = [];
  newReview: { comment: string; rating: number } = { comment: '', rating: 0 };
  businessId: string = '';
  isLoading = true;  

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private requestService: RequestService,
    private cdr: ChangeDetectorRef  
  ) { }

  ngOnInit() {
    this.businessId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.businessId) {
      this.router.navigate(['/']);
      return;
    }

    this.requestService.getBusinessById(this.businessId).subscribe({
      next: (data) => {
        console.log('Loaded business data:', data);
        this.shop = data || {};
        this.cdr.detectChanges();  
      },
      error: (err) => {
        console.error('Failed to load business:', err);
        this.router.navigate(['/']);
      },
      complete: () => {
        this.checkLoadingComplete();
      }
    });

    this.requestService.getServicesByBusinessId(this.businessId).subscribe({
      next: (data) => {
        console.log('Loaded services data:', data);
        this.services = data || [];
        this.cdr.detectChanges();  
      },
      error: (err) => console.error('Failed to load services:', err),
      complete: () => {
        this.checkLoadingComplete();
      }
    });

    this.requestService.getReviewsByBusinessId(this.businessId).subscribe({
      next: (data) => {
        console.log('Loaded reviews data:', data);
        this.reviews = data || [];
        this.cdr.detectChanges(); 
      },
      error: (err) => console.error('Failed to load reviews:', err),
      complete: () => {
        this.checkLoadingComplete();
      }
    });
  }

  private checkLoadingComplete() {
    if (this.shop.id && this.services && this.reviews) {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  submitReview() {
    if (!this.newReview.comment || this.newReview.rating < 1 || this.newReview.rating > 5) {
      alert('Please provide a valid review and rating.');
      return;
    }

    const reviewPayload = {
      businessId: this.businessId,
      comment: this.newReview.comment,
      rating: this.newReview.rating
    };

    this.requestService.addReview(reviewPayload).subscribe({
      next: (savedReview) => {
        this.reviews.push(savedReview);
        this.newReview = { comment: '', rating: 0 };
        this.cdr.detectChanges();  
      },
      error: (err) => {
        console.error('Failed to submit review:', err);
        alert('Failed to submit review. Please try again.');
      }
    });
  }
}
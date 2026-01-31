import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
interface Shop {                          // ← add this interface
    id: string;
    name: string;
    description: string;
    category: string;
    address: string;
    documents: { name: string; url: string }[] | undefined; // allow undefined if needed
}
@Component({
    selector: 'app-service-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './service-details.html',
    styleUrls: ['./service-details.css']
})
export class ServiceDetailsComponent {
    // Static sample data (will come from route param / API later)
    shop: Shop = {
        id: '6976a333a57d698fb3175b',
        name: 'Amel Shoes',
        description: 'A nice shop to buy comfortable and stylish shoes.',
        category: 'Shop',
        address: 'El Ghazela, Ariana',
        documents: [                                 // ← always initialize as array
            { name: 'Shop License.pdf', url: '#' },
            { name: 'Photo of interior.jpg', url: '#' }
        ]
    };

    services = [
        { name: 'Running Shoes', description: 'Lightweight sports shoes', price: '89 TND' },
        { name: 'Casual Sneakers', description: 'Everyday comfortable wear', price: '65 TND' },
        { name: 'Formal Leather', description: 'Business and elegant style', price: '120 TND' }
    ];

    reviews = [
        { user: 'Citizen123', date: 'Jan 15, 2026', comment: 'Great selection and friendly staff! Shoes are durable.' },
        { user: 'TunisShopper', date: 'Jan 20, 2026', comment: 'Prices are fair, but wish they had more sizes in stock.' }
    ];

    constructor(private router: Router, private route: ActivatedRoute) {
        // Later: this.route.snapshot.paramMap.get('id') to load real data
    }

    goBack() {
        this.router.navigate(['/']);
    }
}
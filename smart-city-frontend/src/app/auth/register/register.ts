import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent {
  user = { username: '', password: '', role: 'OWNER' };  // Default to OWNER

  constructor(private authService: AuthService, private router: Router) {}

 register() {
  this.authService.register(this.user).subscribe((response: any) => {
    this.authService.saveToken(response.token);  // ← extract 'token' here
    this.router.navigate(['/']);
  });
}
}
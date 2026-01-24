import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  user = { username: '', password: '' };

  constructor(private authService: AuthService, private router: Router) {}

  login() {
  this.authService.login(this.user).subscribe((response: any) => {
    this.authService.saveToken(response.token);  // ← extract 'token' here
    this.router.navigate(['/']);
  });
}
}
import { Routes } from '@angular/router';
import { HomeComponent } from './home/home';
import { LoginComponent } from './auth/login/login';
import { RegisterComponent } from './auth/register/register';
import { SubmitRequestComponent } from './requests/submit-request/submit-request';
import { MyRequestsComponent } from './requests/my-requests/my-requests';
import { AdminPanelComponent } from './requests/admin-panel/admin-panel';
import { CommunicationsComponent } from './requests/communications/communications'; // New import
import { MyBusinessesComponent } from './requests/my-businesses/my-businesses'; // ← add
import { OwnerCommunicationsComponent } from './requests/owner-communications/owner-communications'; // New import
import { ServiceDetailsComponent } from './home/service-details/service-details'; // ← new import
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'submit', component: SubmitRequestComponent, canActivate: [authGuard], data: { role: 'OWNER' } },
  { path: 'my-requests', component: MyRequestsComponent, canActivate: [authGuard], data: { role: 'OWNER' } },
  { path: 'admin', component: AdminPanelComponent, canActivate: [authGuard], data: { role: 'ADMIN' } },
  { path: 'communications', component: CommunicationsComponent, canActivate: [authGuard], data: { role: 'ADMIN' } },
  { path: 'my-businesses', component: MyBusinessesComponent, canActivate: [authGuard], data: { role: 'OWNER' } }, // ← NEW
  { path: 'messages', component: OwnerCommunicationsComponent, canActivate: [authGuard], data: { role: 'OWNER' } } ,// New route
  { path: 'details/:id', component: ServiceDetailsComponent }
];
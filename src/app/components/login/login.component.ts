import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  isSignup = signal(false);
  email = signal('');
  password = signal('');
  fullName = signal('');
  age = signal<number | null>(null);
  address = signal('');
  sexuality = signal('');
  phoneNumber = signal('');
  error = signal('');
  rememberMe = signal(false);
  selectedRole = signal<'client' | 'admin'>('client');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  toggleSignup(): void {
    this.isSignup.set(true);
    this.error.set('');
  }

  toggleLogin(): void {
    this.isSignup.set(false);
    this.error.set('');
  }

  selectRole(role: 'client' | 'admin'): void {
    this.selectedRole.set(role);
    this.error.set('');
    // Clear form when switching roles
    this.email.set('');
    this.password.set('');
  }

  fillCredentials(): void {
    this.email.set('admin');
    this.password.set('admin123');
  }

  onSubmit(): void {
    this.error.set('');
    const email = this.email();
    const password = this.password();

    if (this.isSignup()) {
      // Validate all signup fields
      if (!email || !password || !this.fullName() || !this.age() || !this.address() || !this.sexuality() || !this.phoneNumber()) {
        this.error.set('Please fill in all fields');
        return;
      }

      // Validate age
      if (this.age()! < 1 || this.age()! > 120) {
        this.error.set('Please enter a valid age');
        return;
      }

      // Validate phone number (basic validation)
      if (this.phoneNumber().length < 10) {
        this.error.set('Please enter a valid phone number');
        return;
      }

      // Sign up always creates a client account
      if (this.authService.signup({
        email,
        password,
        fullName: this.fullName(),
        age: this.age()!,
        address: this.address(),
        sexuality: this.sexuality(),
        phoneNumber: this.phoneNumber()
      })) {
        this.router.navigate(['/client/setup']);
      } else {
        this.error.set('Email already exists');
      }
    } else {
      if (!email || !password) {
        this.error.set('Please fill in all fields');
        return;
      }
      // Determine expected role based on selection
      const expectedRole = this.selectedRole() === 'admin' ? 'admin' : 'client';

      if (this.authService.login(email, password)) {
        const user = this.authService.currentUser();
        
        // Check if user role matches selected role
        if (user?.role !== expectedRole) {
          this.error.set(`Please login as ${expectedRole === 'admin' ? 'Gym Trainer' : 'Gym Member'}`);
          this.authService.logout();
          return;
        }

        if (user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (!user.profileComplete) {
          this.router.navigate(['/client/setup']);
        } else if (!user.approved) {
          this.router.navigate(['/client/waiting']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }
      } else {
        this.error.set('Invalid email or password');
      }
    }
  }
}

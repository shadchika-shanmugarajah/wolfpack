import { Component, signal, computed, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
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
  selectedRole = signal<'client' | 'admin' | null>(null);

  emailTouched = signal(false);
  passwordTouched = signal(false);
  showPassword = signal(false);

  isEmailValid = computed(() => {
    const emailStr = this.email().trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailStr);
  });

  isFormValid = computed(() => {
    if (this.isSignup()) {
      return !!this.email().trim() && this.isEmailValid() && !!this.password() &&
             !!this.fullName().trim() && (this.age() !== null && this.age()! >= 1 && this.age()! <= 120) &&
             !!this.address().trim() && !!this.sexuality() && this.phoneNumber().length >= 10;
    } else {
      return this.selectedRole() !== null && !!this.email().trim() && this.isEmailValid() && !!this.password();
    }
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const remember = localStorage.getItem('rememberMe') === 'true';
    this.rememberMe.set(remember);
    if (remember) {
      const emailVal = localStorage.getItem('rememberedEmail') || '';
      const roleVal = localStorage.getItem('rememberedRole') as 'client' | 'admin' | null;
      if (emailVal) {
        this.email.set(emailVal);
        this.emailTouched.set(true);
      }
      if (roleVal) {
        this.selectedRole.set(roleVal);
      }
    }
  }

  toggleSignup(): void {
    this.isSignup.set(true);
    this.error.set('');
    this.emailTouched.set(false);
    this.passwordTouched.set(false);
  }

  toggleLogin(): void {
    this.isSignup.set(false);
    this.error.set('');
    this.emailTouched.set(false);
    this.passwordTouched.set(false);
  }

  selectRole(role: 'client' | 'admin'): void {
    this.selectedRole.set(role);
    this.error.set('');
    
    // Check if we have a remembered email for this specific role
    const remember = localStorage.getItem('rememberMe') === 'true';
    const rememberedRole = localStorage.getItem('rememberedRole');
    if (remember && rememberedRole === role) {
      this.email.set(localStorage.getItem('rememberedEmail') || '');
      this.emailTouched.set(true);
    } else {
      this.email.set('');
      this.emailTouched.set(false);
    }
    
    this.password.set('');
    this.passwordTouched.set(false);
  }

  fillCredentials(): void {
    this.email.set('trainer@gym.com');
    this.password.set('admin123');
    this.emailTouched.set(true);
    this.passwordTouched.set(true);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(val => !val);
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
      if (!email || !password || !this.selectedRole()) {
        this.error.set('Please fill in all fields');
        return;
      }
      // Determine expected role based on selection
      const expectedRole = this.selectedRole() === 'admin' ? 'admin' : 'client';

      if (this.authService.login(email, password)) {
        const user = this.authService.currentUser();
        
        // Check if user role matches selected role
        if (user?.role !== expectedRole) {
          this.error.set(`Please login as ${expectedRole === 'admin' ? 'Trainer' : 'Member'}`);
          this.authService.logout();
          return;
        }

        // Store or clear remember me credentials
        if (this.rememberMe()) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedEmail', email);
          localStorage.setItem('rememberedRole', expectedRole);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberedEmail');
          localStorage.removeItem('rememberedRole');
        }

        if (user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (!user.profileComplete) {
          this.router.navigate(['/client/setup']);
        } else if (user.approvalStatus === 'rejected') {
          this.error.set('Your request was rejected. Please contact your trainer.');
          this.router.navigate(['/client/waiting']);
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

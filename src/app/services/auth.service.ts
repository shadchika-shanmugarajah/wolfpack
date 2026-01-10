import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'client';
  approved?: boolean;
  profileComplete?: boolean;
  fullName?: string;
  age?: number;
  address?: string;
  sexuality?: string;
  phoneNumber?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private users: User[] = [
    {
      id: '1',
      email: 'admin',
      password: 'admin123',
      role: 'admin',
      approved: true,
      profileComplete: true
    }
  ];

  currentUser = signal<User | null>(null);

  constructor(private router: Router) {
    // Always ensure admin user exists
    const defaultAdmin: User = {
      id: '1',
      email: 'admin',
      password: 'admin123',
      role: 'admin',
      approved: true,
      profileComplete: true
    };

    // Load users from localStorage if available
    const storedUsers = localStorage.getItem('allUsers');
    if (storedUsers) {
      const loadedUsers = JSON.parse(storedUsers);
      // Check if admin user exists in loaded users
      const adminExists = loadedUsers.find((u: User) => u.email === 'admin' && u.role === 'admin');
      if (!adminExists) {
        // Add default admin if not found
        this.users = [defaultAdmin, ...loadedUsers];
      } else {
        this.users = loadedUsers;
      }
    } else {
      // No stored users, use default admin
      this.users = [defaultAdmin];
    }
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser.set(JSON.parse(storedUser));
    }
  }

  login(emailOrUsername: string, password: string): boolean {
    const user = this.users.find(u => u.email === emailOrUsername && u.password === password);
    if (user) {
      this.currentUser.set(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  }

  signup(userData: {
    email: string;
    password: string;
    fullName: string;
    age: number;
    address: string;
    sexuality: string;
    phoneNumber: string;
  }): boolean {
    if (this.users.find(u => u.email === userData.email)) {
      return false; // User already exists
    }
    const newUser: User = {
      id: Date.now().toString(),
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      age: userData.age,
      address: userData.address,
      sexuality: userData.sexuality,
      phoneNumber: userData.phoneNumber,
      role: 'client',
      approved: false,
      profileComplete: false
    };
    this.users.push(newUser);
    this.currentUser.set(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));
    // Also save to localStorage for persistence
    const allUsers = JSON.parse(localStorage.getItem('allUsers') || '[]');
    allUsers.push(newUser);
    localStorage.setItem('allUsers', JSON.stringify(allUsers));
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }

  updateUserProfile(userId: string, profileData: any): void {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex] = { ...this.users[userIndex], ...profileData, profileComplete: true };
      if (this.currentUser()?.id === userId) {
        this.currentUser.set(this.users[userIndex]);
        localStorage.setItem('currentUser', JSON.stringify(this.users[userIndex]));
      }
    }
  }

  approveClient(userId: string): void {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].approved = true;
      if (this.currentUser()?.id === userId) {
        this.currentUser.set(this.users[userIndex]);
        localStorage.setItem('currentUser', JSON.stringify(this.users[userIndex]));
      }
      // Update in localStorage
      localStorage.setItem('allUsers', JSON.stringify(this.users));
    }
  }

  rejectClient(userId: string): void {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].approved = false;
      // Update in localStorage
      localStorage.setItem('allUsers', JSON.stringify(this.users));
    }
  }

  getAllUsers(): User[] {
    return this.users;
  }

  getPendingClients(): User[] {
    return this.users.filter(u => u.role === 'client' && !u.approved && u.profileComplete);
  }

  getApprovedClients(): User[] {
    return this.users.filter(u => u.role === 'client' && u.approved);
  }
}


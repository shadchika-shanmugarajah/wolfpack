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
  approvalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  dietPlanAssigned?: boolean;
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

  private persistUsers(): void {
    localStorage.setItem('allUsers', JSON.stringify(this.users));
  }

  private syncCurrentUserWithUsers(): void {
    const current = this.currentUser();
    if (!current) return;

    const latest = this.users.find(u => u.id === current.id);
    if (!latest) return;

    this.currentUser.set(latest);
    localStorage.setItem('currentUser', JSON.stringify(latest));
  }

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

    // Normalize state for backward compatibility with old localStorage users.
    this.users = this.users.map(user => {
      if (user.role === 'admin') {
        return {
          ...user,
          approvalStatus: 'approved'
        };
      }

      let derivedStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none';
      if (user.approved) {
        derivedStatus = 'approved';
      } else if (user.profileComplete) {
        derivedStatus = 'pending';
      }

      return {
        ...user,
        approvalStatus: user.approvalStatus || derivedStatus,
        dietPlanAssigned: user.dietPlanAssigned ?? false
      };
    });
    this.persistUsers();
    
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser.set(JSON.parse(storedUser));
      this.syncCurrentUserWithUsers();
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
      profileComplete: false,
      approvalStatus: 'none',
      dietPlanAssigned: false
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
      this.users[userIndex] = { ...this.users[userIndex], ...profileData };
      this.persistUsers();
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
      this.users[userIndex].approvalStatus = 'approved';
      if (this.currentUser()?.id === userId) {
        this.currentUser.set(this.users[userIndex]);
        localStorage.setItem('currentUser', JSON.stringify(this.users[userIndex]));
      }
      this.persistUsers();
    }
  }

  rejectClient(userId: string): void {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].approved = false;
      this.users[userIndex].approvalStatus = 'rejected';
      this.persistUsers();
    }
  }

  submitApprovalRequest(userId: string): void {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].profileComplete = true;
      this.users[userIndex].approved = false;
      this.users[userIndex].approvalStatus = 'pending';
      this.persistUsers();
      if (this.currentUser()?.id === userId) {
        this.currentUser.set(this.users[userIndex]);
        localStorage.setItem('currentUser', JSON.stringify(this.users[userIndex]));
      }
    }
  }

  markDietPlanAssigned(userId: string): void {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].dietPlanAssigned = true;
      this.persistUsers();
      if (this.currentUser()?.id === userId) {
        this.currentUser.set(this.users[userIndex]);
        localStorage.setItem('currentUser', JSON.stringify(this.users[userIndex]));
      }
    }
  }

  refreshCurrentUser(): User | null {
    const current = this.currentUser();
    if (!current) return null;

    const latest = this.users.find(u => u.id === current.id) || null;
    if (latest) {
      this.currentUser.set(latest);
      localStorage.setItem('currentUser', JSON.stringify(latest));
      return latest;
    }

    return current;
  }

  getAllUsers(): User[] {
    return this.users;
  }

  getPendingClients(): User[] {
    return this.users.filter(u => u.role === 'client' && u.approvalStatus === 'pending' && u.profileComplete);
  }

  getApprovedClients(): User[] {
    return this.users.filter(u => u.role === 'client' && u.approved);
  }
}


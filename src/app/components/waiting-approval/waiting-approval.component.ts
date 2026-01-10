import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-waiting-approval',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './waiting-approval.component.html',
  styleUrl: './waiting-approval.component.scss'
})
export class WaitingApprovalComponent {
  constructor(public authService: AuthService) {}
}




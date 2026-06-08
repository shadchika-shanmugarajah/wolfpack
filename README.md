# Gym Trainer Management Dashboard

A modern, responsive web dashboard for a Gym Trainer Management System with an approval-based access flow built with Angular.

## Features

### Client Flow
- **Login/Signup**: Simple authentication system
- **Initial Setup**: BMI calculator with color-coded results, allergies, medical conditions, and food preferences
- **Waiting for Approval**: Locked dashboard preview while waiting for trainer approval
- **Full Dashboard**: 
  - Daily activity tracking (workouts and meals)
  - Weight tracking
  - Progress charts (weight over time, completion rate)
  - Real-time completion percentage
- **Monthly Report**: Auto-generated reports with PDF download

### Admin Flow
- **Admin Dashboard**: Overview of pending and approved clients
- **Client Approval**: Review and approve/reject client registrations
- **Diet Plan Assignment**: Create food schedules with allergy warnings
- **Workout Plan Assignment**: Assign exercises, reps, sets, and daily steps
- **Client Progress Monitoring**: Track individual client progress and completion rates

## Design
- Professional fitness dashboard design
- White background with dark sidebar
- Color-coded statuses:
  - Green → Approved/Completed
  - Yellow → Pending
  - Red → Missed/Alert
- Card-based layout
- Modern typography

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
```bash
cd wolfpack
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:4200`

## Default Credentials

### Admin Account
- Email: `admin@gym.com`
- Password: `admin123`

### Client Account
- Create a new account through the signup page

## Project Structure

```
gym-tracker/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── login/              # Login/Signup component
│   │   │   ├── client-setup/       # Client initial profile setup
│   │   │   ├── waiting-approval/   # Waiting for approval screen
│   │   │   ├── client-dashboard/   # Full client dashboard
│   │   │   ├── monthly-report/     # Monthly report component
│   │   │   ├── admin-dashboard/    # Admin dashboard
│   │   │   ├── client-approval/    # Client approval screen
│   │   │   ├── diet-plan/          # Diet plan assignment
│   │   │   ├── workout-plan/       # Workout plan assignment
│   │   │   └── client-progress/    # Client progress monitoring
│   │   ├── services/
│   │   │   ├── auth.service.ts     # Authentication service
│   │   │   └── data.service.ts     # Data management service
│   │   ├── guards/
│   │   │   ├── auth.guard.ts       # Authentication guard
│   │   │   └── role.guard.ts       # Role-based access guard
│   │   └── app.routes.ts          # Application routes
│   └── styles.scss                 # Global styles
```

## Usage Flow

### For Clients:
1. Sign up with email and password
2. Complete initial profile setup (weight, height, allergies, etc.)
3. Wait for trainer approval
4. Once approved, access full dashboard
5. Track daily workouts and meals
6. View progress charts and monthly reports

### For Admins:
1. Login with admin credentials
2. View pending client requests
3. Review client profiles and approve/reject
4. Assign diet plans (with allergy warnings)
5. Assign workout plans
6. Monitor client progress

## Technologies Used

- Angular 19
- TypeScript
- SCSS
- LocalStorage (for data persistence)

## Notes

- Data is stored in browser localStorage
- All data persists across page refreshes
- The application uses signals for reactive state management
- Role-based routing ensures proper access control

## Development

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

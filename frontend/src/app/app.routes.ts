import { Routes } from '@angular/router';
import { authGuard } from './core/guards';


export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/auth.component').then(m => m.AuthComponent), data: { mode: 'login' } },
  { path: 'register', loadComponent: () => import('./pages/auth.component').then(m => m.AuthComponent), data: { mode: 'register' } },
  { path: '', canActivate: [authGuard()], loadComponent: () => import('./pages/home.component').then(m => m.HomeComponent) },
  { path: 'explore', canActivate: [authGuard()], loadComponent: () => import('./pages/explore.component').then(m => m.ExploreComponent) },
  { path: 'events/:id', canActivate: [authGuard()], loadComponent: () => import('./pages/event-detail.component').then(m => m.EventDetailComponent) },
  { path: 'artists/:id', canActivate: [authGuard()], loadComponent: () => import('./pages/artist-detail.component').then(m => m.ArtistDetailComponent) },
  { path: 'venues/:id', canActivate: [authGuard()], loadComponent: () => import('./pages/venue-detail.component').then(m => m.VenueDetailComponent) },
  { path: 'tickets/:code', canActivate: [authGuard()], loadComponent: () => import('./pages/ticket.component').then(m => m.TicketComponent) },
  { path: 'dashboard', canActivate: [authGuard('user')], loadComponent: () => import('./pages/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'assistant', canActivate: [authGuard('user')], loadComponent: () => import('./pages/assistant.component').then(m => m.AssistantComponent) },
  { path: 'organizer', canActivate: [authGuard('organizer', 'admin')], loadComponent: () => import('./pages/organizer.component').then(m => m.OrganizerComponent) },
  { path: 'admin', canActivate: [authGuard('admin')], loadComponent: () => import('./pages/admin.component').then(m => m.AdminComponent) },
  { path: '**', redirectTo: '' },
];

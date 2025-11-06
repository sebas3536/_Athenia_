import { Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

// COMPONENTS
import { Login as LoginComponent } from './components/authentication/login/login';
import { LandingPage as LandingPageComponent } from './components/landing-page/landing-page';
import { Register as RegisterComponent } from './components/authentication/register/register';
import { Dashboard as DashboardComponent } from './components/dashboard/dashboard';
import { DocumentComponent } from './components/document/document';
import { Search as SearchComponent } from './components/search/search';
import { Settings as SettingsComponent } from './components/settings/settings';
import { Security as SecurityComponent } from './components/security/security';
import { History as HistoryComponent } from './components/history/history';
import { Navbar as NavbarComponent } from './components/navbar/navbar';
import { ForgotPassword as ForgotPasswordComponent } from './components/authentication/forgot-password/forgot-password';
import { CheckEmail as CheckEmailComponent } from './components/authentication/check-email/check-email';
import { ResetPassword as ResetPasswordComponent } from './components/authentication/reset-password/reset-password';
import { PasswordChanged as PasswordChangedComponent } from './components/authentication/password-changed/password-changed';
import { TwoVerification as TwoVerificationComponent } from './components/authentication/login/two-verification/two-verification';
import { Users as usersComponent } from './components/users/users';

// CONVOCATORIAS
import { ConvocatoriasListComponent } from './components/convocatorias/pages/convocatorias-list/convocatorias-list.component';
import { ConvocatoriaDetailComponent } from './components/convocatorias/pages/convocatoria-detail/convocatoria-detail.component';

// GUARDS
import { twoFactorGuard } from './services/guards/twoFactorGuard';
import { authGuard } from './services/guards/auth-guard';
import { redirectIfAuthenticatedGuard } from './components/authentication/auth/RedirectIfAuthenticatedGuard';
import { roleGuard } from './services/guards/admin-guard';
import { convocatoriasAccessGuard } from './services/guards/convocatorias-access.guard';

export const routes: Routes = [
  // ========================================
  // RUTAS PÚBLICAS (Sin autenticación)
  // ========================================
  {
    path: '',
    component: LandingPageComponent,
    title: 'ATHENIA',
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar sesión',
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'twoverification',
    component: TwoVerificationComponent,
    title: 'Verificación 2FA',
    canActivate: [twoFactorGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Registro',
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'passwordreset',
    component: ForgotPasswordComponent,
    title: 'Recuperar contraseña',
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'checkemail',
    component: CheckEmailComponent,
    title: 'Verificar correo',
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'resetpassword',
    component: ResetPasswordComponent,
    title: 'Restablecer contraseña',
    canActivate: [redirectIfAuthenticatedGuard],
  },
  {
    path: 'passwordchanged',
    component: PasswordChangedComponent,
    title: 'Contraseña actualizada',
    canActivate: [redirectIfAuthenticatedGuard],
  },

  // ========================================
  //  RUTAS PROTEGIDAS (Con autenticación)
  // ========================================
  {
    path: '',
    component: NavbarComponent,
    canActivate: [authGuard],
    children: [
      //  RUTAS PARA USUARIOS Y ADMINISTRADORES
      {
        path: 'document',
        component: DocumentComponent,
        canActivate: [roleGuard],
        title: 'Documentos',
        data: { roles: ['user', 'admin'] },
      },
      {
        path: 'search',
        component: SearchComponent,
        canActivate: [roleGuard],
        title: 'Búsqueda',
        data: { roles: ['user', 'admin'] },
      },
      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [roleGuard],
        title: 'Configuraciones',
        data: { roles: ['user', 'admin'] },
      },
      {
        path: 'security',
        component: SecurityComponent,
        canActivate: [roleGuard],
        title: 'Seguridad',
        data: { roles: ['user', 'admin'] },
      },

      // 👑 RUTAS SOLO PARA ADMINISTRADORES
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [roleGuard],
        title: 'Panel de control',
        data: { roles: ['admin'] },
      },

      // ✅ CONVOCATORIAS CON NUEVO GUARD
      {
        path: 'applications',
        canActivate: [convocatoriasAccessGuard],
        canActivateChild: [convocatoriasAccessGuard],
        children: [
          {
            path: '',
            component: ConvocatoriasListComponent,
            title: 'Convocatorias',
          },
          {
            path: ':id',
            component: ConvocatoriaDetailComponent,
            title: 'Detalle de convocatoria',
          },
          {
            path: ':id/edit',
            component: ConvocatoriasListComponent,
            title: 'Editar convocatoria',
          },
        ],
      },

      {
        path: 'users',
        component: usersComponent,
        canActivate: [roleGuard],
        title: 'Usuarios',
        data: { roles: ['admin'] },
      },
      {
        path: 'history',
        component: HistoryComponent,
        canActivate: [roleGuard],
        title: 'Historial',
        data: { roles: ['admin'] },
      },

      // Redirección por defecto
      {
        path: '',
        redirectTo: 'document',
        pathMatch: 'full',
      },
    ],
  },

  // ========================================
  //  RUTA 404
  // ========================================
  { path: '**', redirectTo: '/' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
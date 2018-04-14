import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProjectsComponent } from './projects/projects.component';

import { HelpersComponent } from './helpers/helpers.component';
import { ProjectHelpersComponent } from './project-helpers/project-helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
import { LoggedInGuard, AdminGuard, NotLoggedInGuard } from './auth/auth-guard';


const routes: Routes = [

  {
    path: 'projects', component: ProjectsComponent, canActivate: [AdminGuard], data: { name: 'אירועים' }
  },

  { path: 'login', component: LoginComponent, data: { name: 'כניסה' } },
  { path: 'register', component: RegisterComponent, data: { name: 'הרשמה' }, canActivate: [NotLoggedInGuard] },
  {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבות' },
    canActivate: [AdminGuard]
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes)
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }

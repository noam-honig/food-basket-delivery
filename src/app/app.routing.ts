import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { ProjectsComponent } from './projects/projects.component';

import { HelpersComponent } from './helpers/helpers.component';
import { ProjectHelpersComponent } from './project-helpers/project-helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
import { AuthGuard, routeCondition } from './auth/auth-guard';


const routes: Routes = [
  { path: 'home', component: HomeComponent },
  {
    path: 'projects', component: ProjectsComponent,
    canActivate: [AuthGuard],
    data: routeCondition(i => i.admin)
  },
  { path: 'projects-helpers', component: ProjectHelpersComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'helpers', component: HelpersComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes)
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { }

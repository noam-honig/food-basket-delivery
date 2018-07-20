import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { EventsComponent } from './events/events.component';

import { HelpersComponent } from './helpers/helpers.component';
import { EventHelpersComponent } from './event-helpers/event-helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
import { LoggedInGuard, AdminGuard, NotLoggedInGuard } from './auth/auth-guard';
import { MyEventsComponent } from './my-events/my-events.component';
import { UpdateInfoComponent } from './users/update-info/update-info.component';
import { FamiliesComponent } from './families/families.component';
import { MyFamiliesComponent } from './my-families/my-families.component';
import { AsignFamilyComponent } from './asign-family/asign-family.component';
import { ManageComponent } from './manage/manage.component';
import { FixAddressComponent } from './fix-address/fix-address.component';
import { LoginFromSmsComponent } from './login-from-sms/login-from-sms.component';
import { DeliveryFollowUpComponent } from './delivery-follow-up/delivery-follow-up.component';
import { SelectFamilyComponent } from './select-family/select-family.component';
import { StamTestComponent } from './stam-test/stam-test.component';


const routes: Routes = [
  
  {

    path: FamiliesComponent.route,
    component: FamiliesComponent,
    data: { name: FamiliesComponent.caption }, canActivate: [AdminGuard]
  },

  {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [LoggedInGuard], data: { name: 'משפחות שלי' }
  },
  {
    path: 'assign-families', component: AsignFamilyComponent, canActivate: [AdminGuard], data: { name: 'שיוך משפחות' }
  },
  {
    path: 'delivery-follow-up', component: DeliveryFollowUpComponent, canActivate: [AdminGuard], data: { name: 'מעקב משלוחים' }
  },
  {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבות' }, canActivate: [AdminGuard]
  },

  {
    path: 'manage',
    component: ManageComponent,
    data: { name: 'ניהול' }, canActivate: [AdminGuard]
  },
  {
    path: 'addresses',
    component: FixAddressComponent,
    data: { name: 'טיוב כתובות' }, canActivate: [AdminGuard]
  },
  {
    path: 'x/:id',
    component: LoginFromSmsComponent
  },
  {
    path:'stam-test',
    component:StamTestComponent
  },
  /*{
    path: 'events', component: EventsComponent, canActivate: [AdminGuard], data: { name: 'אירועים' }
  },
  {
    path: 'my-events', component: MyEventsComponent, canActivate: [LoggedInGuard], data: { name: 'אירועים שלי' }
  },*/
  { path: 'update-info', component: UpdateInfoComponent, data: { name: 'עדכני פרטים' }, canActivate: [LoggedInGuard] },
  { path: 'login', component: LoginComponent, data: { name: 'כניסה' } },
  { path: 'register', component: RegisterComponent, data: { name: 'הרשמה' }, canActivate: [NotLoggedInGuard] },
  { path: '', redirectTo: '/families', pathMatch: 'full' },
  { path: '**', redirectTo: '/familiesP', pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes
      //  ,{enableTracing:true}
    )
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { } 

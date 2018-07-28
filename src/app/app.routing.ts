import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';

import { HelpersComponent } from './helpers/helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
import { LoggedInGuard, AdminGuard, NotLoggedInGuard } from './auth/auth-guard';
import { UpdateInfoComponent } from './users/update-info/update-info.component';
import { FamiliesComponent } from './families/families.component';
import { MyFamiliesComponent } from './my-families/my-families.component';
import { AsignFamilyComponent } from './asign-family/asign-family.component';
import { ManageComponent } from './manage/manage.component';
import { FixAddressComponent } from './fix-address/fix-address.component';
import { LoginFromSmsComponent } from './login-from-sms/login-from-sms.component';
import { DeliveryFollowUpComponent } from './delivery-follow-up/delivery-follow-up.component';
import { NewsComponent } from './news/news.component';
import { DeliveryEventsComponent } from './delivery-events/delivery-events.component';
import { StamTestComponent } from './stam-test/stam-test.component';
import { PrintHelperFamiliesComponent } from './print-helper-families/print-helper-families.component';


const routes: Routes = [

  {

    path: FamiliesComponent.route,
    component: FamiliesComponent,
    data: { name: FamiliesComponent.caption }, canActivate: [AdminGuard]
  },

  {
    path: 'assign-families', component: AsignFamilyComponent, canActivate: [AdminGuard], data: { name: 'שיוך משפחות' }
  },
  {
    path: 'delivery-follow-up', component: DeliveryFollowUpComponent, canActivate: [AdminGuard], data: { name: 'מעקב משלוחים' }
  },
  {
    path: 'news', component: NewsComponent, canActivate: [AdminGuard], data: { name: 'חדשות' }
  },
  
  {
    path: 'helpers',
    component: HelpersComponent,
    data: { name: 'מתנדבות' }, canActivate: [AdminGuard]
  },
  {
    path: 'delivery-events',
    component: DeliveryEventsComponent,
    data: { name: 'אירועי חלוקה' }, canActivate: [AdminGuard]
  },
  {
    path: 'manage',
    component: ManageComponent,
    data: { name: 'הגדרות מערכת' }, canActivate: [AdminGuard]
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
  /*{ path: 'stam-test', component: StamTestComponent },*/
  { path: 'print-helper-families/:id', component: PrintHelperFamiliesComponent },
  {
    path: 'my-families', component: MyFamiliesComponent, canActivate: [LoggedInGuard], data: { name: 'משפחות שלי' }
  },
  { path: 'update-info', component: UpdateInfoComponent, data: { name: 'הגדרות אישיות' }, canActivate: [LoggedInGuard] },
  { path: 'login', component: LoginComponent, data: { name: 'כניסה' } },
  { path: 'register', component: RegisterComponent, data: { name: 'הרשמה' }, canActivate: [NotLoggedInGuard] },
  { path: '', redirectTo: '/families', pathMatch: 'full' },
  { path: '**', redirectTo: '/families', pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes
       // ,{enableTracing:true}
    )
  ],
  declarations: [],
  exports: [RouterModule]
})
export class AppRoutingModule { } 

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes, RouteReuseStrategy } from '@angular/router';

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
import { CustomReuseStrategy } from './custom-reuse-controller-router-strategy'
import { evilStatics } from './auth/evil-statics';




const routes: Routes = [
  FamiliesComponent.route,
  AsignFamilyComponent.route,
  DeliveryFollowUpComponent.route,
  NewsComponent.route,
  HelpersComponent.route,
  DeliveryEventsComponent.route,
  ManageComponent.route,
  FixAddressComponent.route,
  LoginFromSmsComponent.route,
  /*{ path: 'stam-test', component: StamTestComponent },*/
  MyFamiliesComponent.route,
  UpdateInfoComponent.route,
  LoginComponent.route,
  RegisterComponent.route,
  { path: '', redirectTo: '/families', pathMatch: 'full' },
  { path: '**', redirectTo: '/families', pathMatch: 'full' }
];

evilStatics.routes.families = '/' + FamiliesComponent.route.path;
evilStatics.routes.login = '/' + LoginComponent.route.path;
evilStatics.routes.myFamilies = '/' + MyFamiliesComponent.route.path;
evilStatics.routes.register = '/' + RegisterComponent.route.path;
evilStatics.routes.updateInfo = '/' + UpdateInfoComponent.route.path;

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes
      // ,{enableTracing:true}
    )
  ],
  declarations: [],
  exports: [RouterModule],
  providers: [{ provide: RouteReuseStrategy, useClass: CustomReuseStrategy }]
})
export class AppRoutingModule { } 

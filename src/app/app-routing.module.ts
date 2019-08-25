import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes, RouteReuseStrategy } from '@angular/router';

import { HelpersComponent } from './helpers/helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';

import { UpdateInfoComponent } from './users/update-info/update-info.component';
import { FamiliesComponent } from './families/families.component';
import { MyFamiliesComponent } from './my-families/my-families.component';
import { AsignFamilyComponent } from './asign-family/asign-family.component';
import { ManageComponent } from './manage/manage.component';
import { DistributionMap } from './distribution-map/distribution-map.component';
import { LoginFromSmsComponent } from './login-from-sms/login-from-sms.component';
import { DeliveryFollowUpComponent } from './delivery-follow-up/delivery-follow-up.component';
import { NewsComponent } from './news/news.component';

import { ImportFromExcelComponent } from './import-from-excel/import-from-excel.component';
import { CustomReuseStrategy } from './custom-reuse-controller-router-strategy'

import { AddressProblemComponent } from './address-problem/address-problem.component';
import { SelfPickupComponent } from './self-pickup/self-pickup.component';
import { BatchOperationsComponent } from './batch-operations/batch-operations.component';
import { DeliveryHistoryComponent } from './delivery-history/delivery-history.component';
import { AdminGuard } from './auth/roles';
import { SignedInGuard } from 'radweb';



const routes: Routes = [
  AsignFamilyComponent.route,
  SelfPickupComponent.route,
  FamiliesComponent.route,
  NewsComponent.route,
  DeliveryFollowUpComponent.route,
  DistributionMap.route,
  AddressProblemComponent.route,
  HelpersComponent.route,
  DeliveryHistoryComponent.route,
  BatchOperationsComponent.route,
  { path: 'import-from-excel', component: ImportFromExcelComponent, canActivate: [AdminGuard], data: { name: 'קליטה מאקסל' } },
  ManageComponent.route,
  LoginFromSmsComponent.route,

  //{ path: 'stam-test', component: UpdateGroupDialogComponent },
  MyFamiliesComponent.route,
  UpdateInfoComponent.route,
  LoginComponent.route,
  RegisterComponent.route,

  { path: '', redirectTo: '/assign-families', pathMatch: 'full' },
  { path: '**', redirectTo: '/assign-families', pathMatch: 'full' }
];

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes
      //      ,{enableTracing:true}
    )
  ],
  declarations: [],
  exports: [RouterModule],
  providers: [{ provide: RouteReuseStrategy, useClass: CustomReuseStrategy }, AdminGuard]
})

export class AppRoutingModule { }

SignedInGuard.componentToNavigateIfNotAllowed = LoginComponent;
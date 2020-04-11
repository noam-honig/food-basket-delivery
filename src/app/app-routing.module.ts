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
import { AdminGuard, OverviewGuard, OverviewOrAdminGuard } from './auth/roles';
import { SignedInGuard } from '@remult/core';
import { CreateBackupExcelFileComponent, CanDeactivateGuard } from './create-backup-excel-file/create-backup-excel-file.component';
import { ImportHelpersFromExcelComponent } from './import-helpers-from-excel/import-helpers-from-excel.component';
import { PlaybackComponent } from './playback/playback.component';
import { OverviewComponent } from './overview/overview.component';
import { AssignEscortComponent } from './assign-escort/assign-escort.component';
import { TokenReplacerComponent } from './token-replacer/token-replacer.component';
import { TestMapComponent } from './test-map/test-map.component';




const routes: Routes = [

  AsignFamilyComponent.route,
  {
    path: 'assign-escort', component: AssignEscortComponent, canActivate: [AdminGuard], data: {
      name: 'שיוך מלווים'
    }
  },
  SelfPickupComponent.route,
  FamiliesComponent.route,
  DeliveryFollowUpComponent.route,
  NewsComponent.needsWorkRoute,
  NewsComponent.route,
  { path: 'overview', component: OverviewComponent, canActivate: [OverviewGuard] },
  DistributionMap.route,
  AddressProblemComponent.route,
  HelpersComponent.route,
  { path: 'overview', component: OverviewComponent, canActivate: [OverviewGuard] },
  { path: 'tr', component: TokenReplacerComponent, canActivate: [OverviewGuard], data: { name: 'סרטון החלוקה', hide: true }  },

  DeliveryHistoryComponent.route,
  { path: 'playback', component: PlaybackComponent, canActivate: [AdminGuard], data: { name: 'סרטון החלוקה', hide: true } },
  { path: 'testmap', component: TestMapComponent, canActivate: [AdminGuard], data: { name: 'סרטון החלוקה', hide: true } },

  BatchOperationsComponent.route,
  { path: 'import-from-excel', component: ImportFromExcelComponent, canActivate: [AdminGuard], data: { name: 'קליטת משפחות מאקסל' } },
  { path: 'import-helpers-from-excel', component: ImportHelpersFromExcelComponent, canActivate: [AdminGuard], data: { name: 'קליטת מתנדבים מאקסל' } },
  ManageComponent.route,
  { path: 'auto-backup', component: CreateBackupExcelFileComponent, canActivate: [AdminGuard], canDeactivate: [CanDeactivateGuard], data: { name: 'גיבוי אוטומטי', seperator: true } },
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
  providers: [{ provide: RouteReuseStrategy, useClass: CustomReuseStrategy }, AdminGuard, CanDeactivateGuard, OverviewGuard,OverviewOrAdminGuard]
})

export class AppRoutingModule { }

SignedInGuard.componentToNavigateIfNotAllowed = LoginComponent;
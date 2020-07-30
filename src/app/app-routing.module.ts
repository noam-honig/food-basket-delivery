import { NgModule, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes, RouteReuseStrategy, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { HelpersComponent } from './helpers/helpers.component';
import { LoginComponent } from './users/login/login.component';


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


import { SelfPickupComponent } from './self-pickup/self-pickup.component';

import { DeliveryHistoryComponent } from './delivery-history/delivery-history.component';

import { AdminGuard, OverviewGuard, distCenterAdminGuard, distCenterOrOverviewOrAdmin, OverviewOrAdminGuard, LabGuard } from './auth/roles';

import { SignedInGuard, Context } from '@remult/core';

import { ImportHelpersFromExcelComponent } from './import-helpers-from-excel/import-helpers-from-excel.component';
import { PlaybackComponent } from './playback/playback.component';
import { OverviewComponent } from './overview/overview.component';
import { AssignEscortComponent } from './assign-escort/assign-escort.component';

import { GeocodeComponent } from './geocode/geocode.component';

import { TokenReplacerComponent } from './token-replacer/token-replacer.component';
import { TestMapComponent } from './test-map/test-map.component';
import { FamilyDeliveriesComponent } from './family-deliveries/family-deliveries.component';
import { DuplicateFamiliesComponent } from './duplicate-families/duplicate-families.component';
import { EventsComponent } from './events/events.component';
import { DeliveryReceptionComponent } from './delivery-reception/delivery-reception.component';
import { RegisterDonorComponent } from './register-donor/register-donor.component';
import { RegisterHelperComponent } from './register-helper/register-helper.component';
import { Sites } from './sites/sites';


@Injectable()
export class MltOnlyGuard implements CanActivate {
    constructor(private context: Context) {

    }
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | import("@angular/router").UrlTree | import("rxjs").Observable<boolean | import("@angular/router").UrlTree> | Promise<boolean | import("@angular/router").UrlTree> {
        let site = Sites.getOrganizationFromContext(this.context);
        console.log(site,this.context.getPathInUrl());
        if (site == 'mlt')
            return true;
        return false;
    }


}



export const routes: Routes = [

  AsignFamilyComponent.route,
  {
    path: 'assign-escort', component: AssignEscortComponent, canActivate: [AdminGuard]
  },
  SelfPickupComponent.route,
  FamilyDeliveriesComponent.route,
  FamiliesComponent.route,
  DeliveryFollowUpComponent.route,
  NewsComponent.needsWorkRoute,
  { path: 'overview', component: OverviewComponent, canActivate: [OverviewGuard] },
  DistributionMap.route,

  HelpersComponent.route,
  { path: 'tr', component: TokenReplacerComponent, canActivate: [OverviewGuard], data: { hide: true } },

  {path: 'reception', component: DeliveryReceptionComponent, canActivate: [LabGuard], data: { name: 'קליטת משלוח' }},

  
  
  DeliveryHistoryComponent.route,
  { path: 'playback', component: PlaybackComponent, canActivate: [AdminGuard], data: { hide: true } },
  { path: 'geocode', component: GeocodeComponent, canActivate: [AdminGuard], data: { name: 'geocode', hide: true } },
  { path: 'testmap', component: TestMapComponent, canActivate: [AdminGuard], data: { hide: true } },
  { path: 'register-donor', component: RegisterDonorComponent,canActivate:[MltOnlyGuard] , data: { hide: true } },
  { path: 'register-helper', component: RegisterHelperComponent,canActivate:[MltOnlyGuard] , data: { hide: true } },
  
  
  { path: 'import-from-excel', component: ImportFromExcelComponent, canActivate: [AdminGuard] },
  { path: 'import-helpers-from-excel', component: ImportHelpersFromExcelComponent, canActivate: [AdminGuard] },
  { path: 'duplicate-families', component: DuplicateFamiliesComponent, canActivate: [AdminGuard] },
  ManageComponent.route,
  { path: 'events', component: EventsComponent, canActivate: [AdminGuard] },
  
  LoginFromSmsComponent.route,

  //{ path: 'stam-test', component: UpdateGroupDialogComponent },
  MyFamiliesComponent.route,
  UpdateInfoComponent.route,
  LoginComponent.route,
  

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
  providers: [{ provide: RouteReuseStrategy, useClass: CustomReuseStrategy }, AdminGuard, OverviewGuard, distCenterAdminGuard, distCenterOrOverviewOrAdmin, OverviewOrAdminGuard,LabGuard,MltOnlyGuard]

})

export class AppRoutingModule { }

SignedInGuard.componentToNavigateIfNotAllowed = LoginComponent;


import '../app/manage/ApplicationSettings';
import { NgModule, Injectable, ErrorHandler } from '@angular/core';
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

import { AdminGuard, OverviewGuard, distCenterAdminGuard, distCenterOrOverviewOrAdmin, OverviewOrAdminGuard, LabGuard, distCenterOrLabGuard, SignedInAndNotOverviewGuard, EventListGuard, FamilyAdminGuard, CallModuleGuard } from './auth/guards';
import { Roles } from './auth/roles';
import { AuthenticatedGuard } from '../app/common-ui-elements';
import { remult } from 'remult';

import { ImportHelpersFromExcelComponent } from './import-helpers-from-excel/import-helpers-from-excel.component';
import { PlaybackComponent } from './playback/playback.component';
import { OverviewComponent } from './overview/overview.component';
import { AssignEscortComponent } from './assign-escort/assign-escort.component';



import { TokenReplacerComponent } from './token-replacer/token-replacer.component';
import { TestMapComponent } from './test-map/test-map.component';
import { FamilyDeliveriesComponent } from './family-deliveries/family-deliveries.component';
import { DuplicateFamiliesComponent } from './duplicate-families/duplicate-families.component';
import { EventsComponent } from './events/events.component';
import { DeliveryReceptionComponent } from './delivery-reception/delivery-reception.component';
import { RegisterDonorComponent } from './register-donor/register-donor.component';
import { RegisterHelperComponent } from './register-helper/register-helper.component';
import { Sites } from './sites/sites';
import { InRouteFollowUpComponent } from './in-route-follow-up/in-route-follow-up.component';
import { ShipmentAssignScreenComponent } from './shipment-assign-screen/shipment-assign-screen.component';
import { VolunteerCrossAssignComponent } from './volunteer-cross-assign/volunteer-cross-assign.component';
import { WeeklyReportMltComponent } from './weekly-report-mlt/weekly-report-mlt.component';
import { HelperGiftsComponent } from './helper-gifts/helper-gifts.component';
import { RegisterURLComponent } from './resgister-url/regsiter-url.component';
import { PrintVolunteersComponent } from './print-volunteers/print-volunteers.component';
import { OrgEventsComponent } from './org-events/org-events.component';
import { PrintStickersComponent } from './print-stickers/print-stickers.component';
import { PrintVolunteerComponent } from './print-volunteer/print-volunteer.component';
import { IncomingMessagesComponent } from './incoming-messages/incoming-messages.component';
import { FamilySelfOrderComponent } from './family-self-order/family-self-order.component';
import { getSettings } from '../app/manage/ApplicationSettings';
import { CallerComponent } from './caller/caller.component';
import { AdjustGeocodeComponent } from './adjust-geocode/adjust-geocode.component';
import { ManageCallersComponent } from './manage-callers/manage-callers.component';
import { SpecificEventComponent } from './specific-event/specific-event.component';


@Injectable()
export class MltOnlyGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | import("@angular/router").UrlTree | import("rxjs").Observable<boolean | import("@angular/router").UrlTree> | Promise<boolean | import("@angular/router").UrlTree> {
    let site = Sites.getOrganizationFromContext();

    if (site == 'mlt')
      return true;
    return false;
  }


}

@Injectable()
export class MltAdminGuard implements CanActivate {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | import("@angular/router").UrlTree | import("rxjs").Observable<boolean | import("@angular/router").UrlTree> | Promise<boolean | import("@angular/router").UrlTree> {
    let site = Sites.getOrganizationFromContext();

    if (site == 'mlt')
      return remult.isAllowed(Roles.admin);
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
  { path: 'in-route-helpers', component: InRouteFollowUpComponent, canActivate: [MltAdminGuard], data: { name: 'מתנדבים בדרך' } },
  { path: 'cross-assign', component: ShipmentAssignScreenComponent, canActivate: [MltAdminGuard], data: { name: 'תורמים שטרם שויכו' } },
  { path: 'volunteer-cross-assign', component: VolunteerCrossAssignComponent, canActivate: [MltAdminGuard], data: { name: 'מתנדבים שטרם שויכו' } },
  FamiliesComponent.route,
  DeliveryFollowUpComponent.route,

  NewsComponent.needsWorkRoute,
  { path: 'overview', component: OverviewComponent, canActivate: [OverviewGuard] },
  DistributionMap.route,

  { path: 'fso/:id', component: FamilySelfOrderComponent },
  HelpersComponent.route,
  { path: 'tr', component: TokenReplacerComponent, canActivate: [OverviewGuard], data: { hide: true } },

  { path: 'reception', component: DeliveryReceptionComponent, canActivate: [LabGuard], data: { name: 'קליטת משלוח' } },



  DeliveryHistoryComponent.route,
  { path: 'playback', component: PlaybackComponent, canActivate: [AdminGuard], data: { hide: true, noBar: true } },
  { path: 'fix-address', component: AdjustGeocodeComponent, canActivate: [AdminGuard], data: { hide: true } },
  { path: 'print-volunteers', component: PrintVolunteersComponent, canActivate: [AdminGuard], data: { hide: true, noBar: true } },
  { path: 'print-stickers', component: PrintStickersComponent, canActivate: [AdminGuard], data: { hide: true, noBar: true, noConfHeaderAndBorders: true } },
  { path: 'print-volunteer', component: PrintVolunteerComponent, canActivate: [AdminGuard], data: { hide: true, noBar: true, noConfHeaderAndBorders: true } },

  { path: 'testmap', component: TestMapComponent, canActivate: [AdminGuard], data: { hide: true } },
  { path: 'register-donor', component: RegisterDonorComponent, canActivate: [MltOnlyGuard], data: { hide: true } },
  { path: 'register-donor-cc', component: RegisterDonorComponent, canActivate: [MltOnlyGuard], data: { hide: true, isCC: true } },
  { path: 'register-helper', component: RegisterHelperComponent, canActivate: [MltOnlyGuard], data: { hide: true } },


  { path: 'import-from-excel', component: ImportFromExcelComponent, canActivate: [FamilyAdminGuard] },
  { path: 'import-helpers-from-excel', component: ImportHelpersFromExcelComponent, canActivate: [AdminGuard] },
  { path: 'helper-gifts', component: HelperGiftsComponent, canActivate: [MltAdminGuard] },
  { path: 'register-url', component: RegisterURLComponent, canActivate: [MltAdminGuard] },

  { path: 'duplicate-families', component: DuplicateFamiliesComponent, canActivate: [AdminGuard] },
  ManageComponent.route,
  { path: 'sms-messages', component: IncomingMessagesComponent, canActivate: [AdminGuard] },
  LoginFromSmsComponent.route,

  //{ path: 'stam-test', component: UpdateGroupDialogComponent },
  MyFamiliesComponent.route,
  { path: 'caller', component: CallerComponent, canActivate: [CallModuleGuard], data: { name: "טלפונים לבירור פרטים" } },
  { path: 'manage-callers', component: ManageCallersComponent, canActivate: [CallModuleGuard, AdminGuard], data: { name: "ניהול טלפנים", hide: true } },
  { path: 'events', component: OrgEventsComponent },
  { path: 'events/:id', component: OrgEventsComponent },
  { path: 'event/:site/:id/:remote', component: SpecificEventComponent },
  { path: 'event/:site/:id', component: SpecificEventComponent },
  UpdateInfoComponent.route,
  LoginComponent.route,
  { path: 'weekly-report-mlt', component: WeeklyReportMltComponent, canActivate: [MltOnlyGuard] },


  { path: '', redirectTo: '/assign-families', pathMatch: 'full' },
  { path: '**', redirectTo: '/assign-families', pathMatch: 'full' }

];

@NgModule({
  imports: [
    CommonModule, RouterModule.forRoot(routes
      //,{enableTracing:true}
    )
  ],
  declarations: [],
  exports: [RouterModule],
  providers: [{ provide: RouteReuseStrategy, useClass: CustomReuseStrategy }, AdminGuard, FamilyAdminGuard, OverviewGuard, distCenterAdminGuard, distCenterOrOverviewOrAdmin, OverviewOrAdminGuard, LabGuard, distCenterOrLabGuard, MltOnlyGuard,
    MltAdminGuard, SignedInAndNotOverviewGuard, EventListGuard, CallModuleGuard]

})

export class AppRoutingModule { }

AuthenticatedGuard.componentToNavigateIfNotAllowed = LoginComponent;




import { BrowserModule, HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER, ErrorHandler } from '@angular/core';
import { AppRoutingModule, routes } from './app-routing.module';
import { AppComponent, routeMap } from './app.component';
import { RemultModule } from '@remult/angular';
import { MaterialModule } from './shared/material.module';
import { ChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { HelpersComponent } from './helpers/helpers.component';
import { JwtModule } from '@auth0/angular-jwt';

import { DialogService, ShowDialogOnErrorErrorHandler } from './select-popup/dialog';
import { YesNoQuestionComponent } from './select-popup/yes-no-question/yes-no-question.component';
import { LoginComponent } from './users/login/login.component';

import { AuthService, getToken, TokenService } from './auth/auth-service';

import { InputAreaComponent } from './select-popup/input-area/input-area.component';
import { UpdateInfoComponent } from './users/update-info/update-info.component';
import { FamiliesComponent } from './families/families.component';
import { MyFamiliesComponent } from './my-families/my-families.component';
import { AsignFamilyComponent } from './asign-family/asign-family.component';
import { ManageComponent } from './manage/manage.component';
import { FamilyInfoComponent } from './family-info/family-info.component';
import { GetVolunteerFeedback } from './update-comment/update-comment.component';
import { DistributionMap } from './distribution-map/distribution-map.component';
import { SelectHelperComponent } from './select-helper/select-helper.component';
import { LoginFromSmsComponent } from './login-from-sms/login-from-sms.component';
import { MapComponent } from './map/map.component';

import { DeliveryFollowUpComponent } from './delivery-follow-up/delivery-follow-up.component';
import { HelperFamiliesComponent } from './helper-families/helper-families.component';
import { SelectFamilyComponent } from './select-family/select-family.component';

import { ImportFromExcelComponent } from './import-from-excel/import-from-excel.component';

import { NewsComponent } from './news/news.component';
import { NewsFilterService } from "./news/news-filter-service";


import { UpdateFamilyDialogComponent } from './update-family-dialog/update-family-dialog.component';

import { SelfPickupComponent } from './self-pickup/self-pickup.component';

import { DeliveryHistoryComponent } from './delivery-history/delivery-history.component';
import { PreviewFamilyComponent } from './preview-family/preview-family.component';
import { FamilyInListComponent } from './family-in-list/family-in-list.component';

import { UpdateGroupDialogComponent } from './update-group-dialog/update-group-dialog.component';




import { SelectCompanyComponent } from './select-company/select-company.component';
import { HelperAssignmentComponent } from './helper-assignment/helper-assignment.component';
import { ImportHelpersFromExcelComponent } from './import-helpers-from-excel/import-helpers-from-excel.component';
import { PlaybackComponent } from './playback/playback.component';
import { APP_BASE_HREF } from '@angular/common';
import { environment } from '../environments/environment';
import { Sites } from './sites/sites';
import { ApplicationSettings, SettingsService } from './manage/ApplicationSettings';
import { OverviewComponent } from './overview/overview.component';
import { TransitionGroupComponent, TransitionGroupItemDirective } from './overview/transition-group';
import { AssignEscortComponent } from './assign-escort/assign-escort.component';
import { CommonQuestionsComponent } from './common-questions/common-questions.component';

import { SelectListComponent } from './select-list/select-list.component';
import { TokenReplacerComponent } from './token-replacer/token-replacer.component';
import { TestMapComponent } from './test-map/test-map.component';
import { FamilyDeliveriesComponent } from './family-deliveries/family-deliveries.component';
import { GridDialogComponent } from './grid-dialog/grid-dialog.component';
import { SiteOverviewComponent } from './site-overview/site-overview.component';
import { BasketSummaryComponent } from './basket-summary/basket-summary.component';
import { MergeFamiliesComponent } from './merge-families/merge-families.component';
import { DuplicateFamiliesComponent } from './duplicate-families/duplicate-families.component';
import { DateRangeComponent } from './date-range/date-range.component';
import { ShowOnMapComponent } from './show-on-map/show-on-map.component';
import { EventsComponent } from './events/events.component';
import { DeliveryReceptionComponent } from './delivery-reception/delivery-reception.component';
import { RegisterDonorComponent } from './register-donor/register-donor.component';
import { RegisterHelperComponent } from './register-helper/register-helper.component';
import { AddressInputComponent } from './address-input/address-input.component';
import { InRouteFollowUpComponent } from './in-route-follow-up/in-route-follow-up.component';
import { EditCommentDialogComponent } from './edit-comment-dialog/edit-comment-dialog.component';
import { ShipmentAssignScreenComponent } from './shipment-assign-screen/shipment-assign-screen.component';
import { VolunteerCrossAssignComponent } from './volunteer-cross-assign/volunteer-cross-assign.component';
import { WeeklyReportMltComponent } from './weekly-report-mlt/weekly-report-mlt.component';
import { PlatformModule } from '@angular/cdk/platform';
import { HelperGiftsComponent } from './helper-gifts/helper-gifts.component';
import { RegisterURLComponent } from './resgister-url/regsiter-url.component';

import { GeneralImportFromExcelComponent } from './import-gifts/import-from-excel.component';
import { MyGiftsDialogComponent } from './helper-gifts/my-gifts-dialog.component';
import { MltFamiliesComponent } from './mlt-families/mlt-families.component';
import { Context } from 'remult';
import { PrintVolunteersComponent } from './print-volunteers/print-volunteers.component';
import {  Helpers } from './helpers/helpers';
import { ImagesComponent } from './images/images.component';
import { DeliveryImagesComponent } from './delivery-images/delivery-images.component'
import { InitContext } from './helpers/init-context';
import { EventInfoComponent } from './event-info/event-info.component';
import { EventCardComponent } from './event-card/event-card.component';
import { OrgEventsComponent } from './org-events/org-events.component';



var site = Sites.initOnBrowserAndReturnAngularBaseHref();

export class MyHammerConfig extends HammerGestureConfig {
  overrides = <any>{
    swipe: { direction: 6 },
    pan: {
      direction: 6
    },
    pinch: {
      enable: false
    },
    rotate: {
      enable: false
    }
  };
}



@NgModule({
  declarations: [
    AppComponent,
    HelpersComponent,

    YesNoQuestionComponent,
    LoginComponent,

    InputAreaComponent,
    UpdateInfoComponent,
    FamiliesComponent,
    MyFamiliesComponent,
    AsignFamilyComponent,
    ManageComponent,
    FamilyInfoComponent,
    GetVolunteerFeedback,
    DistributionMap,
    SelectHelperComponent,

    LoginFromSmsComponent,
    MapComponent,

    DeliveryFollowUpComponent,
    HelperFamiliesComponent,
    SelectFamilyComponent,
    ImportFromExcelComponent,
    NewsComponent,
    UpdateFamilyDialogComponent,

    SelfPickupComponent,

    DeliveryHistoryComponent,
    PreviewFamilyComponent,
    FamilyInListComponent,
    UpdateGroupDialogComponent,



    SelectCompanyComponent,
    HelperAssignmentComponent,
    ImportHelpersFromExcelComponent,
    PlaybackComponent,
    OverviewComponent,
    TransitionGroupComponent,
    TransitionGroupItemDirective,
    AssignEscortComponent,
    CommonQuestionsComponent,
    SelectListComponent,
    TokenReplacerComponent,
    TestMapComponent,
    FamilyDeliveriesComponent,
    GridDialogComponent,
    SiteOverviewComponent,
    BasketSummaryComponent,
    MergeFamiliesComponent,
    DuplicateFamiliesComponent,
    DateRangeComponent,
    ShowOnMapComponent,
    EventsComponent,
    DeliveryReceptionComponent,
    RegisterDonorComponent,
    RegisterHelperComponent,
    AddressInputComponent,
    InRouteFollowUpComponent,
    EditCommentDialogComponent,
    ShipmentAssignScreenComponent,
    VolunteerCrossAssignComponent,
    WeeklyReportMltComponent,
    HelperGiftsComponent,
    RegisterURLComponent,
    GeneralImportFromExcelComponent,
    MyGiftsDialogComponent,
    MltFamiliesComponent,
    PrintVolunteersComponent,
    ImagesComponent,
    DeliveryImagesComponent,
    EventInfoComponent,
    EventCardComponent,
    OrgEventsComponent


  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgxPaginationModule,
    MaterialModule,
    BrowserAnimationsModule,
    RemultModule,
    AppRoutingModule,
    ChartsModule,
    PlatformModule,
    JwtModule.forRoot({
      config: { tokenGetter: getToken }
    })


  ],
  providers: [

    DialogService,
    { provide: ErrorHandler, useClass: ShowDialogOnErrorErrorHandler },

    NewsFilterService,
    TokenService,
    AuthService,
    {
      provide: APP_BASE_HREF, useFactory: () => {
        return '/' + site;
      }

    },
    {
      provide: ApplicationSettings, useFactory: (service: SettingsService) => {
        return service.instance;
      },
      deps: [SettingsService]

    },
    {
      provide: APP_INITIALIZER,
      deps: [TokenService, SettingsService, Context],
      useFactory: initApp,
      multi: true,

    },
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig,
    },

    SettingsService

  ],

  bootstrap: [AppComponent],
  entryComponents: [SelectHelperComponent,
    SelectFamilyComponent,
    SelectListComponent,
    CommonQuestionsComponent,
    YesNoQuestionComponent,
    InputAreaComponent,
    GridDialogComponent,
    UpdateFamilyDialogComponent, PreviewFamilyComponent,
    SelectCompanyComponent,
    HelperAssignmentComponent,
    MergeFamiliesComponent,
    SiteOverviewComponent,
    ShowOnMapComponent,
    GetVolunteerFeedback,
    UpdateGroupDialogComponent,
    BasketSummaryComponent,
    EditCommentDialogComponent,
    GeneralImportFromExcelComponent,
    MyGiftsDialogComponent]
})
export class AppModule { }


export function initApp(session: TokenService, settings: SettingsService, context: Context) {
  return async () => {

    try {
      await session.loadUserInfo();
      await context.userChange.observe(async () => {
        await InitContext(context);

      });

      await settings.init();

      var s = settings.instance;

      let l = settings.instance.lang;
      routeMap.set(AsignFamilyComponent, l.assignDeliveryMenu);
      routeMap.set(AssignEscortComponent, l.AssignEscortComponent);
      routeMap.set(SelfPickupComponent, l.SelfPickupComponent);
      routeMap.set(FamilyDeliveriesComponent, l.FamilyDeliveriesComponent);
      routeMap.set(FamiliesComponent, l.FamiliesComponent);
      routeMap.set(DeliveryFollowUpComponent, l.DeliveryFollowUpComponent);
      routeMap.set(NewsComponent, l.NewsComponent);
      routeMap.set(DistributionMap, l.DistributionMapComponent);
      routeMap.set(OverviewComponent, l.OverviewComponent);
      routeMap.set(HelpersComponent, l.HelpersComponent);
      routeMap.set(DeliveryHistoryComponent, l.DeliveryHistoryComponent);
      routeMap.set(PlaybackComponent, l.PlaybackComponent);
      routeMap.set(ImportFromExcelComponent, l.ImportFromExcelComponent);
      routeMap.set(ImportHelpersFromExcelComponent, l.ImportHelpersFromExcelComponent);
      routeMap.set(DuplicateFamiliesComponent, l.DuplicateFamiliesComponent);
      routeMap.set(ManageComponent, l.ManageComponent);
      routeMap.set(MyFamiliesComponent, l.MyFamiliesComponent);
      routeMap.set(UpdateInfoComponent, l.UpdateInfoComponent);
      routeMap.set(LoginComponent, l.LoginComponent);

      routeMap.set(EventsComponent, l.eventsComponent);

      routeMap.set(WeeklyReportMltComponent, l.weeklyReportMltComponent);

      routeMap.set(HelperGiftsComponent, l.HelperGiftsComponent);
      routeMap.set(RegisterURLComponent, l.RegisterURLComponent);





    }
    catch (err) {
      console.error('failed to get settings ', err);
    }
    return '';

  };
}

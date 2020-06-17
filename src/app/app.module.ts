

import { BrowserModule, HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AppRoutingModule, routes } from './app-routing.module';
import { AppComponent, routeMap } from './app.component';
import { RemultModule, Context, JwtSessionManager } from '@remult/core';
import { MaterialModule } from './shared/material.module';
import { ChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { HelpersComponent } from './helpers/helpers.component';

import { DialogService } from './select-popup/dialog';
import { YesNoQuestionComponent } from './select-popup/yes-no-question/yes-no-question.component';
import { LoginComponent } from './users/login/login.component';

import { AuthService } from './auth/auth-service';

import { InputAreaComponent } from './select-popup/input-area/input-area.component';
import { UpdateInfoComponent } from './users/update-info/update-info.component';
import { FamiliesComponent } from './families/families.component';
import { MyFamiliesComponent } from './my-families/my-families.component';
import { AsignFamilyComponent } from './asign-family/asign-family.component';
import { ManageComponent } from './manage/manage.component';
import { FamilyInfoComponent } from './family-info/family-info.component';
import { UpdateCommentComponent } from './update-comment/update-comment.component';
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


import { ScrollDispatchModule } from '@angular/cdk/scrolling';

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
import { GeocodeComponent } from './geocode/geocode.component';
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
    UpdateCommentComponent,
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
    GeocodeComponent,
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
    EventsComponent
    

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
    ScrollDispatchModule

  ],
  providers: [

    DialogService,

    
    NewsFilterService,
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
      deps: [JwtSessionManager, SettingsService],
      useFactory: initApp,
      multi: true,

    },
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig,
    }
    , SettingsService

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
    UpdateCommentComponent, UpdateGroupDialogComponent, BasketSummaryComponent]
})
export class AppModule { }


export function initApp(session: JwtSessionManager, settings: SettingsService) {
  return async () => {
    session.loadSessionFromCookie();
    try {


      await settings.init();
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
      routeMap.set(GeocodeComponent, l.GeocodeComponent);
      routeMap.set(ImportFromExcelComponent, l.ImportFromExcelComponent);
      routeMap.set(ImportHelpersFromExcelComponent, l.ImportHelpersFromExcelComponent);
      routeMap.set(DuplicateFamiliesComponent, l.DuplicateFamiliesComponent);
      routeMap.set(ManageComponent, l.ManageComponent);
      routeMap.set(MyFamiliesComponent, l.MyFamiliesComponent);
      routeMap.set(UpdateInfoComponent, l.UpdateInfoComponent);
      routeMap.set(LoginComponent, l.LoginComponent);
      
      routeMap.set(EventsComponent, l.eventsComponent);





    }
    catch (err) {
      console.error('failed to get settings ', err);
    }
    return '';

  };
}

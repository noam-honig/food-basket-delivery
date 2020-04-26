

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule, APP_INITIALIZER } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RemultModule, Context, JwtSessionManager } from '@remult/core';
import { MaterialModule } from './shared/material.module';
import { ChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { HelpersComponent } from './helpers/helpers.component';

import { DialogService } from './select-popup/dialog';
import { YesNoQuestionComponent } from './select-popup/yes-no-question/yes-no-question.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
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
import { TranslatePipe } from './translate';
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


var site = Sites.initOnBrowserAndReturnAngularBaseHref();





@NgModule({
  declarations: [
    AppComponent,
    HelpersComponent,

    YesNoQuestionComponent,
    LoginComponent,
    RegisterComponent,
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


    TranslatePipe,
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
    GridDialogComponent

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

    TranslatePipe,
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
    UpdateCommentComponent, UpdateGroupDialogComponent]
})
export class AppModule { }

export function initApp(session: JwtSessionManager, settings: SettingsService) {
  return async () => {
    session.loadSessionFromCookie();
    try {
      await settings.init();
    }
    catch (err) {
      console.error('failed to get settings ', err);
    }
    return '';

  };
}
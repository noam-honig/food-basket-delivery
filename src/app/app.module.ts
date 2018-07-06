import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { AlertModule, TabsModule, BsDropdownModule, CollapseModule } from "ngx-bootstrap";
import { AppComponent } from './app.component';
import { RadWebModule } from 'radweb';
import { AppRoutingModule } from './app.routing';
import { HomeComponent } from './home/home.component';
import { MaterialModule } from './shared/material.module';


import { EventsComponent } from './events/events.component';
import { EventHelperItemsComponent } from './event-helper-items/event-helper-items.component';
import { FormsModule } from '@angular/forms';
import { HelpersComponent } from './helpers/helpers.component';
import { EventItemsComponent } from './event-items/event-items.component';
import { EventHelpersComponent } from './event-helpers/event-helpers.component';
import { SelectPopupComponent } from './select-popup/select-popup.component';
import { SelectService } from './select-popup/select-service';
import { YesNoQuestionComponent } from './select-popup/yes-no-question/yes-no-question.component';
import { EventItemHelpersComponent } from './event-item-helpers/event-item-helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
import { AuthService } from './auth/auth-service';
import { LoggedInGuard, AdminGuard, NotLoggedInGuard } from './auth/auth-guard';
import { MyEventsComponent } from './my-events/my-events.component';
import { InputAreaComponent } from './select-popup/input-area/input-area.component';
import { UpdateInfoComponent } from './users/update-info/update-info.component';
import { FamiliesComponent } from './families/families.component';
import { MyFamiliesComponent } from './my-families/my-families.component';
import { AsignFamilyComponent } from './asign-family/asign-family.component';
import { ManageComponent } from './manage/manage.component';
import { FamilyInfoComponent } from './family-info/family-info.component';
import { UpdateCommentComponent } from './update-comment/update-comment.component';
import { FixAddressComponent } from './fix-address/fix-address.component';
import { SelectHelperComponent } from './select-helper/select-helper.component';
import { LoginFromSmsComponent } from './login-from-sms/login-from-sms.component';
import { MapComponent } from './map/map.component';
import { WaitComponent } from './wait/wait.component';
import { DeliveryFollowUpComponent } from './delivery-follow-up/delivery-follow-up.component';
import { HelperFamiliesComponent } from './helper-families/helper-families.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    EventsComponent,
    EventHelperItemsComponent,
    HelpersComponent,
    EventItemsComponent,
    EventHelpersComponent,
    SelectPopupComponent,
    YesNoQuestionComponent,
    EventItemHelpersComponent,
    LoginComponent,
    RegisterComponent,
    MyEventsComponent,
    InputAreaComponent,
    UpdateInfoComponent,
    FamiliesComponent,
    MyFamiliesComponent,
    AsignFamilyComponent,
    ManageComponent,
    FamilyInfoComponent,
    UpdateCommentComponent,
    FixAddressComponent,
    SelectHelperComponent,
    LoginFromSmsComponent,
    MapComponent,
    WaitComponent,
    DeliveryFollowUpComponent,
    HelperFamiliesComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    
    MaterialModule,
    BrowserAnimationsModule,
    RadWebModule,
    AppRoutingModule

  ],
  providers: [
    SelectService,
    AuthService,
    LoggedInGuard,
    AdminGuard,
    NotLoggedInGuard
  ],

  bootstrap: [AppComponent],
  entryComponents: [SelectHelperComponent,
    SelectPopupComponent,
     YesNoQuestionComponent,
    InputAreaComponent,
    UpdateCommentComponent,WaitComponent]
})
export class AppModule { }

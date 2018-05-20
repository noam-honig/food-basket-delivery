import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { AlertModule, TabsModule, BsDropdownModule, CollapseModule } from "ngx-bootstrap";
import { AppComponent } from './app.component';
import { RadWebModule } from 'radweb';
import { AppRoutingModule } from './app.routing';
import { HomeComponent } from './home/home.component';
import { MaterialModule } from './shared/material.module';
import { AgmCoreModule } from '@agm/core';

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
    MyFamiliesComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyDNdyWkWtBzRf8UP6MDmcIv-AqwcjuW2QY'
    }),
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
  entryComponents: [
    SelectPopupComponent,
     YesNoQuestionComponent,
    InputAreaComponent]
})
export class AppModule { }

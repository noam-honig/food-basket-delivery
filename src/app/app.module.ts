import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RadWebModule } from 'radweb'; 


import { MaterialModule } from './shared/material.module';
import { ChartsModule } from 'ng2-charts';


import { EventsComponent } from './events/events.component';
import { EventHelperItemsComponent } from './event-helper-items/event-helper-items.component';
import { FormsModule } from '@angular/forms';
import { HelpersComponent } from './helpers/helpers.component';
import { EventItemsComponent } from './event-items/event-items.component';
import { EventHelpersComponent } from './event-helpers/event-helpers.component';
import { SelectPopupComponent } from './select-popup/select-popup.component';
import { DialogService } from './select-popup/dialog';
import { YesNoQuestionComponent } from './select-popup/yes-no-question/yes-no-question.component';
import { EventItemHelpersComponent } from './event-item-helpers/event-item-helpers.component';
import { LoginComponent } from './users/login/login.component';
import { RegisterComponent } from './users/register/register.component';
import { AuthService } from './auth/auth-service';
import { LoggedInGuard, HolidayDeliveryAdmin, NotLoggedInGuard, PackerGuard, WeeklyFamilyVoulenteerGuard, WeeklyFamilyAdminGuard, HelperGuard, AnyAdmin } from './auth/auth-guard';
import { MyEventsComponent } from './my-events/my-events.component';
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
import { WaitComponent } from './wait/wait.component';
import { DeliveryFollowUpComponent } from './delivery-follow-up/delivery-follow-up.component';
import { HelperFamiliesComponent } from './helper-families/helper-families.component';
import { SelectFamilyComponent } from './select-family/select-family.component';
import { BusyService } from './select-popup/busy-service';
import { StamTestComponent } from './stam-test/stam-test.component';
import { NewsComponent } from './news/news.component';
import { DeliveryEventsComponent } from './delivery-events/delivery-events.component';
import { Context } from './shared/context';

import { SelectService } from './select-popup/select-service';
import { UpdateFamilyDialogComponent } from './update-family-dialog/update-family-dialog.component';
import { UpdateFamilyComponent } from './update-family/update-family.component';
import { ProductsComponent } from './products/products.component';
import { MyWeeklyFamiliesComponent } from './my-weekly-families/my-weekly-families.component';
import { WeeklyPackerByFamilyComponent } from './weekly-packer-by-family/weekly-packer-by-family.component';
import { ProductQuantityInDeliveryComponent } from './product-quantity-in-delivery/product-quantity-in-delivery.component';
import { WeeklyPackerByProductComponent } from './weekly-packer-by-product/weekly-packer-by-product.component';

import { WeeklyFamilyDeliveryProductListComponent } from './weekly-family-delivery-product-list/weekly-family-delivery-product-list.component';
import { MyWeeklyFamilyDeliveriesComponent } from './my-weekly-family-deliveries/my-weekly-family-deliveries.component';
import { AddressProblemComponent } from './address-problem/address-problem.component';
import { StressTestComponent } from './stress-test/stress-test.component';
import { SelfPickupComponent } from './self-pickup/self-pickup.component';
import { BatchOperationsComponent } from './batch-operations/batch-operations.component';
import { DeliveryHistoryComponent } from './delivery-history/delivery-history.component';
import { PreviewFamilyComponent } from './preview-family/preview-family.component';
import { FamilyInListComponent } from './family-in-list/family-in-list.component';



@NgModule({
  declarations: [
    AppComponent,
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
    DistributionMap,
    SelectHelperComponent,
    LoginFromSmsComponent,
    MapComponent,
    WaitComponent,
    DeliveryFollowUpComponent,
    HelperFamiliesComponent,
    SelectFamilyComponent,
    StamTestComponent,
    NewsComponent,
    DeliveryEventsComponent,
    UpdateFamilyDialogComponent,
    UpdateFamilyComponent,
    ProductsComponent,
    
    MyWeeklyFamiliesComponent,
    WeeklyPackerByFamilyComponent,
    ProductQuantityInDeliveryComponent,
    WeeklyPackerByProductComponent,
    WeeklyFamilyDeliveryProductListComponent,
    MyWeeklyFamilyDeliveriesComponent,
    AddressProblemComponent,
    StressTestComponent,
    SelfPickupComponent,
    BatchOperationsComponent,
    DeliveryHistoryComponent,
    PreviewFamilyComponent,
    FamilyInListComponent,
    
  ],
  imports: [
    BrowserModule,
    FormsModule,

    MaterialModule,
    BrowserAnimationsModule,
    RadWebModule,
    AppRoutingModule,
    ChartsModule

  ],
  providers: [
    DialogService,
    SelectService,
    BusyService,
    AuthService,
    LoggedInGuard,
    HolidayDeliveryAdmin,
    NotLoggedInGuard,
    PackerGuard,
    WeeklyFamilyAdminGuard,
    WeeklyFamilyVoulenteerGuard,
    HelperGuard,
    AnyAdmin,
    Context
  ],

  bootstrap: [AppComponent],
  entryComponents: [SelectHelperComponent,
    SelectFamilyComponent,
    SelectPopupComponent,
    YesNoQuestionComponent,
    InputAreaComponent,
    UpdateFamilyDialogComponent,PreviewFamilyComponent,
    UpdateCommentComponent, WaitComponent]
})
export class AppModule { }

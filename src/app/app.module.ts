import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RadWebModule } from 'radweb'; 
import { MaterialModule } from './shared/material.module';
import { ChartsModule } from 'ng2-charts';
import { FormsModule } from '@angular/forms';
import {NgxPaginationModule} from 'ngx-pagination';
import { HelpersComponent } from './helpers/helpers.component';
import { SelectPopupComponent } from './select-popup/select-popup.component';
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


import { SelectService } from './select-popup/select-service';
import { UpdateFamilyDialogComponent } from './update-family-dialog/update-family-dialog.component';
import { UpdateFamilyComponent } from './update-family/update-family.component';


import { AddressProblemComponent } from './address-problem/address-problem.component';
import { StressTestComponent } from './stress-test/stress-test.component';
import { SelfPickupComponent } from './self-pickup/self-pickup.component';
import { BatchOperationsComponent } from './batch-operations/batch-operations.component';
import { DeliveryHistoryComponent } from './delivery-history/delivery-history.component';
import { PreviewFamilyComponent } from './preview-family/preview-family.component';
import { FamilyInListComponent } from './family-in-list/family-in-list.component';

import { UpdateGroupDialogComponent } from './update-group-dialog/update-group-dialog.component';
import { SendBulkSmsComponent } from './send-bulk-sms/send-bulk-sms.component';



@NgModule({
  declarations: [
    AppComponent,
    HelpersComponent,
    SelectPopupComponent,
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
    UpdateFamilyComponent,
    
    
    AddressProblemComponent,
    StressTestComponent,
    SelfPickupComponent,
    BatchOperationsComponent,
    DeliveryHistoryComponent,
    PreviewFamilyComponent,
    FamilyInListComponent,
    UpdateGroupDialogComponent,
    SendBulkSmsComponent,
    
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgxPaginationModule,
    MaterialModule,
    BrowserAnimationsModule,
    RadWebModule,
    AppRoutingModule,
    ChartsModule

  ],
  providers: [
    DialogService,
    SelectService,
    
    AuthService
    
  ],

  bootstrap: [AppComponent],
  entryComponents: [SelectHelperComponent,
    SelectFamilyComponent,
    SelectPopupComponent,
    YesNoQuestionComponent,
    InputAreaComponent,
    UpdateFamilyDialogComponent,PreviewFamilyComponent,
    UpdateCommentComponent,UpdateGroupDialogComponent]
})
export class AppModule { }

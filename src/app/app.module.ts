import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { AlertModule, TabsModule, BsDropdownModule, CollapseModule } from "ngx-bootstrap";
import { AppComponent } from './app.component';
import { RadWebModule } from 'radweb';
import { AppRoutingModule } from './app-routing.module';
import { HomeComponent } from './home/home.component';
import { MaterialModule } from './shared/material.module';
import { ProjectsComponent } from './projects/projects.component';
import { ProjectParticipantComponent } from './project-participant/project-participant.component';
import { FormsModule } from '@angular/forms';
import { HelpersComponent } from './helpers/helpers.component';
import { ProjectItemsComponent } from './project-items/project-items.component';
import { ProjectHelpersComponent } from './project-helpers/project-helpers.component';
import { SelectPopupComponent } from './select-popup/select-popup.component';
import { SelectService } from './select-popup/select-service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ProjectsComponent,
    ProjectParticipantComponent, 
    HelpersComponent,
    ProjectItemsComponent,
    ProjectHelpersComponent,
    SelectPopupComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    
    MaterialModule,
    BrowserAnimationsModule,
    RadWebModule,
    AppRoutingModule
  ],
  providers: [SelectService],
  bootstrap: [AppComponent],
  entryComponents:[SelectPopupComponent]
})
export class AppModule { }

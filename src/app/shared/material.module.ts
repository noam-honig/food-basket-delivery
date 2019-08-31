import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import {MatTabsModule} from '@angular/material/tabs';
import { MatRadioModule} from '@angular/material/radio';
import { MatSnackBarModule } from '@angular/material/snack-bar';




//import { CdkTableModule } from '@angular/cdk/table';

@NgModule({
    imports: [
        MatSnackBarModule,
        MatButtonModule,
        MatTabsModule,
        MatRadioModule,
        MatCardModule,
        MatCheckboxModule,

        MatSelectModule,

        MatDialogModule,
        MatDividerModule,
        MatExpansionModule,

        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,



        MatProgressSpinnerModule,



        MatSidenavModule,
        MatToolbarModule,
        MatTooltipModule
    ],
    exports: [
        MatSnackBarModule,
        MatRadioModule,
        MatTabsModule,
        MatSelectModule,
        MatButtonModule,
        MatCardModule,
        MatCheckboxModule,
        MatDialogModule,
        MatDividerModule,
        MatExpansionModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatSidenavModule,
        MatToolbarModule,
        MatTooltipModule
    ]
})
export class MaterialModule {

}
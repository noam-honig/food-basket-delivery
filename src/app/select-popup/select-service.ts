import { Injectable, NgZone } from "@angular/core";
import { MatDialog,MatDialogConfig } from "@angular/material";
import { SelectHelperInfo, SelectHelperComponent } from "../select-helper/select-helper.component";
import { Helpers } from '../helpers/helpers';
import { SelectServiceInterface } from "./select-service-interface";
import { SelectFamilyInfo, SelectFamilyComponent } from "../select-family/select-family.component";
import { BusyService } from 'radweb';

import { UpdateCommentComponentData, UpdateCommentComponent } from "../update-comment/update-comment.component";
import { UpdateFamilyDialogComponent, UpdateFamilyInfo } from "../update-family-dialog/update-family-dialog.component";
import { FilterBase } from "radweb";

@Injectable()
export class SelectService implements SelectServiceInterface {

    constructor(private dialog: MatDialog, private zone: NgZone, private busy: BusyService) {

    }

    selectHelper(ok: (selectedValue: Helpers) => void,filter?:(helper:Helpers)=>FilterBase) {
        let data: SelectHelperInfo = { onSelect: ok ,filter:filter };
        this.dialog.open(SelectHelperComponent, {
            data
        });
    }
    displayComment(settings: UpdateCommentComponentData) {
        this.dialog.open(UpdateCommentComponent, { data: settings });
    }
    selectFamily(data: SelectFamilyInfo) {

        this.dialog.open(SelectFamilyComponent, {
            data: data
        });
    }
    updateFamiliy(data: UpdateFamilyInfo) {
        
        let x = new MatDialogConfig();
        x.data = data;
        x.minWidth=350;
        this.dialog.open(UpdateFamilyDialogComponent,x);
    }

}

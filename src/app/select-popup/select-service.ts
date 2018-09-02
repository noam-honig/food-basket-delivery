import { Injectable, NgZone } from "@angular/core";
import { MatDialog } from "@angular/material";
import { SelectHelperInfo, SelectHelperComponent } from "../select-helper/select-helper.component";
import { Helpers } from '../helpers/helpers';
import { SelectServiceInterface } from "./select-service-interface";
import { SelectFamilyInfo, SelectFamilyComponent } from "../select-family/select-family.component";
import { BusyService } from "./busy-service";

import { UpdateCommentComponentData, UpdateCommentComponent } from "../update-comment/update-comment.component";

const EventSource: any = window['EventSource'];


@Injectable()
export class SelectService implements SelectServiceInterface {

    constructor(private dialog: MatDialog, private zone: NgZone, private busy: BusyService) {

    }
   
    selectHelper(ok: (selectedValue: Helpers) => void) {
        let data: SelectHelperInfo = { onSelect: ok };
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

}

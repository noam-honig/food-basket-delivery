import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material";
import { Entity, GridSettings, IDataSettings } from "radweb";
import { SelectPopupComponent, SelectComponentInfo } from "./select-popup.component";

@Injectable()
export class SelectService {
    constructor(private dialog: MatDialog) {

    }

    showPopup<T extends Entity<any>>(entity: T, selected: (selectedValue: T) => void, settings?: IDataSettings<T>) {

        let data: SelectComponentInfo<T> = {
            onSelect: selected,
            entity: entity,
            settings: settings
        };
        let ref = this.dialog.open(SelectPopupComponent, {
            data
        });
    }


}
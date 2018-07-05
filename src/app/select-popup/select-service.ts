import { Injectable, NgZone } from "@angular/core";
import { MatDialog, MatDialogRef } from "@angular/material";
import { Entity, GridSettings, IDataSettings, IDataAreaSettings } from "radweb";
import { SelectPopupComponent, SelectComponentInfo } from "./select-popup.component";
import { YesNoQuestionComponentData, YesNoQuestionComponent } from "./yes-no-question/yes-no-question.component";
import { InputAreaComponentData, InputAreaComponent } from "./input-area/input-area.component";
import { UpdateCommentComponent, UpdateCommentComponentData } from "../update-comment/update-comment.component";
import { SelectHelperInfo, SelectHelperComponent } from "../select-helper/select-helper.component";
import { Helpers } from "../models";
import { SelectServiceInterface } from "./select-service-interface";
import { WaitComponent } from "../wait/wait.component";
import { wrapFetch } from "radweb/utils/restDataProvider";


@Injectable()
export class SelectService implements SelectServiceInterface {
    Info(info: string): any {
        this.Error(info);
    }
    Error(err: string): any {

        this.YesNoQuestion(err, () => { });
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);
    private numOfWaits = 0;
    private waitRef: MatDialogRef<any>;
    isScreenSmall() {
        return this.mediaMatcher.matches;
    }


    async donotWait<t>(what: () => Promise<t>): Promise<t> {
        this.disableWait = true;
        try {
            return (await what());
        }
        finally {
            this.disableWait = false;
        }

    }
    private disableWait = false;
    constructor(private dialog: MatDialog, zone: NgZone) {
        this.mediaMatcher.addListener(mql => zone.run(() => this.mediaMatcher = mql));

        wrapFetch.wrap = () => {
            if (this.disableWait)
                return () => { };
            if (this.numOfWaits == 0) {
                this.waitRef = this.dialog.open(WaitComponent, { disableClose: true });
            }
            this.numOfWaits++;

            return () => {
                this.numOfWaits--;
                if (this.numOfWaits == 0)
                    this.waitRef.close();
            };
        };
    }
    displayArea(settings: InputAreaComponentData) {
        this.dialog.open(InputAreaComponent, { data: settings });
    }
    displayComment(settings: UpdateCommentComponentData) {
        this.dialog.open(UpdateCommentComponent, { data: settings });
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
    YesNoQuestion(question: string, onYes: () => void) {
        let data: YesNoQuestionComponentData = {
            question: question,
            onYes: onYes
        };
        this.dialog.open(YesNoQuestionComponent, { data });
    }
    confirmDelete(of: string, onOk: () => void) {
        this.YesNoQuestion("האם את בטוחה שאת מעוניית למחוק את " + of + "?", onOk);
    }
    selectHelper(ok: (selectedValue: Helpers) => void) {
        let data: SelectHelperInfo = { onSelect: ok };
        this.dialog.open(SelectHelperComponent, {
            data
        });
    }
    async wait<T>(what: () => T) {
        let ref = this.dialog.open(WaitComponent, { disableClose: true });
        try {
            let r = await what();
            return r;
        }
        finally {
            ref.close();
        }
    }


}
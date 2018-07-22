import { Injectable, NgZone } from "@angular/core";
import { MatDialog, MatSnackBar } from "@angular/material";
import { Entity, IDataSettings } from "radweb";
import { SelectPopupComponent, SelectComponentInfo } from "./select-popup.component";
import { YesNoQuestionComponentData, YesNoQuestionComponent } from "./yes-no-question/yes-no-question.component";
import { InputAreaComponentData, InputAreaComponent } from "./input-area/input-area.component";
import { UpdateCommentComponent, UpdateCommentComponentData } from "../update-comment/update-comment.component";
import { SelectHelperInfo, SelectHelperComponent } from "../select-helper/select-helper.component";
import { Helpers } from "../models";
import { SelectServiceInterface } from "./select-service-interface";
import { SelectFamilyInfo, SelectFamilyComponent } from "../select-family/select-family.component";
import { BusyService } from "./busy-service";
import { environment } from "../../environments/environment";
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
const EventSource: any = window['EventSource'];


@Injectable()
export class SelectService implements SelectServiceInterface {
    Info(info: string): any {
        this.snackBar.open(info, "סגור", { duration: 4000 });
    }
    Error(err: string): any {

        this.YesNoQuestion(err, () => { });
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);


    isScreenSmall() {
        return this.mediaMatcher.matches;
    }




    constructor(private dialog: MatDialog, private zone: NgZone, busy: BusyService, private snackBar: MatSnackBar) {
        this.mediaMatcher.addListener(mql => zone.run(() => this.mediaMatcher = mql));


    }
    eventSource: any;/*EventSource*/
    refreshEventListener(enable: boolean) {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = undefined;
        }
        if (enable && typeof (EventSource) !== "undefined") {
            var source = new EventSource(environment.serverUrl + 'stream', { withCredentials: true });
            this.eventSource = source;
            source.onmessage = e => {
                
                this.zone.run(() => {

                    this.Info(e.data.toString() + ' ');
                });
            };
            source.addEventListener("authenticate", function (e) {
                
                new ServerEventAuthorizeAction().run({ key: (<any>e).data.toString() });
            });
        }
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
    selectFamily(data: SelectFamilyInfo) {

        this.dialog.open(SelectFamilyComponent, {
            data: data
        });
    }


}

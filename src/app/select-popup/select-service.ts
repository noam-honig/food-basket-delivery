import { Injectable, NgZone, Output, EventEmitter } from "@angular/core";
import { MatDialog, MatSnackBar } from "@angular/material";
import { Entity, IDataSettings } from "radweb";
import { SelectPopupComponent, SelectComponentInfo } from "./select-popup.component";
import { YesNoQuestionComponentData, YesNoQuestionComponent } from "./yes-no-question/yes-no-question.component";
import { InputAreaComponentData, InputAreaComponent } from "./input-area/input-area.component";
import { UpdateCommentComponent, UpdateCommentComponentData } from "../update-comment/update-comment.component";
import { SelectHelperInfo, SelectHelperComponent } from "../select-helper/select-helper.component";
import { Helpers } from '../helpers/helpers';
import { SelectServiceInterface } from "./select-service-interface";
import { SelectFamilyInfo, SelectFamilyComponent } from "../select-family/select-family.component";
import { BusyService } from "./busy-service";
import { environment } from "../../environments/environment";
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs/Subject";
import { Observable } from "rxjs/Observable";
import { BehaviorSubject } from "rxjs/BehaviorSubject";




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

    newsUpdate = new Subject<string>();


    constructor(private dialog: MatDialog, private zone: NgZone, private busy: BusyService, private snackBar: MatSnackBar) {
        this.mediaMatcher.addListener(mql => zone.run(() => this.mediaMatcher = mql));


    }
    eventSource: any;/*EventSource*/
    refreshEventListener(enable: boolean) {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = undefined;
        }
        if (typeof (window) !== 'undefined') {
            let EventSource: any = window['EventSource'];
            if (enable && typeof (EventSource) !== "undefined") {
                this.zone.run(() => {
                    var source = new EventSource(environment.serverUrl + 'stream', { withCredentials: true });

                    this.eventSource = source;
                    source.onmessage = e => {

                        this.zone.run(() => {
                            this.newsUpdate.next(e.data.toString());
                            this.Info(e.data.toString() + ' ');
                        });
                    };
                    let x = this;
                    source.addEventListener("authenticate", async function (e) {
                        await x.busy.donotWait(async () => await new ServerEventAuthorizeAction().run({ key: (<any>e).data.toString() }));

                    });
                });
            }
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

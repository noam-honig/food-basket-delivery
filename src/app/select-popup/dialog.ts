import { Injectable, NgZone } from "@angular/core";
import { MatDialog, MatSnackBar } from "@angular/material";
import { Entity, IDataSettings } from "radweb";
import { SelectPopupComponent, SelectComponentInfo } from "./select-popup.component";
import { YesNoQuestionComponentData, YesNoQuestionComponent } from "./yes-no-question/yes-no-question.component";
import { InputAreaComponentData, InputAreaComponent } from "./input-area/input-area.component";
import { BusyService } from "./busy-service";
import { environment } from "../../environments/environment";
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs";
import { myThrottle } from "../model-shared/types";

declare var gtag;

@Injectable()
export class DialogService {
    Info(info: string): any {
        if (info.indexOf('!!')>=0){
            new Audio('http://www.orangefreesounds.com/wp-content/uploads/2019/02/Ping-tone.mp3').play();
        }
        this.snackBar.open(info, "סגור", { duration: 4000 });
    }
    Error(err: string): any {

        this.YesNoQuestion(err);
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);


    isScreenSmall() {
        return this.mediaMatcher.matches;
    }

    refreshStatusStats = new Subject();

    statusRefreshThrottle = new myThrottle(1000);


    constructor(private dialog: MatDialog, private zone: NgZone, private busy: BusyService, private snackBar: MatSnackBar) {
        this.mediaMatcher.addListener(mql => zone.run(() => /*this.mediaMatcher = mql*/"".toString()));


    }
    analytics(action:string,value?:number) {
        if (!value)
        {
            value =1;
        }
        gtag('event', action, {
            'event_category': 'delivery',
            'event_label': action
          });
        

    }

    eventSource: any;/*EventSource*/
    refreshEventListener(enable: boolean) {
        if (typeof (window) !== 'undefined') {
            let EventSource: any = window['EventSource'];
            if (enable && typeof (EventSource) !== "undefined") {
                this.zone.run(() => {
                    var source = new EventSource(environment.serverUrl + 'stream', { withCredentials: true });
                    if (this.eventSource) {
                        this.eventSource.close();
                        this.eventSource = undefined;
                    }
                    this.eventSource = source;
                    source.onmessage = e => {

                        this.zone.run(() => {
                            this.statusRefreshThrottle.do(() => this.refreshStatusStats.next());
                            this.Info(e.data.toString() + ' ');
                        });
                    };
                    let x = this;
                    source.addEventListener("authenticate", async function (e) {
                        await x.busy.donotWait(async () => await ServerEventAuthorizeAction.DoAthorize((<any>e).data.toString()));

                    });
                });
            }
        }
    }
    displayArea(settings: InputAreaComponentData) {
        this.dialog.open(InputAreaComponent, { data: settings });
    }
    showPopup<T extends Entity<any>>(entityType: { new(...args: any[]): T; }, selected: (selectedValue: T) => void, settings?: IDataSettings<T>) {

        let data: SelectComponentInfo<T> = {
            onSelect: selected,
            entity: entityType,
            settings: settings
        };
        let ref = this.dialog.open(SelectPopupComponent, {
            data
        });
    }
    YesNoQuestion(question: string, onYes?: () => void) {
        let data: YesNoQuestionComponentData = {
            question: question,
            onYes: onYes
        };
        this.dialog.open(YesNoQuestionComponent, { data });
    }
    confirmDelete(of: string, onOk: () => void) {
        this.YesNoQuestion("האם את בטוחה שאת מעוניית למחוק את " + of + "?", onOk);
    }
}

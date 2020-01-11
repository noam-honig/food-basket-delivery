import { Injectable, NgZone } from "@angular/core";
import { MatSnackBar } from "@angular/material";
import { Context } from '@remult/core';

import { YesNoQuestionComponent } from "./yes-no-question/yes-no-question.component";
import { BusyService } from '@remult/core';
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs";
import { myThrottle } from "../model-shared/types";
import { TestComponentRenderer } from "@angular/core/testing";

declare var gtag;

@Injectable()
export class DialogService {
    Info(info: string): any {
        if (info.indexOf('!!') >= 0) {
            new Audio('http://www.orangefreesounds.com/wp-content/uploads/2019/02/Ping-tone.mp3').play();
        }
        this.snackBar.open(info, "סגור", { duration: 4000 });
    }
    Error(err: string): any {

        this.messageDialog(err);
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);


    isScreenSmall() {
        return this.mediaMatcher.matches;
    }

    refreshStatusStats = new Subject();

    statusRefreshThrottle = new myThrottle(1000);


    constructor(public zone: NgZone, private busy: BusyService, private snackBar: MatSnackBar, private context: Context) {
        this.mediaMatcher.addListener(mql => zone.run(() => /*this.mediaMatcher = mql*/"".toString()));


    }
    analytics(action: string, value?: number) {
        if (!value) {
            value = 1;
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
                    var source = new EventSource(Context.apiBaseUrl + '/' + 'stream', { withCredentials: true });
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
    async messageDialog(what: string) {
        return await this.context.openDialog(YesNoQuestionComponent, y => {
            y.question = what;
            y.confirmOnly = true;
        }, x => x.yes);
    }
    YesNoQuestion(question: string, onYes: () => void) {
        this.context.openDialog(YesNoQuestionComponent, x => x.args = {
            question: question,
            onYes: onYes,
            showOnlyConfirm: !onYes
        });
    }
    async YesNoPromise(question: string) {
        return await this.context.openDialog(YesNoQuestionComponent, y => y.question = question, x => x.yes);
    }
    confirmDelete(of: string, onOk: () => void) {
        this.YesNoQuestion("האם את בטוחה שאת מעוניית למחוק את " + of + "?", onOk);
    }
}

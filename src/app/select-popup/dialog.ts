import { Injectable, NgZone } from "@angular/core";
import { MatSnackBar } from "@angular/material";
import { Context, DataAreaSettings } from '@remult/core';

import { YesNoQuestionComponent } from "./yes-no-question/yes-no-question.component";
import { BusyService } from '@remult/core';
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs";
import { myThrottle } from "../model-shared/types";
import { TestComponentRenderer } from "@angular/core/testing";
import { DistributionCenterId, DistributionCenters } from "../manage/distribution-centers";
import { Roles } from "../auth/roles";
import { HelperUserInfo } from "../helpers/helpers";
import { RouteReuseStrategy } from "@angular/router";
import { CustomReuseStrategy } from "../custom-reuse-controller-router-strategy";
import { isString } from "util";


declare var gtag;

@Injectable()
export class DialogService {
    async exception(title: string, err: any): Promise<void> {
        await this.Error(title + ": " + extractError(err));
        throw err;
    }

    onDistCenterChange(whatToDo: () => void, destroyHelper: DestroyHelper) {
        let y = this.refreshDistCenter.subscribe(() => {
            whatToDo();
        });
        destroyHelper.add(() => y.unsubscribe());

    }
    onStatusChange(whatToDo: () => void, destroyHelper: DestroyHelper) {
        let y = this.refreshStatusStats.subscribe(() => {
            whatToDo();
        });
        destroyHelper.add(() => y.unsubscribe());

    }
    Info(info: string): any {
        if (info.indexOf('!!') >= 0) {
            //new Audio('http://www.orangefreesounds.com/wp-content/uploads/2019/02/Ping-tone.mp3').play();
        }
        this.snackBar.open(info, "סגור", { duration: 4000 });
    }

    Error(err: string): any {

        return this.messageDialog(extractError(err));
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);


    isScreenSmall() {
        return this.mediaMatcher.matches;
    }

    private refreshStatusStats = new Subject();
    private refreshDistCenter = new Subject();

    statusRefreshThrottle = new myThrottle(1000);


    constructor(public zone: NgZone, private busy: BusyService, private snackBar: MatSnackBar, private context: Context, private routeReuseStrategy: RouteReuseStrategy) {
        this.mediaMatcher.addListener(mql => zone.run(() => /*this.mediaMatcher = mql*/"".toString()));
        if (this.distCenter.value === undefined)
            this.distCenter.value = "";

    }
    refreshFamiliesAndDistributionCenters() {
        (<CustomReuseStrategy>this.routeReuseStrategy).recycleAll();
        this.refreshCanSeeCenter();

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


    distCenter = new DistributionCenterId(this.context, {

        valueChange: () => {
            if (this.context.isSignedIn())
                this.refreshDistCenter.next();
        }
    }, true);
    distCenterArea: DataAreaSettings<any>;
    hasManyCenters = false;
    canSeeCenter() {
        var dist = '';
        if (this.context.user)
            dist = (<HelperUserInfo>this.context.user).distributionCenter;
        if (!this.context.isAllowed(Roles.admin) && this.distCenter.value != dist) {
            this.distCenter.value = dist;
        }
        return this.context.isAllowed(Roles.admin) && this.hasManyCenters;
    }
    dc: DistributionCenters;
    async refreshCanSeeCenter() {
        this.hasManyCenters = false;
        this.distCenterArea = undefined;
        this.dc = undefined;

        if (this.context.isAllowed(Roles.distCenterAdmin) && !this.context.isAllowed(Roles.admin))
            this.context.for(DistributionCenters).lookupAsync(x => x.id.isEqualTo((<HelperUserInfo>this.context.user).distributionCenter)).then(x => this.dc = x);
        if (this.context.isAllowed(Roles.admin)) {
            this.hasManyCenters = await this.context.for(DistributionCenters).count() > 1;
            this.distCenterArea = new DataAreaSettings({ columnSettings: () => [this.distCenter] });
        }
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
            else if (this.eventSource) {
                this.eventSource.close();
                this.eventSource = undefined;
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
        return await this.context.openDialog(YesNoQuestionComponent, y => y.args = { question: question }, x => x.yes);
    }
    confirmDelete(of: string, onOk: () => void) {
        this.YesNoQuestion("האם את בטוחה שאת מעוניית למחוק את " + of + "?", onOk);
    }
}
export function extractError(err: any) {
    if (isString(err))
        return err;
    if (err.error)
        return extractError(err.error);
    if (err.message)
        return extractError(err.message);

    return JSON.stringify(err);
}
export class DestroyHelper {
    private destroyList: (() => void)[] = [];
    add(arg0: () => void) {
        this.destroyList.push(arg0);
    }
    destroy() {
        for (const d of this.destroyList) {
            d();
        }
    }

}
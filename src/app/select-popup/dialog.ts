import { Injectable, NgZone, ErrorHandler } from "@angular/core";
import { MatSnackBar } from "@angular/material";
import { Context, DataAreaSettings, ServerFunction } from '@remult/core';


import { BusyService } from '@remult/core';
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs";
import { myThrottle } from "../model-shared/types";
import { TestComponentRenderer } from "@angular/core/testing";
import { DistributionCenterId, DistributionCenters, allCentersToken, findClosestDistCenter } from "../manage/distribution-centers";
import { Roles } from "../auth/roles";
import { HelperUserInfo } from "../helpers/helpers";
import { RouteReuseStrategy } from "@angular/router";
import { CustomReuseStrategy } from "../custom-reuse-controller-router-strategy";
import { isString } from "util";
import { use } from "../translate";
import { Location, GetDistanceBetween } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";



declare var gtag;

@Injectable()
export class DialogService {
    async exception(title: string, err: any): Promise<void> {

        this.log("Exception:" + title + ": " + extractError(err) + "cookies:" + document.cookie);
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
        this.snackBar.open(info, use.language.close, { duration: 4000 });
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
            this.distCenter.value = allCentersToken;

    }
    refreshFamiliesAndDistributionCenters() {
        (<CustomReuseStrategy>this.routeReuseStrategy).recycleAll();
        this.refreshCanSeeCenter();

    }
    analytics(action: string, value?: number) {
        if (!value) {
            value = 1;
        }
        let cat = Sites.getOrganizationFromContext(this.context);
        if (!cat)
            cat = '';
        gtag('event', action, {
            'event_category': 'delivery',
            'event_label': action + "/" + cat
        });


    }
    async getDistCenter(loc: Location) {
        if (this.distCenter.value != allCentersToken)
            return this.distCenter.value;
        if (!this.allCenters)
            this.allCenters = await this.context.for(DistributionCenters).find();
        return findClosestDistCenter(loc, this.context, this.allCenters);

    }
    private allCenters: DistributionCenters[];


    distCenter = new DistributionCenterId(this.context, {

        valueChange: () => {
            if (this.context.isSignedIn())
                this.refreshDistCenter.next();
        }
    }, true);
    distCenterArea: DataAreaSettings;
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
            this.hasManyCenters = await this.context.for(DistributionCenters).count(c => c.archive.isEqualTo(false)) > 1;
            this.distCenterArea = new DataAreaSettings({ columnSettings: () => [this.distCenter] });
            if (!this.hasManyCenters)
                this.distCenter.value = allCentersToken;
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
        return await this.context.openDialog(await (await import("./yes-no-question/yes-no-question.component")).YesNoQuestionComponent, y => {
            y.question = what;
            y.confirmOnly = true;
        }, x => x.yes);
    }
    async YesNoQuestion(question: string, onYes: () => void) {
        this.context.openDialog(await (await import("./yes-no-question/yes-no-question.component")).YesNoQuestionComponent, x => x.args = {
            question: question,
            onYes: onYes,
            showOnlyConfirm: !onYes
        });
    }
    async YesNoPromise(question: string) {
        return await this.context.openDialog(await (await import("./yes-no-question/yes-no-question.component")).YesNoQuestionComponent, y => y.args = { question: question }, x => x.yes);
    }
    confirmDelete(of: string) {
        return this.YesNoPromise(use.language.confirmDeleteOf + " " + of + "?");
    }
    async log(s: string) {
        await DialogService.doLog(s);
    }
    @ServerFunction({ allowed: true })
    static async doLog(s: string, context?: Context) {
        console.log(s);
        if (context.user) {
            console.log("server context: " + JSON.stringify(context.user));
        }
        else
            console.log("server context has no user");
        console.log("authorization cookie:", context.getCookie("authorization"));

    }
}
export function extractError(err: any) {
    if (isString(err))
        return err;
    if (err.modelState) {
        if (err.message)
            return err.message;
        for (const key in err.modelState) {
            if (err.modelState.hasOwnProperty(key)) {
                const element = err.modelState[key];
                return key + ": " + element;

            }
        }
    }
    if (err.rejection)
        return extractError(err.rejection);//for promise failed errors and http errors
    if (err.message) {
        let r = err.message;
        if (err.error && err.error.message)
            r = err.error.message + " - " + r;
        return r;
    }
    if (err.error)
        return extractError(err.error);


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
@Injectable()
export class ShowDialogOnErrorErrorHandler extends ErrorHandler {
    constructor(private dialog: DialogService, private zone: NgZone, private context: Context) {
        super();
    }
    lastErrorString: '';
    lastErrorTime: number;

    async handleError(error) {
        super.handleError(error);
        if (error.message.startsWith("ExpressionChangedAfterItHasBeenCheckedError"))
            return;
        if (this.lastErrorString == error.toString() && new Date().valueOf() - this.lastErrorTime < 100)
            return;
        this.lastErrorString = error.toString();
        this.lastErrorTime = new Date().valueOf();
        try {
            var s = await this.context.for((await import('../manage/ApplicationSettings')).ApplicationSettings).findId(1);
            if (s && this.context.user && !s.currentUserIsValidForAppLoadTest.value) {
                let AuthService = (await import("../auth/auth-service")).AuthService;
                AuthService.doSignOut();
                this.dialog.Error(s.lang.sessionExpiredPleaseRelogin);
                return;
            }

        }
        catch (err) {

        }
        if (this.context.isSignedIn())
            this.zone.run(async () => {
                let err = extractError(error);
                this.dialog.log("Exception:" + err).catch(x => { });
                this.dialog.Error(err);
            });

    }
}
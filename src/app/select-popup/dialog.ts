import { Injectable, NgZone, ErrorHandler } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Remult, getFields, BackendMethod, ContainsFilterFactory } from 'remult';


import { BusyService, DataAreaSettings, DataControl, getValueList, openDialog } from '@remult/angular';
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs";
import { myThrottle } from "../model-shared/types";
import { DistributionCenters } from "../manage/distribution-centers";
import { Roles } from "../auth/roles";
import { HelperUserInfo } from "../helpers/helpers";
import { RouteReuseStrategy } from "@angular/router";
import { CustomReuseStrategy } from "../custom-reuse-controller-router-strategy";
import { use, Field } from "../translate";
import { Location } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";



declare var gtag;

@Injectable()
export class DialogService {
    filterDistCenter(distributionCenter: ContainsFilterFactory<DistributionCenters>): import("remult").Filter {
        return this.context.filterDistCenter(distributionCenter, this.distCenter)
    }
    async exception(title: string, err: any): Promise<void> {

        this.log(err, title);
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

    async Error(err: string) {

        return this.messageDialog(extractError(err));
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);


    isScreenSmall() {
        return this.mediaMatcher.matches;
    }

    private refreshStatusStats = new Subject();
    private refreshDistCenter = new Subject();

    statusRefreshThrottle = new myThrottle(1000);


    constructor(public zone: NgZone, private busy: BusyService, private snackBar: MatSnackBar, private context: Remult, private routeReuseStrategy: RouteReuseStrategy) {
        this.mediaMatcher.addListener(mql => zone.run(() => /*this.mediaMatcher = mql*/"".toString()));
        if (this.distCenter === undefined)
            this.distCenter = null;

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
    trackVolunteer(action: string, value?: number) {
        if (!value) {
            value = 1;
        }
        let cat = Sites.getOrganizationFromContext(this.context);
        if (!cat)
            cat = '';
        gtag('event', action, {
            'event_category': 'volunteer',
            'event_label': action + "/" + cat
        });


    }
    async getDistCenter(loc: Location) {
        if (this.distCenter != null)
            return this.distCenter;
        if (!this.allCenters)
            this.allCenters = await this.context.repo(DistributionCenters).find();
        return this.context.findClosestDistCenter(loc, this.allCenters);

    }
    private allCenters: DistributionCenters[];

    @Field()
    @DataControl<DialogService>({
        valueList: context => DistributionCenters.getValueList(context, true),
        valueChange: async self => {

            if (self.context.authenticated()) {
                self.refreshDistCenter.next();
            }
        }

    })
    distCenter: DistributionCenters;
    distCenterArea: DataAreaSettings;
    hasManyCenters = false;
    canSeeCenter() {
        var dist = '';
        if (this.context.user)
            dist = (<HelperUserInfo>this.context.user).distributionCenter;
        if (!this.context.isAllowed(Roles.admin) && (!this.distCenter || !this.distCenter.matchesCurrentUser())) {
            this.distCenter = this.context.currentUser.distributionCenter;
        }
        return this.context.isAllowed(Roles.admin) && this.hasManyCenters;
    }
    dc: DistributionCenters;
    get $() { return getFields(this, this.context) }
    async refreshCanSeeCenter() {
        this.hasManyCenters = false;
        this.distCenterArea = undefined;
        this.dc = undefined;

        if (this.context.isAllowed(Roles.distCenterAdmin) && !this.context.isAllowed(Roles.admin))
            this.context.repo(DistributionCenters).findId((<HelperUserInfo>this.context.user).distributionCenter).then(x => this.dc = x);
        if (this.context.isAllowed(Roles.admin)) {
            this.hasManyCenters = await this.context.repo(DistributionCenters).count(c => c.archive.isEqualTo(false)) > 1;
            this.distCenterArea = new DataAreaSettings({ fields: () => [this.$.distCenter] });
            if (!this.hasManyCenters)
                this.distCenter = null;
        }
    }

    eventSource: any;/*EventSource*/
    refreshEventListener(enable: boolean) {
        if (typeof (window) !== 'undefined') {
            let EventSource: any = window['EventSource'];
            if (enable && typeof (EventSource) !== "undefined") {
                this.zone.run(() => {
                    var source = new EventSource(Remult.apiBaseUrl + '/' + 'stream', { withCredentials: true });
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
        return await openDialog(await (await import("./yes-no-question/yes-no-question.component")).YesNoQuestionComponent, y => {
            y.question = what;
            y.confirmOnly = true;
        }, x => x.yes);
    }
    async YesNoQuestion(question: string, onYes: () => void) {
        openDialog(await (await import("./yes-no-question/yes-no-question.component")).YesNoQuestionComponent, x => x.args = {
            question: question,
            onYes: onYes,
            showOnlyConfirm: !onYes
        });
    }
    async YesNoPromise(question: string) {
        return await openDialog(await (await import("./yes-no-question/yes-no-question.component")).YesNoQuestionComponent, y => y.args = { question: question }, x => x.yes);
    }
    confirmDelete(of: string) {
        return this.YesNoPromise(use.language.confirmDeleteOf + " " + of + "?");
    }
    async log(error: any, title?: string) {
        let message = "Exception: " + extractError(error);
        if (error.message && error.message != message)
            message += " - " + error.message;
        if (title) {
            title + " - " + message;
        }
        await DialogService.doLog(message);
    }
    @BackendMethod({ allowed: true })
    static async doLog(s: string, context?: Remult) {
        console.log(s);
    }
}
export function extractError(err: any) {
    if (typeof err === "string")
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
            r = err.error.message;
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
let showing = false;
@Injectable()
export class ShowDialogOnErrorErrorHandler extends ErrorHandler {
    constructor(private dialog: DialogService, private zone: NgZone, private context: Remult) {
        super();
    }
    lastErrorString: '';
    lastErrorTime: number;

    async handleError(error) {
        super.handleError(error);
        if (error.message.startsWith("ExpressionChangedAfterItHasBeenCheckedError") || error.message.startsWith("NG0100"))
            return;
        if (this.lastErrorString == error.toString() && new Date().valueOf() - this.lastErrorTime < 100)
            return;
        this.lastErrorString = error.toString();
        this.lastErrorTime = new Date().valueOf();
        try {
            var s = await this.context.repo((await import('../manage/ApplicationSettings')).ApplicationSettings).findId(1);
            if (s && this.context.authenticated() && !s.currentUserIsValidForAppLoadTest) {
                let AuthService = (await import("../auth/auth-service")).AuthService;
                AuthService.doSignOut();
                this.dialog.Error(s.lang.sessionExpiredPleaseRelogin);
                return;
            }

        }
        catch (err) {

        }
        if (this.context.authenticated()) {
            if (showing)
                return;
            showing = true;
            this.zone.run(async () => {
                let err = extractError(error);
                this.dialog.log(error).catch(x => { });
                this.dialog.Error(err).then(() => showing = false);
            });
        }

    }
}
import { Injectable, NgZone, ErrorHandler, Component } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Remult, getFields, IdFilter, Repository, FieldRef, FieldMetadata, remult } from 'remult';


import { DataAreaSettings, DataControl, DataControlInfo, DataControlSettings, GridSettings, IDataSettings } from '@remult/angular/interfaces';
import { BusyService, openDialog, RemultAngularPluginsService, RouteHelperService, SelectValueDialogComponent } from '@remult/angular';
import { ServerEventAuthorizeAction } from "../server/server-event-authorize-action";
import { Subject } from "rxjs";
import { myThrottle } from "../model-shared/types";
import { DistributionCenters } from "../manage/distribution-centers";
import { Roles } from "../auth/roles";
import { RouteReuseStrategy } from "@angular/router";
import { CustomReuseStrategy } from "../custom-reuse-controller-router-strategy";
import { use, Field } from "../translate";
import { Location } from "../shared/googleApiHelpers";
import { Sites } from "../sites/sites";
import "../helpers/init-context";
import { EditCustomMessageArgs, evil, GridDialogArgs, InputAreaArgs, SelectHelperArgs, UITools, UpdateFamilyDialogArgs, UpdateGroupArgs } from "../helpers/init-context";
import { Helpers, HelpersBase } from "../helpers/helpers";
import { extractError } from "./extractError";
import { DialogController } from "./dialog.controller";
import { AddressInputComponent } from "../address-input/address-input.component";
import { AreaDataComponent } from "../area-data/area-data.component";
import { BlockedFamiliesComponent } from "../blocked-families/blocked-families.component";





declare var gtag;

@Injectable()
export class DialogService implements UITools {


    filterDistCenter(): IdFilter<DistributionCenters> {
        return remult.context.filterDistCenter(this.distCenter);
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

        await this.messageDialog(extractError(err));
    }
    private mediaMatcher: MediaQueryList = matchMedia(`(max-width: 720px)`);


    isScreenSmall() {
        return this.mediaMatcher.matches;
    }

    private refreshStatusStats = new Subject();
    private refreshDistCenter = new Subject();

    statusRefreshThrottle = new myThrottle(1000);


    constructor(public zone: NgZone, private busy: BusyService, private snackBar: MatSnackBar, private routeReuseStrategy: RouteReuseStrategy, private routeHelper: RouteHelperService, plugInService: RemultAngularPluginsService) {
        evil.YesNoPromise = (message) => this.YesNoPromise(message);
        this.mediaMatcher.addListener(mql => zone.run(() => /*this.mediaMatcher = mql*/"".toString()));
        if (this.distCenter === undefined)
            this.distCenter = null;

        plugInService.dataControlAugmenter = (f, s) => {
            if (f?.options.customInput) {
                f.options.customInput({
                    addressInput: () =>
                        s.customComponent = {
                            component: AddressInputComponent
                        },
                    textArea: () => s.customComponent = {
                        component: AreaDataComponent
                    }
                });
            }
            if (f?.options.clickWithTools)
                if (!s.click) {
                    s.click = (r, c) => f.options.clickWithTools(r, c, this);
                }
        }


    }
    editBlockedFamilies(helper: Helpers) {
        openDialog(BlockedFamiliesComponent, x => x.helper = helper);
    }
    donotWait<T>(what: () => Promise<T>): Promise<T> {
        return this.busy.donotWait(what);
    }
    async editCustomMessageDialog(args: EditCustomMessageArgs): Promise<void> {
        openDialog((await import('../edit-custom-message/edit-custom-message.component')).EditCustomMessageComponent,
            x => x.args = args);
    }
    navigateToComponent(component: any): void {
        this.routeHelper.navigateToComponent(component);
    }

    async selectCompany(args: (selectedValue: string) => void): Promise<void> {
        openDialog((await import("../select-company/select-company.component")).SelectCompanyComponent, s => s.argOnSelect = args)
    }
    async updateGroup(args: UpdateGroupArgs): Promise<void> {
        openDialog((await import('../update-group-dialog/update-group-dialog.component')).UpdateGroupDialogComponent, s => {
            s.init(args)
        });
    }
    async helperAssignment(helper: HelpersBase): Promise<void> {
        await openDialog(
            (await import('../helper-assignment/helper-assignment.component')).HelperAssignmentComponent, s => s.argsHelper = helper);
    }
    async updateFamilyDialog(args: UpdateFamilyDialogArgs): Promise<void> {
        await openDialog((await import("../update-family-dialog/update-family-dialog.component")).UpdateFamilyDialogComponent, x => x.args = args);
    }
    async gridDialog(args: GridDialogArgs): Promise<void> {
        await openDialog((await import('../grid-dialog/grid-dialog.component')).GridDialogComponent, x => x.args = args);
    }
    async inputAreaDialog(args: InputAreaArgs): Promise<void> {
        await openDialog((await import('../select-popup/input-area/input-area.component')).InputAreaComponent, x => x.args = args)
    }
    async selectHelper(args: SelectHelperArgs): Promise<void> {
        await openDialog((await import('../select-helper/select-helper.component')).SelectHelperComponent, x => x.args = args);
    }
    async selectValuesDialog<T extends { caption?: string; }>(args: { values: T[]; onSelect: (selected: T) => void; title?: string; }): Promise<void> {
        await openDialog(SelectValueDialogComponent, x => x.args(args))
    }
    async doWhileShowingBusy<T>(what: () => Promise<T>): Promise<T> {
        return this.busy.doWhileShowingBusy(what);
    }
    refreshFamiliesAndDistributionCenters() {
        (<CustomReuseStrategy>this.routeReuseStrategy).recycleAll();
        this.refreshCanSeeCenter();

    }
    analytics(action: string, value?: number) {
        if (!value) {
            value = 1;
        }
        let cat = Sites.getOrganizationFromContext();
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
        let cat = Sites.getOrganizationFromContext();
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
            this.allCenters = await remult.repo(DistributionCenters).find({ where: DistributionCenters.isActive });
        return remult.context.findClosestDistCenter(loc, this.allCenters);

    }
    private allCenters: DistributionCenters[];

    @Field()
    @DataControl<DialogService>({
        valueList: remult => DistributionCenters.getValueList(true),
        valueChange: async self => {

            if (remult.authenticated()) {
                self.refreshDistCenter.next();
            }
        }

    })
    distCenter: DistributionCenters;
    distCenterArea: DataAreaSettings;
    hasManyCenters = false;
    canSeeCenter() {
        var dist = '';
        if (remult.user)
            dist = (remult.user)?.distributionCenter;
        return remult.isAllowed(Roles.admin) && this.hasManyCenters;
    }
    dc: DistributionCenters;
    get $() { return getFields(this, remult) }
    async refreshCanSeeCenter() {
        this.hasManyCenters = false;
        this.distCenterArea = undefined;
        this.dc = undefined;

        if (remult.isAllowed(Roles.distCenterAdmin) && !remult.isAllowed(Roles.admin))
            remult.repo(DistributionCenters).findId((remult.user)?.distributionCenter).then(x => this.dc = x);
        if (remult.isAllowed(Roles.admin)) {
            this.hasManyCenters = await remult.repo(DistributionCenters).count({ archive: false }) > 1;
            this.distCenterArea = new DataAreaSettings({ fields: () => [this.$.distCenter] });
            if (!this.hasManyCenters)
                this.distCenter = null;
        }
    }

    eventSource: any;/*EventSource*/
    refreshEventListener(enable: boolean) {
        const self = this;
        if (typeof (window) !== 'undefined') {
            let EventSource: any = window['EventSource'];
            if (enable && typeof (EventSource) !== "undefined") {
                this.zone.run(() => {
                    var source = new EventSource(remult.apiClient.url + '/' + 'stream', { withCredentials: true });
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
                        try {
                            await x.busy.donotWait(async () => await ServerEventAuthorizeAction.DoAthorize((<any>e).data.toString()));
                        } catch (err) {
                            var m = err.message;
                            if (!m) {
                                m = err;
                            }
                            try {
                                if (remult.user)
                                    m += " user:" + JSON.stringify(remult.user);
                            } catch { }
                            await DialogController.LogWithUser(m)
                        }

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
        await DialogController.doLog(message);
    }

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
    constructor(private dialog: DialogService, private zone: NgZone) {
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
            var s = await remult.repo((await import('../manage/ApplicationSettings')).ApplicationSettings).findId(1);
            if (s && remult.authenticated() && !s.currentUserIsValidForAppLoadTest) {
                let AuthService = (await import("../auth/auth-service")).AuthService;
                AuthService.doSignOut();
                this.dialog.Error(s.lang.sessionExpiredPleaseRelogin);
                return;
            }

        }
        catch (err) {

        }
        if (remult.authenticated()) {
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
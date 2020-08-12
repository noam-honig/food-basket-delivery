import { Injectable, HostListener, NgZone } from "@angular/core";

import { DialogService, extractError } from "../select-popup/dialog";

import { Helpers, HelperUserInfo } from "../helpers/helpers";

import { ServerFunction, UserInfo, JwtSessionManager, RouteHelperService, DataApiRequest } from '@remult/core';
import { Context } from '@remult/core';
import { LoginResponse } from "./login-response";
import { Roles } from "./roles";



import { Sites } from "../sites/sites";
import { OverviewComponent } from "../overview/overview.component";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { YesNoQuestionComponent } from "../select-popup/yes-no-question/yes-no-question.component";
import { Subject } from "rxjs";

const TIMEOUT_MULTIPLIER_IN_SECONDS = 60;
@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        var response = await AuthService.loginFromSms(key);
        if (response.valid && await this.userAgreedToConfidentiality()) {
            this.setToken(response.authToken, false);
            this.dialog.analytics('login from sms');
            this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
            return true;
        }
        else {
            this.tokenHelper.signout();
            return false;
        }


    }
    private setToken(token: string, remember: boolean) {
        let org = Sites.getOrganizationFromContext(this.context);
        this.tokenHelper.setToken(token, remember, '/' + org);
    }
    @ServerFunction({ allowed: true })
    static async loginFromSms(key: string, context?: Context) {

        let h = await context.for(Helpers).findFirst(h => h.shortUrlKey.isEqualTo(key));
        if (h) {

            h.lastSignInDate.value = new Date();
            let info: HelperUserInfo = {
                id: h.id.value,
                name: h.name.value,
                roles: [Sites.getOrgRole(context)],
                theHelperIAmEscortingId: h.theHelperIAmEscorting.value,
                escortedHelperName: h.theHelperIAmEscorting.value ? (await context.for(Helpers).lookupAsync(h.theHelperIAmEscorting)).name.value : '',
                distributionCenter: undefined
            };
            context._setUser(info);

            await h.save();
            return {
                valid: true,
                authToken: buildToken(info, getSettings(context)),
                requirePassword: false
            } as LoginResponse

        }
        return { valid: false, requirePassword: false } as LoginResponse;
    }
    constructor(
        private dialog: DialogService,

        private tokenHelper: JwtSessionManager,
        private context: Context,
        private routeHelper: RouteHelperService,
        public settings: ApplicationSettings,
        private zone: NgZone
    ) {

        AuthService.doSignOut = () => {

            this.signout();
        }
            ;
        if (settings.currentUserIsValidForAppLoadTest.value)
            tokenHelper.loadSessionFromCookie();
        else {

        }

        tokenHelper.tokenInfoChanged = () => {
            dialog.refreshEventListener(this.context.isAllowed(Roles.distCenterAdmin));
            dialog.refreshFamiliesAndDistributionCenters();
        };
        tokenHelper.tokenInfoChanged();
        window.onmousemove = () => this.refreshUserState();
        window.onkeydown = () => this.refreshUserState();
        this.inactiveTimeout();
        this.serverTokenRenewal();
        this.userInactive.subscribe(() => {
            if (this.context.isSignedIn()) {
                this.dialog.Error(this.settings.lang.sessionExpiredPleaseRelogin);
                this.signout();

            }
            this.inactiveTimeout();
        });
    }
    static UpdateInfoComponent: { new(...args: any[]): any };
    remember: boolean;
    async login(args: loginArgs, remember: boolean) {
        this.remember = remember;
        let loginResponse = await AuthService.login(args);
        if (loginResponse.authToken) {
            if (! await this.userAgreedToConfidentiality())
                loginResponse = {};
        }
        if (loginResponse.authToken) {
            this.setToken(loginResponse.authToken, remember);
            this.dialog.analytics('login ' + (this.context.isAllowed(Roles.admin) ? 'delivery admin' : ''));
            if (this.context.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                this.routeHelper.navigateToComponent((await import("../asign-family/asign-family.component")).AsignFamilyComponent);
            else if (this.context.isAllowed(Roles.overview))
                this.routeHelper.navigateToComponent(OverviewComponent);
            else
                this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
        }
        else {
            this.tokenHelper.signout('/' + Sites.getOrganizationFromContext(this.context));
        }
        return loginResponse;

    }

    private async userAgreedToConfidentiality() {
        if (this.settings.requireConfidentialityApprove.value) {
            if (await this.context.openDialog(YesNoQuestionComponent, x => x.args = {
                question: this.settings.lang.infoIsConfidential,
                yesButtonText: this.settings.lang.confirm
            }, y => y.yes)) {
                return true;
            } else
                return false;
        }
        else return true;

    }

    @ServerFunction({ allowed: true })
    static async login(args: loginArgs, context?: Context): Promise<loginResult> {

        let r: loginResult = {};
        let settings = getSettings(context);
        let h = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(args.phone));
        if (!h) {
            r.newUser = true;
            return r;
        }


        let userHasPassword = h.realStoredPassword.value.length > 0;
        if (userHasPassword && !args.password) {
            r.needPasswordToLogin = true;
            return r;
        }
        if (userHasPassword && args.password) {
            if (!Helpers.passwordHelper.verify(args.password, h.realStoredPassword.value)) {
                r.invalidPassword = true;
                return r;
            }

        }

        let result: HelperUserInfo = await buildHelperUserInfo(h, context);


        context._setUser(result);



        if (args.newPassword) {
            if (args.password == args.newPassword) {
                r = {
                    requiredToSetPassword: true,
                    requiredToSetPasswordReason: settings.lang.newPasswordMustBeNew
                }
                return r;
            }
            h.password.value = args.newPassword;
            try {
                await h.save();
                args.password = args.newPassword;
            }
            catch (error) {
                let message = h.password.validationError;
                if (!message)
                    message = extractError(error);
                r.requiredToSetPassword = true;
                r.requiredToSetPasswordReason = message;
                return r;
            }
        }

        if (userHasPassword && settings.daysToForcePasswordChange.value > 0 && (!h.passwordChangeDate.value || new Date().getTime() > h.passwordChangeDate.value.getTime() + 86400000 * settings.daysToForcePasswordChange.value)) {
            r.requiredToSetPassword = true;
            r.requiredToSetPasswordReason = settings.lang.passwordExpired;
            return r;
        }




        if (h.admin.value || h.distCenterAdmin.value || h.labAdmin.value) {
            let ok = true;
            if (!userHasPassword && !args.newPassword) {
                r.requiredToSetPassword = true;
                r.requiredToSetPasswordReason = settings.lang.adminRequireToSetPassword;
                ok = false;

            }
            if (settings.requireEULA.value && !h.EULASignDate.value && !args.EULASigned) {
                r.requiredToSignEULA = true;
                ok = false;
            }
            if (!ok)
                return r;
        }




        if (args.EULASigned && !h.EULASignDate.value) {
            h.EULASignDate.value = new Date();
            await h.save();
        }


        h.lastSignInDate.value = new Date();
        await h.save();
        return { authToken: buildToken(result, settings) };
    }
    static doSignOut: () => void;


    async signout() {
        this.tokenHelper.signout('/' + Sites.getOrganizationFromContext(this.context));
        setTimeout(async () => {
            this.zone.run(async () =>
                this.routeHelper.navigateToComponent((await import("../users/login/login.component")).LoginComponent));
        }, 100);
    }

    userActivity;
    userInactive: Subject<any> = new Subject();


    inactiveTimeout() {
        if (this.settings.timeToDisconnect.value > 0)
            this.userActivity = setTimeout(() => this.userInactive.next(undefined), this.settings.timeToDisconnect.value * 1000 * TIMEOUT_MULTIPLIER_IN_SECONDS);
    }
    async serverTokenRenewal() {
        if (this.settings.timeToDisconnect.value > 0) {
            if (this.context.isSignedIn())
                try {
                    let r = await AuthService.renewToken();
                    if (!r)
                        this.signout();
                    else
                        this.setToken(r, this.remember);

                }
                catch{
                    this.signout();
                }
            setTimeout(async () => {

                this.serverTokenRenewal();
            }, this.settings.timeToDisconnect.value * 1000 * TIMEOUT_MULTIPLIER_IN_SECONDS)
        }
    }
    @ServerFunction({ allowed: c => c.isSignedIn() })
    static async renewToken(context?: Context) {
        if (!context.isSignedIn())
            return undefined;
        let h = await context.for(Helpers).findId(context.user.id);
        if (!h)
            return undefined;
        let newInfo = await buildHelperUserInfo(h, context);
        newInfo.roles = newInfo.roles.filter(x => context.user.roles.includes(x));

        return buildToken(newInfo, getSettings(context));

    }

    refreshUserState() {
        clearTimeout(this.userActivity);
        this.inactiveTimeout();
    }



}
export interface loginResult {
    authToken?: string,
    needPasswordToLogin?: boolean,
    invalidPassword?: boolean,
    requiredToSetPassword?: boolean,
    requiredToSetPasswordReason?: string,
    requiredToSignEULA?: boolean,
    newUser?: boolean
}
export interface loginArgs {
    phone: string,
    password: string,
    newPassword: string,
    EULASigned: boolean

}

async function buildHelperUserInfo(h: Helpers, context: Context) {
    let result: HelperUserInfo = {
        id: h.id.value,
        roles: [Sites.getOrgRole(context)],
        name: h.name.value,
        distributionCenter: h.distributionCenter.value,
        theHelperIAmEscortingId: h.theHelperIAmEscorting.value,
        escortedHelperName: h.theHelperIAmEscorting.value ? (await context.for(Helpers).lookupAsync(h.theHelperIAmEscorting)).name.value : ''
    };
    if (h.admin.value) {
        if (Sites.isOverviewSchema(context))
            result.roles.push(Roles.overview);
        else {
            result.roles.push(Roles.admin);
            result.roles.push(Roles.distCenterAdmin);
        }
    }
    if (h.distCenterAdmin.value) {
        result.roles.push(Roles.distCenterAdmin);
    }
    if (getSettings(context).isSytemForMlt())
        if (h.labAdmin.value || h.admin.value)
            result.roles.push(Roles.lab);
    return result;
}
function buildToken(result: HelperUserInfo, settings: ApplicationSettings) {
    if (settings.timeToDisconnect.value) {
        return Helpers.helper.createSecuredTokenBasedOn(result, { expiresIn: settings.timeToDisconnect.value * TIMEOUT_MULTIPLIER_IN_SECONDS + 60/*to have one more minute on top of the user disconnect time */ });
    }
    else
        return Helpers.helper.createSecuredTokenBasedOn(result);

}

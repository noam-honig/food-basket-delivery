import { Injectable, HostListener, NgZone } from "@angular/core";

import { DialogService, extractError } from "../select-popup/dialog";

import { Helpers, HelperUserInfo } from "../helpers/helpers";

import { openDialog, RouteHelperService } from '@remult/angular';
import { ServerFunction, Context, UserInfo } from '@remult/core';
import { LoginResponse } from "./login-response";
import { Roles } from "./roles";



import { Sites } from "../sites/sites";
import { OverviewComponent } from "../overview/overview.component";
import { ApplicationSettings, getSettings } from "../manage/ApplicationSettings";
import { YesNoQuestionComponent } from "../select-popup/yes-no-question/yes-no-question.component";
import { Subject } from "rxjs";
import { DeliveryReceptionComponent } from "../delivery-reception/delivery-reception.component";
import { Phone } from "../model-shared/Phone";
import { JwtHelperService } from "@auth0/angular-jwt";

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

            this.signout();
            this.routeHelper.navigateToComponent((await import('../users/login/login.component')).LoginComponent);
            this.failedSmsSignInPhone = response.phone;
            return false;
        }
    }
    failedSmsSignInPhone: string = undefined;
    private setToken(token: string, remember: boolean) {
        let org = Sites.getOrganizationFromContext(this.context);
        if (token) {
            this.context.setUser(<UserInfo>new JwtHelperService().decodeToken(token));
            sessionStorage.setItem("auth_token", token);
        }
        else {
            this.context.setUser(undefined);
            sessionStorage.removeItem("auth_token");
        }
    }
    async signOut() {
        this.setToken(undefined, true);
        this.routeHelper.navigateToComponent((await (import('../users/login/login.component'))).LoginComponent);
    }

    @ServerFunction({ allowed: true })
    static async loginFromSms(key: string, context?: Context) {

        let r: LoginResponse = { valid: false };
        let h = await context.for(Helpers).findFirst(h => h.shortUrlKey.isEqualTo(key));

        if (h) {
            r.phone = h.phone.thePhone;
            let info = await buildHelperUserInfo(h, context);
            let userIsOk = false;
            if (context.user && JSON.stringify(context.user.roles) == JSON.stringify(info.roles) && context.user.id == info.id)
                userIsOk = true;
            if (!h.realStoredPassword && !h.userRequiresPassword())
                userIsOk = true;



            if (userIsOk) {
                h.lastSignInDate = new Date();
                context.setUser(info);

                await h.save();
                return {
                    valid: true,
                    authToken: await buildToken(info, getSettings(context)),
                    requirePassword: false
                } as LoginResponse
            }

        }
        return r;
    }
    constructor(
        private dialog: DialogService,


        private context: Context,
        private routeHelper: RouteHelperService,
        public settings: ApplicationSettings,
        private zone: NgZone
    ) {

        AuthService.doSignOut = () => {
            this.signout();
        }


        if (!settings.currentUserIsValidForAppLoadTest) {
            this.signout();
        }
        context.userChange.observe(() => {
            dialog.refreshEventListener(this.context.isAllowed(Roles.distCenterAdmin));
            dialog.refreshFamiliesAndDistributionCenters();
        });

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
            if (this.failedSmsSignInPhone) {
                this.failedSmsSignInPhone = null;
                this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
            }
            else if (this.context.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                this.routeHelper.navigateToComponent((await import("../asign-family/asign-family.component")).AsignFamilyComponent);
            else if (this.context.isAllowed(Roles.lab))
                this.routeHelper.navigateToComponent(DeliveryReceptionComponent)
            else if (this.context.isAllowed(Roles.overview))
                this.routeHelper.navigateToComponent(OverviewComponent);
            else
                this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
        }
        else {
            this.signout();
        }
        return loginResponse;

    }

    private async userAgreedToConfidentiality() {
        if (this.settings.requireConfidentialityApprove) {
            if (await openDialog(YesNoQuestionComponent, x => x.args = {
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
        let h = await context.for(Helpers).findFirst(h => h.phone.isEqualTo(new Phone(args.phone)));
        if (!h) {
            r.newUser = true;
            return r;
        }


        let userHasPassword = h.realStoredPassword.length > 0;
        if (userHasPassword && !args.password) {
            r.needPasswordToLogin = true;
            return r;
        }
        if (userHasPassword && args.password) {
            if (!(await import('password-hash')).verify(args.password, h.realStoredPassword)) {
                r.invalidPassword = true;
                return r;
            }

        }

        let result: HelperUserInfo = await buildHelperUserInfo(h, context);


        context.setUser(result);



        if (args.newPassword) {
            if (args.password == args.newPassword) {
                r = {
                    requiredToSetPassword: true,
                    requiredToSetPasswordReason: settings.lang.newPasswordMustBeNew
                }
                return r;
            }
            h.password = args.newPassword;
            try {
                await h.save();
                args.password = args.newPassword;
            }
            catch (error) {
                let message = h.$.password.error;
                if (!message)
                    message = extractError(error);
                r.requiredToSetPassword = true;
                r.requiredToSetPasswordReason = message;
                return r;
            }
        }

        if (userHasPassword && settings.daysToForcePasswordChange > 0 && (!h.passwordChangeDate || new Date().getTime() > h.passwordChangeDate.getTime() + 86400000 * settings.daysToForcePasswordChange)) {
            r.requiredToSetPassword = true;
            r.requiredToSetPasswordReason = settings.lang.passwordExpired;
            return r;
        }




        if (h.userRequiresPassword()) {
            let ok = true;
            if (!userHasPassword && !args.newPassword) {
                r.requiredToSetPassword = true;
                r.requiredToSetPasswordReason = settings.lang.adminRequireToSetPassword;
                if (!(h.admin || h.distCenterAdmin || h.labAdmin))
                    settings.lang.indieRequireToSetPassword;
                ok = false;

            }
            if (settings.requireEULA && !h.EULASignDate && !args.EULASigned) {
                r.requiredToSignEULA = true;
                ok = false;
            }
            if (!ok)
                return r;
        }




        if (args.EULASigned && !h.EULASignDate) {
            h.EULASignDate = new Date();
            await h.save();
        }


        h.lastSignInDate = new Date();
        await h.save();
        return { authToken: await buildToken(result, settings) };
    }
    static doSignOut: () => void;


    async signout() {
        this.setToken(undefined,true);
        setTimeout(async () => {
            this.zone.run(async () =>
                this.routeHelper.navigateToComponent((await import("../users/login/login.component")).LoginComponent));
        }, 100);
    }

    userActivity;
    userInactive: Subject<any> = new Subject();


    inactiveTimeout() {
        if (this.settings.timeToDisconnect > 0)
            this.userActivity = setTimeout(() => this.userInactive.next(undefined), this.settings.timeToDisconnect * 1000 * TIMEOUT_MULTIPLIER_IN_SECONDS);
    }
    async serverTokenRenewal() {
        if (this.settings.timeToDisconnect > 0) {
            if (this.context.isSignedIn())
                try {
                    let r = await AuthService.renewToken();
                    if (!r)
                        this.signout();
                    else
                        this.setToken(r, this.remember);

                }
                catch {
                    this.signout();
                }
            setTimeout(async () => {

                this.serverTokenRenewal();
            }, this.settings.timeToDisconnect * 1000 * TIMEOUT_MULTIPLIER_IN_SECONDS)
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
        id: h.id,
        roles: [Sites.getOrgRole(context)],
        name: h.name,
        distributionCenter: h.distributionCenter.evilGetId(),
        theHelperIAmEscortingId: h.theHelperIAmEscorting.evilGetId(),
        escortedHelperName: h.theHelperIAmEscorting ? (await (h.theHelperIAmEscorting.waitLoad())).name : ''
    };
    if (h.admin) {
        if (Sites.isOverviewSchema(context))
            result.roles.push(Roles.overview);
        else {
            result.roles.push(Roles.admin);
            result.roles.push(Roles.distCenterAdmin);
        }
    }
    if (h.distCenterAdmin) {
        result.roles.push(Roles.distCenterAdmin);
    }
    if (getSettings(context).isSytemForMlt()) {
        if (h.labAdmin || h.admin)
            result.roles.push(Roles.lab);
        if (h.isIndependent || h.admin || h.distCenterAdmin)
            result.roles.push(Roles.indie);
    }

    return result;
}
async function buildToken(result: HelperUserInfo, settings: ApplicationSettings) {
    let t = (await import('jsonwebtoken'));
    if (settings.timeToDisconnect) {
        return t.sign(result, process.env.TOKEN_SIGN_KEY, { expiresIn: settings.timeToDisconnect * TIMEOUT_MULTIPLIER_IN_SECONDS + 60/*to have one more minute on top of the user disconnect time */ });
    }
    else
        return t.sign(result, process.env.TOKEN_SIGN_KEY);

}

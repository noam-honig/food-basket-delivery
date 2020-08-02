import { Injectable } from "@angular/core";

import { DialogService } from "../select-popup/dialog";

import { Helpers, HelperUserInfo } from "../helpers/helpers";

import { ServerFunction, UserInfo, JwtSessionManager, RouteHelperService, DataApiRequest } from '@remult/core';
import { Context } from '@remult/core';
import { LoginResponse } from "./login-response";
import { Roles } from "./roles";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";


import { Sites } from "../sites/sites";
import { OverviewComponent } from "../overview/overview.component";
import { SelectListComponent } from "../select-list/select-list.component";
import { ApplicationSettings } from "../manage/ApplicationSettings";


@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        var response = await AuthService.loginFromSms(key);
        if (response.valid) {
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
                authToken: Helpers.helper.createSecuredTokenBasedOn(info),
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
        public settings: ApplicationSettings
    ) {

        tokenHelper.loadSessionFromCookie();
        tokenHelper.tokenInfoChanged = () => {
            dialog.refreshEventListener(this.context.isAllowed(Roles.distCenterAdmin));
            dialog.refreshFamiliesAndDistributionCenters();
        };
        tokenHelper.tokenInfoChanged();
    }
    static UpdateInfoComponent: { new(...args: any[]): any };
    async login(user: string, password: string, remember: boolean, fail: () => void, askForPassword: () => void) {

        let options = await AuthService.login(user, password);

        if (options) {
            if (options.askForPassword) {
                askForPassword();
                return;
            }
            let loginResponse = options;



            this.setToken(loginResponse.authToken, remember);
            this.dialog.analytics('login ' + (this.context.isAllowed(Roles.admin) ? 'delivery admin' : ''));
            if (loginResponse.requirePassword) {
                this.dialog.YesNoQuestion(this.settings.lang.hello + ' ' + this.context.user.name + ' ' + this.settings.lang.adminRequireToSetPassword, () => {
                    this.routeHelper.navigateToComponent(AuthService.UpdateInfoComponent);//changing this caused a crash
                });
            }
            else {
                if (this.context.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                    this.routeHelper.navigateToComponent(AsignFamilyComponent);
                else if (this.context.isAllowed(Roles.overview))
                    this.routeHelper.navigateToComponent(OverviewComponent);
                else
                    this.routeHelper.navigateToComponent((await import("../my-families/my-families.component")).MyFamiliesComponent);
            }

        }
        else {
            this.tokenHelper.signout('/' + Sites.getOrganizationFromContext(this.context));
            //this.dialog.Error(this.settings.lang.userNotFoundOrWrongPassword);
            fail();

        }
    }

    @ServerFunction({ allowed: true })
    static async login(user: string, password: string, context?: Context): Promise<loginResult> {
        let r: loginResult = undefined;


        await context.for(Helpers).iterate(h => h.phone.isEqualTo(user)).forEach(async h => {
            let sort = 9;
            let helperHasPassword = h.realStoredPassword.value.length > 0;
            let noPasswordInput = !password || password.trim().length == 0;
            if (noPasswordInput && helperHasPassword) {
                r = {
                    authToken: undefined,
                    askForPassword: true,
                    requirePassword: false,
                    sort
                };
            }
            else if (!helperHasPassword || Helpers.passwordHelper.verify(password, h.realStoredPassword.value)) {
                let result: HelperUserInfo;
                let requirePassword = false;

                result = {

                    id: h.id.value,
                    roles: [Sites.getOrgRole(context)],
                    name: h.name.value,
                    distributionCenter: h.distributionCenter.value,
                    theHelperIAmEscortingId: h.theHelperIAmEscorting.value,
                    escortedHelperName: h.theHelperIAmEscorting.value ? (await context.for(Helpers).lookupAsync(h.theHelperIAmEscorting)).name.value : ''
                };
                if (!helperHasPassword && (h.admin.value || h.distCenterAdmin.value || h.labAdmin.value)) {
                    requirePassword = true;
                }
                else {

                    if (h.admin.value) {
                        sort = 1;
                        if (Sites.isOverviewSchema(context))
                            result.roles.push(Roles.overview)
                        else {
                            result.roles.push(Roles.admin);
                            result.roles.push(Roles.distCenterAdmin);
                            result.roles.push(Roles.lab);
                        }
                    }
                    if (h.distCenterAdmin.value) {
                        sort = 5;
                        result.roles.push(Roles.distCenterAdmin);
                    }
                    if (h.labAdmin.value) {
                        sort = 3;
                        result.roles.push(Roles.lab);
                    }


                }
                if (!requirePassword) {
                    context._setUser(result);
                    h.lastSignInDate.value = new Date();
                    await h.save();
                }
                r = {
                    authToken: Helpers.helper.createSecuredTokenBasedOn(result),
                    requirePassword,
                    sort,
                    askForPassword: false
                };

            }
        });

        return r;
    }
    async signout() {
        this.tokenHelper.signout('/' + Sites.getOrganizationFromContext(this.context));
        this.routeHelper.navigateToComponent((await import("../users/login/login.component")).LoginComponent);
    }


}
export interface loginResult {

    authToken: string,
    requirePassword: boolean,
    askForPassword: boolean,

    sort: number
}
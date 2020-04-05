import { Injectable } from "@angular/core";

import { DialogService } from "../select-popup/dialog";

import { Helpers, HelperUserInfo } from "../helpers/helpers";

import { ServerFunction, UserInfo, JwtSessionManager, RouteHelperService, DataApiRequest } from '@remult/core';
import { Context } from '@remult/core';
import { LoginResponse } from "./login-response";
import { Roles } from "./roles";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";
import { MyFamiliesComponent } from "../my-families/my-families.component";
import { LoginComponent } from "../users/login/login.component";
import { Sites } from "../sites/sites";
import { OverviewComponent } from "../overview/overview.component";
import { SelectListComponent } from "../select-list/select-list.component";


@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        var response = await AuthService.loginFromSms(key);
        if (response.valid) {
            this.setToken(response.authToken, false);
            this.dialog.analytics('login from sms');
            this.routeHelper.navigateToComponent(MyFamiliesComponent);
        }
        else
            this.tokenHelper.signout();


    }
    private setToken(token: string, remember: boolean) {
        let org = Sites.getOrganizationFromContext(this.context);
        this.tokenHelper.setToken(token, remember, '/' + org);
    }
    @ServerFunction({ allowed: true })
    static async loginFromSms(key: string, context?: Context) {

        let h = await context.for(Helpers).findFirst(h => h.shortUrlKey.isEqualTo(key));
        if (h) {
            return {
                valid: true,
                authToken: Helpers.helper.createSecuredTokenBasedOn({
                    id: h.id.value,
                    name: h.name.value,
                    roles: [Sites.getOrgRole(context)],
                    theHelperIAmEscortingId: h.theHelperIAmEscorting.value,
                    escortedHelperName: h.theHelperIAmEscorting.value ? (await context.for(Helpers).lookupAsync(h.theHelperIAmEscorting)).name.value : ''
                } as HelperUserInfo),
                requirePassword: false
            } as LoginResponse

        }
        return { valid: false, requirePassword: false } as LoginResponse;
    }
    constructor(
        private dialog: DialogService,

        private tokenHelper: JwtSessionManager,
        private context: Context,
        private routeHelper: RouteHelperService
    ) {

        tokenHelper.loadSessionFromCookie();
        tokenHelper.tokenInfoChanged = () => dialog.refreshEventListener(this.context.isAllowed(Roles.admin));
        tokenHelper.tokenInfoChanged();
    }
    static UpdateInfoComponent: { new(...args: any[]): any };
    async login(user: string, password: string, remember: boolean, fail: () => void) {

        let options = await AuthService.login(user, password);

        if (options.length > 0) {

            let loginResponse = options[0];
            if (options.length > 1) {
                loginResponse = undefined;
                await this.context.openDialog(SelectListComponent, x => x.args = {
                    title: 'בחר מרכז חלוקה',
                    options: options.map(x => ({ name: x.distCenterName, item: x }))

                }, x => loginResponse = x.selected != undefined ? x.selected.item : undefined);
                if (!loginResponse) {
                    fail();
                    return;
                }
            }


            this.setToken(loginResponse.authToken, remember);
            this.dialog.analytics('login ' + (this.context.isAllowed(Roles.admin) ? 'delivery admin' : ''));
            if (loginResponse.requirePassword) {
                this.dialog.YesNoQuestion('שלום ' + this.context.user.name + ' את מוגדרת כמנהלת אך לא מוגדרת עבורך סיסמה. כדי להשתמש ביכולות הניהול חובה להגן על הפרטים עם סיסמה. הנך מועברת למסך עדכון פרטים לעדכון סיסמה.', () => {
                    this.routeHelper.navigateToComponent(AuthService.UpdateInfoComponent);//changing this caused a crash
                });
            }
            else {
                if (this.context.isAllowed([Roles.admin, Roles.distCenterAdmin]))
                    this.routeHelper.navigateToComponent(AsignFamilyComponent);
                else if (this.context.isAllowed(Roles.overview))
                    this.routeHelper.navigateToComponent(OverviewComponent);
                else
                    this.routeHelper.navigateToComponent(MyFamiliesComponent);
            }

        }
        else {
            this.tokenHelper.signout();
            this.dialog.Error("משתמשת לא נמצאה או סיסמה שגויה");
            fail();

        }
    }

    @ServerFunction({ allowed: true })
    static async login(user: string, password: string, context?: Context): Promise<loginResult[]> {
        let r: loginResult[] = [];


        await context.for(Helpers).foreach(h => h.phone.isEqualTo(user), async h => {

            if (!h.realStoredPassword.value || Helpers.passwordHelper.verify(password, h.realStoredPassword.value)) {
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
                if (h.realStoredPassword.value.length == 0 && (h.admin.value || h.distCenterAdmin.value)) {
                    requirePassword = true;
                }
                else {
                    if (h.admin.value) {
                        if (Sites.getOrganizationFromContext(context) == Sites.guestSchema)
                            result.roles.push(Roles.overview)
                        else {
                            result.roles.push(Roles.admin);
                            result.roles.push(Roles.distCenterAdmin);
                        }
                    }
                    if (h.distCenterAdmin.value) {
                        result.roles.push(Roles.distCenterAdmin);
                    }


                }
                r.push({
                    authToken: Helpers.helper.createSecuredTokenBasedOn(result),
                    requirePassword,
                    distCenterName: await h.distributionCenter.getTheValue()
                });

            }
        });
        return r;
    }
    signout(): any {
        this.tokenHelper.signout();
        this.routeHelper.navigateToComponent(LoginComponent);
    }


}
export interface loginResult {

    authToken: string,
    requirePassword: boolean,
    distCenterName: string
}
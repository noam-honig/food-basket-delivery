import { Injectable } from "@angular/core";

import { DialogService } from "../select-popup/dialog";

import { Helpers } from "../helpers/helpers";

import { RunOnServer, UserInfo, JwtSessionManager, RouteHelperService } from "radweb";
import { Context } from "radweb";
import { LoginResponse } from "./login-response";
import { Roles } from "./roles";
import { JWTCookieAuthorizationHelper } from "radweb-server";
import { AsignFamilyComponent } from "../asign-family/asign-family.component";
import { MyWeeklyFamiliesComponent } from "../my-weekly-families/my-weekly-families.component";
import { WeeklyPackerByFamilyComponent } from "../weekly-packer-by-family/weekly-packer-by-family.component";
import { MyFamiliesComponent } from "../my-families/my-families.component";
import { LoginComponent } from "../users/login/login.component";


@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        var response = await AuthService.loginFromSms(key);
        if (response.valid) {
            this.tokenHelper.setToken(response.authToken, false);
            this.dialog.analytics('login from sms');
            this.routeHelper.navigateToComponent(MyFamiliesComponent);
        }
        else
            this.tokenHelper.signout();


    }
    @RunOnServer({ allowed: true })
    static async loginFromSms(key: string, context?: Context) {

        let h = await context.for(Helpers).findFirst(h => h.shortUrlKey.isEqualTo(key));
        if (h) {
            return {
                valid: true,
                authToken: Helpers.helper.createSecuredTokenBasedOn({
                    id: h.id.value,
                    name: h.name.value
                } as UserInfo),
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
        tokenHelper.tokenInfoChanged = () => dialog.refreshEventListener(this.context.isAllowed(Roles.deliveryAdmin));
        tokenHelper.tokenInfoChanged();
    }
    static UpdateInfoComponent: { new(...args: any[]): any };
    async login(user: string, password: string, remember: boolean, fail: () => void) {

        let loginResponse = await AuthService.login(user, password);
        if (loginResponse.valid) {
            this.tokenHelper.setToken(loginResponse.authToken, remember);
            this.dialog.analytics('login ' + (this.context.isAllowed(Roles.deliveryAdmin) ? 'delivery admin' : ''));
            if (loginResponse.requirePassword) {
                this.dialog.YesNoQuestion('שלום ' + this.context.user.name + ' את מוגדרת כמנהלת אך לא מוגדרת עבורך סיסמה. כדי להשתמש ביכולות הניהול חובה להגן על הפרטים עם סיסמה. הנך מועברת למסך עדכון פרטים לעדכון סיסמה.', () => {
                    this.routeHelper.navigateToComponent(AuthService.UpdateInfoComponent);//changing this caused a crash
                });
            }
            else {
                if (this.context.isAllowed(Roles.deliveryAdmin))
                    this.routeHelper.navigateToComponent(AsignFamilyComponent);
                else if (this.context.isAllowed(Roles.weeklyFamilyVolunteer))
                    this.routeHelper.navigateToComponent(MyWeeklyFamiliesComponent);
                else if (this.context.isAllowed(Roles.weeklyFamilyPacker))
                    this.routeHelper.navigateToComponent(WeeklyPackerByFamilyComponent);
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

    @RunOnServer({ allowed: true })
    static async login(user: string, password: string, context?: Context) {
        let result: UserInfo;
        let requirePassword = false;

        await context.for(Helpers).foreach(h => h.phone.isEqualTo(user), async h => {
            if (!h.realStoredPassword.value || Helpers.passwordHelper.verify(password, h.realStoredPassword.value)) {
                result = {

                    id: h.id.value,
                    roles: [],
                    name: h.name.value
                };
                if (h.realStoredPassword.value.length == 0 && (h.deliveryAdmin.value || h.superAdmin.value || h.weeklyFamilyPacker.value || h.weeklyFamilyVolunteer.value || h.weeklyFamilyAdmin.value)) {
                    requirePassword = true;
                }
                else {
                    if (h.superAdmin.value) {
                        result.roles.push(Roles.superAdmin);
                    }
                    if (h.weeklyFamilyAdmin.value) {
                        result.roles.push(...Roles.anyWeekly);
                    }
                    if (h.weeklyFamilyVolunteer.value)
                        result.roles.push(Roles.weeklyFamilyVolunteer);
                    if (h.weeklyFamilyPacker.value)
                        result.roles.push(Roles.weeklyFamilyPacker);
                    if (h.deliveryAdmin.value)
                        result.roles.push(Roles.deliveryAdmin);


                }

            }
        });
        if (result) {
            return {
                valid: true,
                authToken: Helpers.helper.createSecuredTokenBasedOn(result),
                requirePassword
            };
        }
        return { valid: false, requirePassword: false };
    }
    signout(): any {
        this.tokenHelper.signout();
        this.routeHelper.navigateToComponent(LoginComponent);
    }


}

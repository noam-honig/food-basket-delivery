import { Injectable } from "@angular/core";

import { DialogService } from "../select-popup/dialog";
import { Router } from "@angular/router";
import { evilStatics } from "./evil-statics";
import { Helpers } from "../helpers/helpers";

import { RunOnServer, UserInfo } from "radweb";
import { Context } from "radweb";
import { LoginResponse } from "./login-response";
import { Roles, RolesGroup } from "./roles";


@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        this.auth.loggedIn(await AuthService.loginFromSms(key), false);
        if (this.auth.valid) {
            this.dialog.analytics('login from sms');
            this.router.navigate([evilStatics.routes.myFamilies]);
        }
    }
    @RunOnServer({ allowed: () => true })
    static async loginFromSms(key: string, context?: Context) {

        let h = await context.for(Helpers).findFirst(h => h.shortUrlKey.isEqualTo(key));
        if (h) {
            return {
                valid: true,
                authToken: evilStatics.auth.createTokenFor({
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
        private router: Router
    ) { }

    async login(user: string, password: string, remember: boolean, fail: () => void) {

        let loginResponse = await AuthService.login(user, password);
        this.auth.loggedIn(loginResponse, remember);
        if (this.auth.valid) {
            this.dialog.analytics('login ' + (this.auth.info.deliveryAdmin ? 'delivery admin' : ''));
            if (loginResponse.requirePassword) {
                this.dialog.YesNoQuestion('שלום ' + this.auth.info.name + ' את מוגדרת כמנהלת אך לא מוגדרת עבורך סיסמה. כדי להשתמש ביכולות הניהול חובה להגן על הפרטים עם סיסמה. הנך מועברת למסך עדכון פרטים לעדכון סיסמה.', () => {
                    this.router.navigate([evilStatics.routes.updateInfo])
                });
            }
            else {
                if (this.auth.info.deliveryAdmin)
                    this.router.navigate([evilStatics.routes.assignFamilies])
                else if (this.auth.info.weeklyFamilyVolunteer)
                    this.router.navigate([evilStatics.routes.myWeeklyFamilies]);
                else if (this.auth.info.weeklyFamilyPacker)
                    this.router.navigate([evilStatics.routes.weeklyFamiliesPack]);
                else
                    this.router.navigate([evilStatics.routes.myFamilies])
            }

        }
        else {
            this.dialog.Error("משתמשת לא נמצאה או סיסמה שגויה");
            fail();
        }
    }
    @RunOnServer({ allowed: () => true })
    static async login(user: string, password: string, context?: Context) {
        let result: UserInfo;
        let requirePassword = false;

        await context.for(Helpers).foreach(h => h.phone.isEqualTo(user), async h => {
            if (!h.realStoredPassword.value || evilStatics.passwordHelper.verify(password, h.realStoredPassword.value)) {
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
                        result.roles.push(...RolesGroup.anyWeekly);
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
                authToken: evilStatics.auth.createTokenFor(result),
                requirePassword
            };
        }
        return { valid: false, requirePassword: false };
    }
    signout(): any {
        this.auth.signout();
        this.router.navigate([evilStatics.routes.login]);
    }
    

}

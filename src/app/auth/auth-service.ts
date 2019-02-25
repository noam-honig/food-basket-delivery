import { Injectable } from "@angular/core";
import { myAuthInfo } from "./my-auth-info";
import { DialogService } from "../select-popup/dialog";
import { Router } from "@angular/router";
import { evilStatics } from "./evil-statics";
import { Helpers } from "../helpers/helpers";

import { RunOnServer } from "./server-action";
import { Context } from "../shared/context";
import { LoginResponse } from "./auth-info";


@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        this.auth.loggedIn(await AuthService.loginFromSms(key), false);
        if (this.auth.valid) {
            this.router.navigate([evilStatics.routes.myFamilies]);
        }
    }
    @RunOnServer({ allowed: () => true })
    static async loginFromSms(key: string, context?: Context) {

        let h = await context.for(Helpers).findFirst(h => h.shortUrlKey.isEqualTo(key));
        if (h)
            return {
                valid: true,
                authToken: evilStatics.auth.createTokenFor({
                    loggedIn: true,
                    helperId: h.id.value,
                    deliveryAdmin: false,
                    name: h.name.value
                }),
                requirePassword: false
            } as LoginResponse
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
            if (loginResponse.requirePassword) {
                this.dialog.YesNoQuestion('שלום ' + this.auth.info.name + ' את מוגדרת כמנהלת אך לא מוגדרת עבורך סיסמה. כדי להשתמש ביכולות הניהול חובה להגן על הפרטים עם סיסמה. הנך מועברת למסך עדכון פרטים לעדכון סיסמה.', () => {
                    this.router.navigate([evilStatics.routes.updateInfo])
                });
            }
            else {
                if (this.auth.info.deliveryAdmin)
                    this.router.navigate([evilStatics.routes.families])
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
        let result: myAuthInfo;
        let requirePassword = false;

        await context.for(Helpers).foreach(h => h.phone.isEqualTo(user), async h => {
            if (!h.realStoredPassword.value || evilStatics.passwordHelper.verify(password, h.realStoredPassword.value)) {
                result = {
                    loggedIn: true,
                    helperId: h.id.value,
                    superAdmin: h.superAdmin.value,
                    deliveryAdmin: h.deliveryAdmin.value || h.superAdmin.value,
                    weeklyFamilyVolunteer: h.weeklyFamilyVolunteer.value || h.weeklyFamilyAdmin.value || h.superAdmin.value,
                    weeklyFamilyPacker: h.weeklyFamilyPacker.value || h.weeklyFamilyAdmin.value || h.superAdmin.value,
                    weeklyFamilyAdmin: h.weeklyFamilyAdmin.value || h.superAdmin.value,
                    deliveryVolunteer: h.deliveryVolunteer.value || h.deliveryAdmin.value || h.superAdmin.value,
                    name: h.name.value
                };
                if ((result.deliveryAdmin||result.superAdmin||result.weeklyFamilyPacker||result.weeklyFamilyVolunteer||result.weeklyFamilyAdmin) && h.realStoredPassword.value.length == 0) {
                    result.deliveryAdmin = false;
                    requirePassword = true;
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
    auth = evilStatics.auth;

}

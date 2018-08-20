import { Injectable } from "@angular/core";
import { Authentication } from "./authentication";
import { myAuthInfo } from "./my-auth-info";
import { foreachEntityItem } from "../shared/utils";

import { SelectService } from "../select-popup/select-service";
import { Router, Route } from "@angular/router";
import { evilStatics } from "./evil-statics";
import { LoginAction } from "./loginAction";
import { LoginFromSmsAction } from "../login-from-sms/login-from-sms-action";


@Injectable()
export class AuthService {

    async loginFromSms(key: string) {
        this.auth.loggedIn(await new LoginFromSmsAction().run({ key: key }), false);
        if (this.auth.valid) {
            this.router.navigate([evilStatics.routes.myFamilies]);
        }
    }
    constructor(
        private dialog: SelectService,
        private router: Router
    ) { }

    async login(user: string, password: string, remember: boolean, fail: () => void) {

        let loginResponse = await new LoginAction().run({ user: user, password: password });
        this.auth.loggedIn(loginResponse, remember);
        if (this.auth.valid) {
            if (loginResponse.requirePassword) {
                this.dialog.YesNoQuestion('שלום ' + this.auth.info.name + ' את מוגדרת כמנהלת אך לא מוגדרת עבורך סיסמה. כדי להשתמש ביכולות הניהול חובה להגן על הפרטים עם סיסמה. הנך מועברת למסך עדכון פרטים לעדכון סיסמה.', () => {
                    this.router.navigate([evilStatics.routes.updateInfo])
                });
            }
            else {
                if (this.auth.info.admin)
                    this.router.navigate([evilStatics.routes.families])
                else
                    this.router.navigate([evilStatics.routes.myFamilies])
            }

        }
        else {
            this.dialog.Error("משתמשת לא נמצאה או סיסמה שגויה");
            fail();
        }

    }
    signout(): any {
        this.auth.signout();
        this.router.navigate([evilStatics.routes.login]);
    }
    auth = evilStatics.auth;

}
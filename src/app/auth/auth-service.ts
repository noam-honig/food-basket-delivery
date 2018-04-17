import { Injectable } from "@angular/core";
import { Authentication } from "./authentication";
import { myAuthInfo } from "./my-auth-info";
import { foreachEntityItem } from "../shared/utils";
import { Helpers } from "../models";
import { SelectService } from "../select-popup/select-service";
import { Router } from "@angular/router";
import { evilStatics } from "./evil-statics";
import { LoginAction } from "./loginAction";


@Injectable()
export class AuthService {

    constructor(
        private dialog: SelectService,
        private router: Router
    ) { }
    async login(user: string, password: string, remember: boolean) {
        let ok = false;
        this.auth.info = await new LoginAction().run({ user, password });
        if (remember)
            this.auth.rememberOnThisMachine();
        if (ok) {
            if (this.auth.info.admin)
                this.router.navigate(['/events'])
            else
                this.router.navigate(['/my-events'])
        }
        else {
            this.dialog.Error("משתמשת לא נמצאה");
        }

    }
    signout(): any {
        this.auth.signout();
        this.router.navigate(['/login']);
    }
    auth = evilStatics.auth;

}
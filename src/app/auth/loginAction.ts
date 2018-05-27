import { ServerAction } from "./server-action";
import { myAuthInfo } from "./my-auth-info";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { foreachEntityItem } from "../shared/utils";
import { Helpers } from "../models";
import * as passwordHash from 'password-hash';
import * as jwt from 'jsonwebtoken';
import { LoginResponse } from "./auth-info";
import { evilStatics } from "./evil-statics";

export class LoginAction extends ServerAction<LoginInfo, LoginResponse>{
    constructor() {
        super('login');//required because of minification
    }
    protected async execute(info: LoginInfo, req: DataApiRequest<myAuthInfo>): Promise<LoginResponse> {
        let result: myAuthInfo;
        await foreachEntityItem(new Helpers(), h => h.phone.isEqualTo(info.user), async h => {
            if (!h.realStoredPassword.value || passwordHash.verify(info.password, h.realStoredPassword.value))
                result = {
                    helperId: h.id.value,
                    admin: h.isAdmin.value,
                    name: h.name.value
                };
        });
       
        if (result) {
            return {
                valid: true,
                authToken: evilStatics.auth.createTokenFor(result)
            };
        }

        return { valid: false };

    }
}

export interface LoginInfo {
    user: string;
    password: string;
}
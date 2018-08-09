

import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { foreachEntityItem } from "../shared/utils";
import { Helpers } from "../models";
import * as passwordHash from 'password-hash';
import * as jwt from 'jsonwebtoken';
import { ServerAction } from "../auth/server-action";
import { myAuthInfo } from "../auth/my-auth-info";
import { LoginResponse } from "../auth/auth-info";
import { evilStatics } from "../auth/evil-statics";


export class LoginFromSmsAction extends ServerAction<LoginFromSmsInfo, LoginResponse>{
    constructor() {
        super('login-from-sms');//required because of minification
    }
    protected async execute(info: LoginFromSmsInfo, req: DataApiRequest<myAuthInfo>): Promise<LoginResponse> {
        let result: myAuthInfo;
        await foreachEntityItem(new Helpers(), h => h.shortUrlKey.isEqualTo(info.key), async h => {
            result = {
                helperId: h.id.value,
                admin: false,
                name: h.name.value
            };
        });

        if (result) {
            return {
                valid: true,
                authToken: evilStatics.auth.createTokenFor(result),
                requirePassword:false
            };
        }

        return { valid: false,requirePassword:false };

    }
}

export interface LoginFromSmsInfo {
    key: string
}
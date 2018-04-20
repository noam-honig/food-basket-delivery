import { ServerAction } from "./server-action";
import { myAuthInfo } from "./my-auth-info";
import { DataApiRequest } from "radweb/utils/dataInterfaces";
import { foreachEntityItem } from "../shared/utils";
import { Helpers } from "../models";
import * as passwordHash from 'password-hash';

export class LoginAction extends ServerAction<LoginInfo, myAuthInfo>{
    constructor() {
        super('login');//required because of minification
    }
    protected async execute(info: LoginInfo, req: DataApiRequest<myAuthInfo>): Promise<myAuthInfo> {
        let result: myAuthInfo = {
            valid: false
        };
        await foreachEntityItem(new Helpers(), h => h.phone.isEqualTo(info.user), async h => {
            if (!h.realStoredPassword.value || passwordHash.verify(info.password, h.realStoredPassword.value))
                result = {
                    helperId: h.id.value,
                    admin: h.isAdmin.value,
                    name: h.name.value,
                    authToken: 'stam token',
                    valid: true
                };
        });
        if (!result.valid)
            await foreachEntityItem(new Helpers(), h => h.userName.isEqualTo(info.user), async h => {
                if (!h.realStoredPassword.value || passwordHash.verify(info.password, h.realStoredPassword.value))
                    result = {
                        helperId: h.id.value,
                        admin: h.isAdmin.value,
                        name: h.name.value,
                        authToken: 'stam token',
                        valid: true
                    };
            });
        return result;

    }
}

export interface LoginInfo {
    user: string;
    password: string;
}
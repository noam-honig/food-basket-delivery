import { ServerAction } from "./server-action";
import { myAuthInfo } from "./my-auth-info";
import { DataApiRequest } from "radweb/utils/dataInterfaces";
import { foreachEntityItem } from "../shared/utils";
import { Helpers } from "../models";

export class LoginAction extends ServerAction<LoginInfo, myAuthInfo>{
    constructor(){
        super('login');//required because of minification
    }
    protected async execute(info: LoginInfo, req: DataApiRequest<myAuthInfo>): Promise<myAuthInfo> {
        let result: myAuthInfo = {
            valid: false
        };
        console.log(info.user);
        await foreachEntityItem(new Helpers(), h => h.phone.isEqualTo(info.user), async h => {

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
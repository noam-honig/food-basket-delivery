import { ServerAction } from "../auth/server-action";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";
import { myAuthInfo } from "../auth/my-auth-info";

export interface inArgs {
    key: string;
}


export class ServerEventAuthorizeAction extends ServerAction<inArgs, any>{
    constructor() {
        super('ServerEventAuthorizeAction');//required because of minification
    }

    protected async execute(info: inArgs, req: DataApiRequest<myAuthInfo>): Promise<any> {
        console.log('start authenticate on server');
        ServerEventAuthorizeAction.authorize(info.key);
        console.log('end authenticate on server');
        return {};
    }
    static authorize: (key: string) => void = (key: string) => { };
}



import { Action } from "radweb";
import { myAuthInfo } from "./my-auth-info";
import { environment } from "../../environments/environment";
import { evilStatics } from "./evil-statics";
import { DataApiRequest } from "radweb/utils/dataInterfaces1";

export abstract class ServerAction<inParam, outParam> extends Action<inParam, outParam, myAuthInfo>{
    constructor(url?: string) {
        super(environment.serverUrl + 'api/', url, evilStatics.auth.AddAuthInfoToRequest());
    }
}

interface inArgs {
    args: any[];
}
interface result {
    data: any;
}

export class myServerAction extends ServerAction<inArgs, result>
{
    constructor(name: string, private originalMethod: (args: any[]) => any) {
        super(name);
    }
    protected async execute(info: inArgs, req: DataApiRequest<myAuthInfo>): Promise<result> {
        return {
            data:await this.originalMethod(info.args)
        };
    }

}

export function RunOnServer(target, key: string, descriptor: any) {


    var originalMethod = descriptor.value;

    let serverAction = new myServerAction(key, args => originalMethod.apply(undefined, args));



    descriptor.value = async function (...args: any[]) {


        var a = args.map(a => JSON.stringify(a)).join();

        // note usage of originalMethod here
        //var result = originalMethod.apply(this, args);
        var result = await serverAction.run({ args });

        var r = JSON.stringify(result);

        console.log(`Call: ${key}(${a}) => ${r}`);
        return result.data;
    }
    descriptor.value[serverActionField] = serverAction;
    

    return descriptor;
}
export const serverActionField = Symbol('serverActionField');

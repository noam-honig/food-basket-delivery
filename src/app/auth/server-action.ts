import { Action } from "radweb";
import { myAuthInfo } from "./my-auth-info";
import { environment } from "../../environments/environment";
import { evilStatics } from "./evil-statics";
import { DataApiRequest, DataProviderFactory } from "radweb/utils/dataInterfaces1";
import 'reflect-metadata';
import { Context } from "../shared/entity-provider";

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

export class ServerContext extends Context {
    constructor(info: myAuthInfo, dataProvider?: DataProviderFactory) {
        super();
        this._getInfo = () => info;
        if (dataProvider)
            this._dataSource = dataProvider;

    }
}
export class myServerAction extends ServerAction<inArgs, result>
{
    constructor(name: string, private types: any[], private originalMethod: (args: any[]) => any) {
        super(name);
    }
    protected async execute(info: inArgs, req: DataApiRequest<myAuthInfo>): Promise<result> {
        for (let i = 0; i < this.types.length; i++) {
            if (info.args.length < i) {
                info.args.push(undefined);
            }
            if (this.types[i] == Context) {
                let c = new ServerContext(req.authInfo);
                info.args[i] = c;
            }
        }


        return {



            data: await this.originalMethod(info.args)
        };
    }

}

export function RunOnServer(target, key: string, descriptor: any) {


    var originalMethod = descriptor.value;
    var types = Reflect.getMetadata("design:paramtypes", target, key);


    let serverAction = new myServerAction(key, types, args => originalMethod.apply(undefined, args));



    descriptor.value = async function (...args: any[]) {

        var result = await serverAction.run({ args });
        return result.data;
    }
    descriptor.value[serverActionField] = serverAction;


    return descriptor;
}
export const serverActionField = Symbol('serverActionField');

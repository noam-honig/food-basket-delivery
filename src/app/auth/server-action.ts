import { Action } from "radweb";
import { myAuthInfo } from "./my-auth-info";
import { environment } from "../../environments/environment";
import { evilStatics } from "./evil-statics";
import { DataApiRequest, DataProviderFactory } from "radweb/utils/dataInterfaces1";
import 'reflect-metadata';
import { Context, ServerContext } from "../shared/context";

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
    constructor(name: string, private types: any[], private options: RunOnServerOptions, private originalMethod: (args: any[]) => any) {
        super(name);
    }
    protected async execute(info: inArgs, req: DataApiRequest<myAuthInfo>): Promise<result> {
        let context = new ServerContext(req.authInfo);
        if (!this.options.allowed(context))
            throw 'not allowed';
        for (let i = 0; i < this.types.length; i++) {
            if (info.args.length < i) {
                info.args.push(undefined);
            }
            if (this.types[i] == Context) {

                info.args[i] = context;
            }
        }

        try {
            return {
                data: await this.originalMethod(info.args)
            };
        }

        catch (err) {
            console.log(err);
            throw err
        }
    }

}
export interface RunOnServerOptions {
    allowed: (context: Context) => boolean;
}
export const allActions = [];
export function RunOnServer(options: RunOnServerOptions) {
    return (target, key: string, descriptor: any) => {

        var originalMethod = descriptor.value;
        var types = Reflect.getMetadata("design:paramtypes", target, key);
        

        let serverAction = new myServerAction(key, types, options, args => originalMethod.apply(undefined, args));



        descriptor.value = async function (...args: any[]) {

            var result = await serverAction.run({ args });
            return result.data;
        }
        allActions.push(descriptor.value);
        descriptor.value[serverActionField] = serverAction;


        return descriptor;
    }
}
export const serverActionField = Symbol('serverActionField');

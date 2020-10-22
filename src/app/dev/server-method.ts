import { Action, actionInfo, Allowed, Column, Context, DataApiRequest, DataApiResponse, DataProviderFactoryBuilder, serverActionField, ServerContext } from "@remult/core";

export function ServerMethod() {
    return (target: any, key: string, descriptor: any) => {

        var originalMethod = descriptor.value;
        var types = Reflect.getMetadata("design:paramtypes", target, key);
        // if types are undefined - you've forgot to set: "emitDecoratorMetadata":true

        let url = '';
        let serverAction = new class extends Action<serverMethodInArgs, serverMethodOutArgs>{
            dataProvider: DataProviderFactoryBuilder;

            protected async execute(info: serverMethodInArgs, req: DataApiRequest): Promise<any> {
                let context = new ServerContext();
                context.setReq(req);
                let ds = this.dataProvider(context);
                let data: serverMethodOutArgs;
                await ds.transaction(async ds => {
                    context.setDataProvider(ds);
                    let y: ControllerBase = new target.constructor(context, ds);
                    unpackColumns(y, info.columns)
                    if (!y.isAllowed(context))
                        throw 'not allowed';
                    data = {
                        result: await originalMethod.apply(y, info.args),
                        columns: packColumns(y)
                    };
                })
                return data;

            }

            constructor() {
                super('', '');
            }
            run(pIn) {
                if (!url) {
                    let c = new ServerContext();
                    let y: ControllerBase = new target.constructor(c);
                    //@ts-ignore
                    url = y.__key + '/' + key
                }
                return Action.provider.post(Context.apiBaseUrl + '/' + url, pIn);
            }

            __register(reg: (url: string, what: ((data: any, req: DataApiRequest, res: DataApiResponse) => void)) => void) {
                let c = new ServerContext();
                let y: ControllerBase = new target.constructor(c);
                reg(y.__key + '/' + key, async (d, req, res) => {

                    try {
                        var r = await this.execute(d, req);
                        res.success(r);
                    }
                    catch (err) {
                        res.error(err);
                    }

                });
            }
        }();



        descriptor.value = async function (...args: any[]) {
            if (!actionInfo.runningOnServer) {
                let self: ControllerBase = this;

                let r = (await serverAction.run({ args, columns: packColumns(self) }));
                unpackColumns(self, r.columns);
                return r.result;
            }
            else
                return (await originalMethod.apply(this, args));
        }
        actionInfo.allActions.push(descriptor.value);
        descriptor.value[serverActionField] = serverAction;


        return descriptor;
    }
}

interface serverMethodInArgs {
    args: any[], columns: any
}
interface serverMethodOutArgs {
    result: any,
    columns: any
}
export class ControllerBase {
    __key: string;
    private __columns: Column[];
    isAllowed(context: Context) {
        return context.isAllowed(this.options.allowed);
    }

    get columns() {
        if (!this.__columns) {
            this.__columns = [];
            for (const key in this) {
                if (Object.prototype.hasOwnProperty.call(this, key)) {
                    const element = this[key];
                    if (element instanceof Column) {
                        if (!element.defs.key)
                            element.defs.key = key;
                        this.__columns.push(element);
                    }

                }
            }
        }
        return this.__columns;
    }
    constructor(private options: ControllerOptions) {
        this.__key = options.key;
    }
}
export interface ControllerOptions {
    key: string,
    allowed: Allowed

}

function packColumns(self: ControllerBase) {
    let columns = self.columns;
    if (!columns)
        columns = controllerColumns(self);
    let packedColumns = {};
    for (const c of columns) {
        packedColumns[c.defs.key] = c.rawValue;
    }
    return packedColumns;
}
function unpackColumns(self: ControllerBase, data: any) {
    let columns = self.columns;
    if (!columns)
        columns = controllerColumns(self);
    for (const c of columns) {
        c.rawValue = data[c.defs.key];
    }
}

const classHelpers = new Map<any, ClassHelper>();
const methodHelpers = new Map<any, MethodHelper>();
const classOptions = new Map<any,ControllerOptions>();
export function ServerController(options: ControllerOptions) {
    return function (target) {
        let r = target;
        classOptions.set(r,options);

        while (true) {
            let helper = classHelpers.get(r);
            if (helper) {
                for (const m of helper.methods) {
                    m.classes.set(target, options);
                }
            }
            let p = Object.getPrototypeOf(r.prototype);
            if (p == null)
                break;
            r = p.constructor;
        }


        return target;
    };
}


export function ServerMethod2() {
    return (target: any, key: string, descriptor: any) => {


        let x = classHelpers.get(target.constructor);
        if (!x) {
            x = new ClassHelper();
            classHelpers.set(target.constructor, x);
        }
        let mh = new MethodHelper();
        methodHelpers.set(descriptor, mh);
        x.methods.push(mh);
        var originalMethod = descriptor.value;
        var types = Reflect.getMetadata("design:paramtypes", target, key);
        // if types are undefined - you've forgot to set: "emitDecoratorMetadata":true

        let serverAction = {
            dataProvider: undefined as DataProviderFactoryBuilder,
            __register(reg: (url: string, what: ((data: any, req: DataApiRequest, res: DataApiResponse) => void)) => void) {

                let c = new ServerContext();
                for (const constructor of mh.classes.keys()) {
                    let options = mh.classes.get(constructor);
                    let y = new constructor(c);
                    reg(options.key + '/' + key, async (d: serverMethodInArgs, req, res) => {

                        try {
                            let context = new ServerContext();
                            context.setReq(req);
                            let ds = serverAction.dataProvider(context);
                            let r: serverMethodOutArgs;
                            await ds.transaction(async ds => {
                                context.setDataProvider(ds);
                                let y: ControllerBase = new constructor(context, ds);
                                unpackColumns(y, d.columns);
                                if (!context.isAllowed(options.allowed))
                                    throw 'not allowed';
                                r = {
                                    result: await originalMethod.apply(y, d.args),
                                    columns: packColumns(y)
                                };
                            })
                            res.success(r);
                        }
                        catch (err) {
                            res.error(err);
                        }

                    });
                }


            }
        };

        descriptor.value = async function (...args: any[]) {

            if (!actionInfo.runningOnServer) {
                let self: ControllerBase = this;


                let r = await (new class extends Action<serverMethodInArgs, serverMethodOutArgs>{
                    async execute(a, b): Promise<serverMethodOutArgs> {
                        throw ('should get here');
                    }
                }('', mh.classes.get(this.constructor).key + "/" + key).run({ args, columns: packColumns(self) }));
                unpackColumns(self, r.columns);
                return r.result;
            }
            else
                return (await originalMethod.apply(this, args));
        }
        actionInfo.allActions.push(descriptor.value);
        descriptor.value[serverActionField] = serverAction;


        return descriptor;
    }
}
class ClassHelper {
    methods: MethodHelper[] = [];
}
class MethodHelper {
    classes = new Map<any, ControllerOptions>();
}
export function controllerColumns(controller: any) {
    let __columns: Column[] = controller.__columns;;
    if (!__columns) {

        __columns = [];
        controller.__columns = __columns;
        for (const key in controller) {
            if (Object.prototype.hasOwnProperty.call(controller, key)) {
                const element = controller[key];
                if (element instanceof Column) {
                    if (!element.defs.key)
                        element.defs.key = key;
                    __columns.push(element);
                }

            }
        }
    }
    return __columns;
}
export function controllerAllowed(controller: any, context: Context) {
    let x = classOptions.get(controller.constructor);
    if (x)
        return context.isAllowed(x.allowed);
    return undefined;
}
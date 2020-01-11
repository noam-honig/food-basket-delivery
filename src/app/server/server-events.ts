import { Express, Response } from 'express';
import { ServerEventAuthorizeAction } from './server-event-authorize-action';
import { Context, ServerContext } from '@remult/core';
import { ExpressRequestBridgeToDataApiRequest } from '@remult/server';
import { Sites } from '../sites/sites';




let tempConnections: any = {};
ServerEventAuthorizeAction.authorize = key => {
    let x = tempConnections[key];
    if (x)
        x();
};

export class ServerEvents {
    sites = new Map<string, Response[]>();

    constructor(private app: Express) {
       
    }
    registerPath(path:string){
        let p = path+'/stream';
        console.log(p);
        this.app.get(p, (req, res) => {
            //@ts-ignore
            let r = new ExpressRequestBridgeToDataApiRequest(req);
            let context = new ServerContext();
            context.setReq(r);
            let org = Sites.getOrganizationFromContext(context);
            res.writeHead(200, {
                "Access-Control-Allow-Origin": req.header('origin') ? req.header('origin') : '',
                "Access-Control-Allow-Credentials": "true",
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            let key = new Date().toISOString();

            tempConnections[key] = () => {
                let x = this.sites.get(org);
                if (!x) {
                    x = [];
                    this.sites.set(org, x);
                }
                x.push(res);
                tempConnections[key] = undefined;

            };
            res.write("event:authenticate\ndata:" + key + "\n\n");

            req.on("close", () => {
                tempConnections[key] = undefined;
                let x = this.sites.get(org);
                if (x) {
                    let i = x.indexOf(res);
                    if (i >= 0)
                        x.splice(i, 1);
                }
            });

        });
    }
    SendMessage = (x: string, context: Context) => {
        setTimeout(() => {
            let org = Sites.getOrganizationFromContext(context);
            let y = this.sites.get(org);
            if (y)
                y.forEach(y => y.write("data:" + x + "\n\n"));
        }, 250);

    }
}
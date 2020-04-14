import { Express, Response } from 'express';
import { ServerEventAuthorizeAction } from './server-event-authorize-action';
import { Context, ServerContext } from '@remult/core';
import { ExpressRequestBridgeToDataApiRequest } from '@remult/server';
import { Sites } from '../sites/sites';
import { HelperUserInfo } from '../helpers/helpers';
import { Roles } from '../auth/roles';




let tempConnections: any = {};
ServerEventAuthorizeAction.authorize = (key, context) => {
    let x = tempConnections[key];
    if (x)
        x(context);
};
class userInSite {
    write(distributionCenter: string, message: string): void {
        if (this.canSeeAllDistCenters||this.distCenter==distributionCenter)
            this.response.write(message);
    }

    constructor(private distCenter: string,
        public response: Response,
        private canSeeAllDistCenters: boolean) {

    }
}

export class ServerEvents {
    sites = new Map<string, userInSite[]>();

    constructor(private app: Express) {

    }
    registerPath(path: string) {
        let p = path + '/stream';
        console.log(p);
        this.app.get(p, (req, res) => {
            //@ts-ignore
            let r = new ExpressRequestBridgeToDataApiRequest(req);
            let context = new ServerContext();
            if (context.isAllowed(Roles.distCenterAdmin))
                throw  "not allowed";
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

            tempConnections[key] = (context: Context) => {
                let x = this.sites.get(org);
                if (!x) {
                    x = [];
                    this.sites.set(org, x);
                }
                x.push(new userInSite((<HelperUserInfo>context.user).distributionCenter, res,context.isAllowed(Roles.admin)));
                tempConnections[key] = undefined;

            };
            res.write("event:authenticate\ndata:" + key + "\n\n");

            req.on("close", () => {
                tempConnections[key] = undefined;
                let x = this.sites.get(org);
                if (x) {
                    let i = x.findIndex(x=>x.response== res);
                    if (i >= 0)
                        x.splice(i, 1);
                }
            });

        });
    }
    SendMessage = (x: string, context: Context,distributionCenter:string) => {
        setTimeout(() => {
            let org = Sites.getOrganizationFromContext(context);
            let y = this.sites.get(org);
            if (y)
                y.forEach(y => y.write(distributionCenter, "data:" + x + "\n\n"));
        }, 250);

    }
}
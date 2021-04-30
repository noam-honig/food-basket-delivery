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
    close() {
        this.closed = true;
    }
    closed = false;
    write(distributionCenter: string, message: string): void {
        if (this.canSeeAllDistCenters || this.distCenter == distributionCenter)
            this.response.write(message);
    }

    constructor(private distCenter: string,
        public response: Response,
        private canSeeAllDistCenters: boolean) {
            this.sendLiveMessage();

    }
    sendLiveMessage() {
        setTimeout(() => {
            if (this.closed)
                return;
            this.response.write("event:keep-alive\ndata:\n\n");
            this.sendLiveMessage();
        }, 45000);
    }
}

export class ServerEvents {
    sites = new Map<string, userInSite[]>();

    constructor(private app: Express) {
        this.app.get('/*/api/stream', (req, res) => {
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

            tempConnections[key] = (context: Context) => {
                let x = this.sites.get(org);
                if (!x) {
                    x = [];
                    this.sites.set(org, x);
                }
                x.push(new userInSite((<HelperUserInfo>context.user).distributionCenter, res, context.isAllowed(Roles.admin)));
                tempConnections[key] = undefined;

            };
            res.write("event:authenticate\ndata:" + key + "\n\n");

            req.on("close", () => {
                tempConnections[key] = undefined;
                let x = this.sites.get(org);
                if (x) {
                    let item = x.find(x => x.response == res);
                    let i = x.findIndex(x => x.response == res);
                    if (i >= 0) {
                        x.splice(i, 1);
                        item.close();
                    }
                }
            });
        });
    }

    SendMessage(x: string, context: Context, distributionCenter: string) {
        let z = this;
        setTimeout(() => {
            let org = Sites.getOrganizationFromContext(context);
            let y = z.sites.get(org);
            if (y)
                y.forEach(y => y.write(distributionCenter, "data:" + x + "\n\n"));
        }, 250);

    }
}
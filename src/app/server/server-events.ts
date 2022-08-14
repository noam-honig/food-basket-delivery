import { Express, Response } from 'express';
import { ServerEventAuthorizeAction } from './server-event-authorize-action';
import { Remult } from 'remult';

import { Sites } from '../sites/sites';
import { Roles } from '../auth/roles';




let tempConnections: any = {};
ServerEventAuthorizeAction.authorize = (key, remult) => {
    let x = tempConnections[key];
    if (x)
        x(remult);
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

    constructor(private app: Express, getRemult: (req:any) => Remult) {
        this.app.get('/*/api/stream', async (req, res) => {

            let remult = await getRemult(req);
            let org = Sites.getOrganizationFromContext(remult);
            res.writeHead(200, {
                "Access-Control-Allow-Origin": req.header('origin') ? req.header('origin') : '',
                "Access-Control-Allow-Credentials": "true",
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            let key = new Date().toISOString();

            tempConnections[key] = (remult: Remult) => {
                let x = this.sites.get(org);
                if (!x) {
                    x = [];
                    this.sites.set(org, x);
                }
                x.push(new userInSite((remult.user).distributionCenter, res, remult.isAllowed(Roles.admin)));
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

    SendMessage(x: string, remult: Remult, distributionCenter: string) {
        let z = this;
        setTimeout(() => {
            let org = Sites.getOrganizationFromContext(remult);
            let y = z.sites.get(org);
            if (y)
                y.forEach(y => y.write(distributionCenter, "data:" + x + "\n\n"));
        }, 250);

    }
}
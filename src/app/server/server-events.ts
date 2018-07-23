import { Express, Response } from 'express';
import { ServerEventAuthorizeAction } from './server-event-authorize-action';



let tempConnections: any = {};
ServerEventAuthorizeAction.authorize = key => {
    let x = tempConnections[key];
    if (x)
        x();
};

export class ServerEvents {
    connection: Response[] = [];
    constructor(app: Express) {
        app.get('/stream', (req, res) => {

            res.writeHead(200, {
                "Access-Control-Allow-Origin": req.header('origin') ? req.header('origin') : '',
                "Access-Control-Allow-Credentials": "true",
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            });
            let key = new Date().toISOString();

            tempConnections[key] = () => {
                this.connection.push(res);
                tempConnections[key] = undefined;
                
            };
            res.write("event:authenticate\ndata:" + key + "\n\n");
            
            req.on("close", () => {
                tempConnections[key] = undefined;
                let i = this.connection.indexOf(res);
                if (i >= 0)
                    this.connection.splice(i, 1);
            });

        });
    }
    SendMessage = (x: string) => {
        this.connection.forEach(y => y.write("data:" + x + "\n\n"));
    }
}
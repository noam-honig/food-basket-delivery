import * as models from '../models';
import * as ApplicationImages from "../ApplicationImages";
import * as express from 'express';
import * as secure from 'express-force-https';
import * as compression from 'compression';
import { ExpressBridge } from 'radweb/server';
import { DataApi, DataApiSettings } from 'radweb/utils/server/DataApi';
import * as fs from 'fs';

import { LoginAction } from '../auth/loginAction';
import { myAuthInfo } from '../auth/my-auth-info';
import { evilStatics } from '../auth/evil-statics';
import { ResetPasswordAction } from '../helpers/reset-password';


import { AddBoxAction } from '../asign-family/add-box-action';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { LoginFromSmsAction } from '../login-from-sms/login-from-sms-action';
import { GetBasketStatusAction } from '../asign-family/get-basket-status-action';
import { serverInit } from './serverInit';
import { ServerEventAuthorizeAction } from './server-event-authorize-action';
import { ServerEvents } from './server-events';
import * as morgan from 'morgan';
import { SetDeliveryActiveAction } from '../delivery-events/set-delivery-active-action';
import { CopyFamiliesToActiveEventAction } from '../delivery-events/copy-families-to-active-event-action';
import { StatsAction } from '../families/stats-action';
import { DeliveryStatsAction } from '../delivery-follow-up/delivery-stats';
import {  Helpers } from '../helpers/helpers';
import { Families } from '../families/families';
import { NewsUpdate } from "../news/NewsUpdate";
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";


serverInit().then(() => {


    let app = express();
    //app.use(morgan('tiny')); 'logging';
    if (!process.env.DISABLE_SERVER_EVENTS) {
        let serverEvents = new ServerEvents(app);
        Families.SendMessageToBrowsers = x => serverEvents.SendMessage(x);
        SetDeliveryActiveAction.SendMessageToBrowsers = x => serverEvents.SendMessage(x);
    }


    app.use(compression());

    if (!process.env.DISABLE_HTTPS)
        app.use(secure);
    let port = process.env.PORT || 3000;

    let eb = new ExpressBridge<myAuthInfo>(app);

    let openedData = eb.addArea('/openedDataApi');
    let dataApi = eb.addArea('/dataApi', async x => x.authInfo != undefined);
    let adminApi = eb.addArea('/dataApi', async x => x.authInfo && x.authInfo.admin);
    let openActions = eb.addArea('');
    let adminActions = eb.addArea('', async x => x.authInfo && x.authInfo.admin);

    evilStatics.auth.tokenSignKey = process.env.TOKEN_SIGN_KEY;

    evilStatics.auth.applyTo(eb, openActions);

    openActions.addAction(new LoginAction());
    openActions.addAction(new LoginFromSmsAction());
    adminActions.addAction(new ResetPasswordAction());
    adminActions.addAction(new AddBoxAction());
    adminActions.addAction(new SendSmsAction());
    adminActions.addAction(new GetBasketStatusAction());
    adminActions.addAction(new ServerEventAuthorizeAction());
    adminActions.addAction(new SetDeliveryActiveAction());
    adminActions.addAction(new CopyFamiliesToActiveEventAction());
    adminActions.addAction(new StatsAction());
    adminActions.addAction(new DeliveryStatsAction());



    openedData.add(r => new Helpers().helpersDataApi(r));
    dataApi.add(r => new DataApi(new NewsUpdate()));

    [
        new BasketType(),
        new FamilySources()
    ].forEach(x => {
        dataApi.add(r => new DataApi(x, {
            allowDelete: r.authInfo && r.authInfo.admin,
            allowInsert: r.authInfo && r.authInfo.admin,
            allowUpdate: r.authInfo && r.authInfo.admin
        }));
    });
    dataApi.add(r => {
        var settings: DataApiSettings<Families> = {
            allowDelete: r.authInfo && r.authInfo.admin,
            allowInsert: r.authInfo && r.authInfo.admin,
            allowUpdate: r.authInfo ? true : false,
            readonlyColumns: f => {
                if (r.authInfo) {
                    if (r.authInfo.admin)
                        return [];
                    return f.__iterateColumns().filter(c => c != f.courierComments && c != f.deliverStatus);
                }
            },
            excludeColumns: f => {
                return f.excludeColumns(r.authInfo);
            },
            onSavingRow: async family => {
                await family.doSaveStuff(r.authInfo);
            },
            get: {
                where: f => {
                    if (r.authInfo && !r.authInfo.admin)
                        return f.courier.isEqualTo(r.authInfo.helperId);
                    return undefined;
                }
            }
        };


        return new DataApi(new Families(), settings)
    });
    adminApi.add(r => {
        return new DataApi(new models.HelpersAndStats(), {
            
        });
    });
    openedData.add(r => {
        return new DataApi(new models.ApplicationSettings(), {
            allowUpdate: r.authInfo&&r.authInfo.admin,
            onSavingRow: async as => await as.doSaveStuff()
        });
    });
    adminApi.add(r => {
        return new DataApi(new ApplicationImages.ApplicationImages(), {
            allowUpdate: true,
        });
    });
    adminApi.add(r => {
        return new DataApi(new models.FamilyDeliveryEventsView(), {});
    });
    adminApi.add(r => new DataApi(new models.DeliveryEvents(), {
        readonlyColumns: de => [de.isActiveEvent],
        onSavingRow: async de => await de.doSaveStuff(r.authInfo),
        allowUpdate: true,
        allowInsert: true
    }));



    app.get('/cache.manifest', (req, res) => {
        let result =
            `CACHE MANIFEST
    CACHE:
    /
    /home
    `;
        fs.readdirSync('dist').forEach(x => {
            result += `/${x}
        `;

        });
        result += `
    FALLBACK:
    / /
    
    NETWORK:
    /dataApi/`

        res.send(result);
    });
    app.use('/assets/apple-touch-icon.png', async (req, res) => {
        let imageBase = (await ApplicationImages.ApplicationImages.getAsync()).base64PhoneHomeImage.value;
        res.contentType('png');
        if (imageBase) {
            try {
                res.send(Buffer.from(imageBase, 'base64'));
                return;
            }
            catch{
            }
        }
        try {
            res.send(fs.readFileSync('dist/assets/apple-touch-icon.png'));
        } catch (err) {
            res.statusCode = 404;
            res.send(err);
        }
    });
    app.use('/favicon.ico', async (req, res) => {
        res.contentType('ico');
        let imageBase = (await ApplicationImages.ApplicationImages.getAsync()).base64Icon.value;
        if (imageBase) {
            try {
                res.send(Buffer.from(imageBase, 'base64'));
                return;
            }
            catch{ }
        }
        try {
            res.send(fs.readFileSync('dist/favicon.ico'));
        }
        catch (err) {
            res.statusCode = 404;
            res.send(err);
        }
    });
    async function sendIndex(res: express.Response) {
        const index = 'dist/index.html';
        if (fs.existsSync(index)) {
            let x = (await models.ApplicationSettings.getAsync()).organisationName.value;

            res.send(fs.readFileSync(index).toString().replace('!TITLE!', x));
        }
        else
            res.send('No Result');
    }

    app.get('', (req, res) => {

        sendIndex(res);
    });
    app.get('/index.html', (req, res) => {

        sendIndex(res);
    });
    app.use(express.static('dist'));

    app.use('/*', async (req, res) => {
        if (req.method == 'OPTIONS')
            res.send('');
        else {
            await sendIndex(res);
        }
    });
    app.listen(port);
});
//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb/projects');
import * as ApplicationImages from "../manage/ApplicationImages";
import * as express from 'express';
import { ExpressBridge, JWTCookieAuthorizationHelper, ExpressRequestBridgeToDataApiRequest, registerEntitiesOnServer, registerActionsOnServer } from '@remult/server';
import * as fs from 'fs';
import { serverInit } from './serverInit';
import { ServerEvents } from './server-events';

import { ApplicationSettings } from '../manage/ApplicationSettings';
import "../helpers/helpers.component";
import '../app.module';
import { ServerContext, DateColumn, SqlDatabase } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import { Sites } from '../sites/sites';
import { dataMigration } from "./dataMigration";
import { GeoCodeOptions } from "../shared/googleApiHelpers";
import { Families } from "../families/families";
import { OverviewComponent } from "../overview/overview.component";
import { environment } from "../../environments/environment";
import * as request from 'request';
import { setLangForSite } from "../translate";


serverInit().then(async (dataSource) => {


    let app = express();
    function getContext(req: express.Request, sendDs?: (ds: SqlDatabase) => void) {
        //@ts-ignore
        let r = new ExpressRequestBridgeToDataApiRequest(req);
        let context = new ServerContext();
        context.setReq(r);
        let ds = dataSource(context);
        context.setDataProvider(ds);
        if (sendDs)
            sendDs(ds);
        return context;
    }
    let redirect: string[] = [];
    {
        let x = process.env.REDIRECT;
        if (x)
            redirect = x.split(',');
    }

    async function sendIndex(res: express.Response, req: express.Request) {
        let context = getContext(req);
        let org = Sites.getOrganizationFromContext(context);
        if (redirect.includes(org)) {
            res.redirect('https://salmaz.herokuapp.com/' + org);
            return;
        }
        if (!Sites.isValidOrganization(org)) {
            res.redirect('/' + Sites.guestSchema + '/');
            return;
        }
        const index = 'dist/index.html';

        if (fs.existsSync(index)) {
            let x = '';
            let settings = (await ApplicationSettings.getAsync(context));
            setLangForSite(Sites.getValidSchemaFromContext(context), settings.forWho.value);
            x = settings.organisationName.value;
            let result = fs.readFileSync(index).toString().replace(/!TITLE!/g, x).replace("/*!SITE!*/", "multiSite=" + Sites.multipleSites);
            let key = process.env.GOOGLE_MAP_JAVASCRIPT_KEY;
            if (!key)
                key = 'AIzaSyDbGtO6VwaRqGoduRaGjSAB15mZPiPt9mM'//default key to use only for development
            result = result.replace(/GOOGLE_MAP_JAVASCRIPT_KEY/g, key);
            if (settings.forWho.value.args.leftToRight) {
                result = result.replace(/<body dir="rtl">/g, '<body dir="ltr">');
            }
            if (settings.forWho.value.args.languageCode) {
                let lang = settings.forWho.value.args.languageCode;
                result = result.replace(/&language=iw&/, `&language=${lang}&`)
                    .replace(/טוען/g, 'Loading');
            }
            if (settings.forWho.value.args.languageFile) {
                let lang = settings.forWho.value.args.languageFile;
                result = result.replace(/document.lang = '';/g, `document.lang = '${lang}';`);

            }
            if (Sites.multipleSites) {
                result = result.replace('"favicon.ico', '"/' + org + '/favicon.ico')
                    .replace('"/assets/apple-touch-icon.png"', '"/' + org + '/assets/apple-touch-icon.png"');
            }
            res.send(result);
        }
        else {
            res.send('No Result' + fs.realpathSync(index));
        }
    }
    if (process.env.DISABLE_GEOCODE) {
        console.log("geocode disabled");
        GeoCodeOptions.disableGeocode = true;
    }




    let addServerEvent = x => { };
    if (!process.env.DISABLE_SERVER_EVENTS) {
        let serverEvents = new ServerEvents(app);
        addServerEvent = async (s) => serverEvents.registerPath('/' + s + '/api');;
        if (Sites.multipleSites) {
            for (const s of Sites.schemas) {
                addServerEvent(s);
            }
        }
        else {
            serverEvents.registerPath('/api');
        }

        let lastMessage = new Date();
        Families.SendMessageToBrowsers = (x, c, distCenter) => {
            if (new Date().valueOf() - lastMessage.valueOf() > 1000) {
                lastMessage = new Date();
                serverEvents.SendMessage(x, c, distCenter)
            }
        };
    }
    app.get('/data-migration', async (req, res) => {
        await dataMigration(res);
    });

    let eb = new ExpressBridge(
        //@ts-ignore
        app,
        dataSource, process.env.DISABLE_HTTPS == "true", !Sites.multipleSites);
    if (process.env.logUrls != "true")
        eb.logApiEndPoints = false;
    Helpers.helper = new JWTCookieAuthorizationHelper(eb, process.env.TOKEN_SIGN_KEY);


    if (Sites.multipleSites) {
        let createSchemaApi = async schema => {
            let area = eb.addArea('/' + schema + '/api', async req => {
                if (req.user) {
                    let context = new ServerContext();
                    context.setReq(req);
                    if (!context.isAllowed(Sites.getOrgRole(context)))
                        req.user = undefined;
                }
            });
            registerActionsOnServer(area, dataSource);
            registerEntitiesOnServer(area, dataSource);
            registerImageUrls(app, getContext, '/' + schema);
        };
        for (const schema of Sites.schemas) {
            createSchemaApi(schema);
        }
        OverviewComponent.createSchemaApi = async schema => {
            let stack: [] = app._router.stack;
            stack.splice(stack.length - 1, 1);
            addServerEvent(schema);
            createSchemaApi(schema);
            app.use('/*', async (req, res) => {
                await sendIndex(res, req);
            });

        };
        {
            let area = eb.addArea('/' + Sites.guestSchema + '/api', async req => {
                if (req.user) {
                    let context = new ServerContext();
                    context.setReq(req);
                    if (!context.isAllowed(Sites.getOrgRole(context)))
                        req.user = undefined;
                }
            });
            registerActionsOnServer(area, dataSource);
            registerEntitiesOnServer(area, dataSource);
        }
    }
    else {
        registerImageUrls(app, getContext, '');
    }



    app.get('', (req, res) => {

        sendIndex(res, req);
    });

    app.get('/index.html', (req, res) => {

        sendIndex(res, req);
    });
    app.use(express.static('dist'));

    app.use('/*', async (req, res) => {
        await sendIndex(res, req);
    });

    let port = process.env.PORT || 3000;
    app.listen(port);
});

export interface monitorResult {
    totalFamilies: number;
    name: string;
    familiesInEvent: number;
    dbConnections: number;
    deliveries: number;
    onTheWay: number;
    helpers: number;
}

function registerImageUrls(app, getContext: (req: express.Request, sendDs?: (ds: SqlDatabase) => void) => ServerContext, sitePrefix: string) {
    app.use(sitePrefix + '/assets/apple-touch-icon.png', async (req, res) => {
        try {
            let context = getContext(req);
            let imageBase = (await ApplicationImages.ApplicationImages.getAsync(context)).base64PhoneHomeImage.value;
            res.contentType('png');
            if (imageBase) {
                res.send(Buffer.from(imageBase, 'base64'));
                return;
            }
        }
        catch (err) {
        }
        try {
            res.send(fs.readFileSync('dist/assets/apple-touch-icon.png'));
        }
        catch (err) {
            res.statusCode = 404;
            res.send(err);
        }
    });
    app.use('/guest/favicon.ico', async (req, res) => {
        try {
            res.send(fs.readFileSync('dist/favicon.ico'));
        }
        catch{
            res.send(fs.readFileSync('assets/favicon.ico'));
        }
    })
    app.use(sitePrefix + '/favicon.ico', async (req, res) => {
        try {
            let context = getContext(req);
            res.contentType('ico');
            let imageBase = (await ApplicationImages.ApplicationImages.getAsync(context)).base64Icon.value;
            if (imageBase) {
                res.send(Buffer.from(imageBase, 'base64'));
                return;
            }
        }
        catch (err) { }
        try {
            res.send(fs.readFileSync('dist/favicon.ico'));
        }
        catch (err) {
            res.statusCode = 404;
            res.send(err);
        }
    });
}


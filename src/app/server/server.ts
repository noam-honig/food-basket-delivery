import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
let moduleLoader = new CustomModuleLoader('/dist-server/radweb/projects');
import * as ApplicationImages from "../manage/ApplicationImages";
import * as express from 'express';
import { ExpressBridge, registerEntitiesOnServer, registerActionsOnServer, initExpress } from '@remult/core/server';
import * as fs from 'fs';//
import { serverInit } from './serverInit';
import { ServerEvents } from './server-events';

import { ApplicationSettings, setSettingsForSite } from '../manage/ApplicationSettings';
import "../helpers/helpers.component";
import '../app.module';
import { ServerContext, SqlDatabase } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import { Sites, setLangForSite } from '../sites/sites';

import { GeoCodeOptions } from "../shared/googleApiHelpers";
import { Families } from "../families/families";
import { OverviewComponent } from "../overview/overview.component";
import { preparePostgresQueueStorage } from "../../../../radweb/projects/core/postgres";
import * as forceHttps from 'express-force-https';
import * as jwt from 'express-jwt';
import * as compression from 'compression';
import { AuthService } from '../auth/auth-service';



serverInit().then(async (dataSource) => {


    let app = express();
    app.use(jwt({ secret: process.env.TOKEN_SIGN_KEY, credentialsRequired: false, algorithms: ['HS256'] }));
    app.use(compression());
    if (!process.env.DEV_MODE)
        app.use(forceHttps);

    let redirect: string[] = [];
    {
        let x = process.env.REDIRECT;
        if (x && process.env.REDIRECT_TARGET)
            redirect = x.split(',');
    }

    async function sendIndex(res: express.Response, req: express.Request) {
        let context = await eb.getValidContext(req);
        let org = Sites.getOrganizationFromContext(context);
        if (redirect.includes(org)) {
            res.redirect(process.env.REDIRECT_TARGET + org);
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
            setLangForSite(Sites.getValidSchemaFromContext(context), settings.forWho);
            setSettingsForSite(Sites.getValidSchemaFromContext(context), settings);
            x = settings.organisationName;
            let result = fs.readFileSync(index).toString().replace(/!TITLE!/g, x).replace("/*!SITE!*/", "multiSite=" + Sites.multipleSites);
            let key = process.env.GOOGLE_MAP_JAVASCRIPT_KEY;
            if (!key)
                key = 'AIzaSyDbGtO6VwaRqGoduRaGjSAB15mZPiPt9mM'//default key to use only for development
            result = result.replace(/GOOGLE_MAP_JAVASCRIPT_KEY/g, key);

            let tagid = 'UA-121891791-1'; // default key for Google Analytics
            if (settings.isSytemForMlt()) {
                //tagid = 'AW-452581833';
                result = result.replace('/*ANOTHER_GTAG_CONFIG*/', "gtag('config', 'AW-452581833');gtag('config', 'UA-174556479-1');");
                result = result.replace(/<!--FACEBOOK_AND_LINKEDIN_PLACEHOLDER-->/g, `
<!-- Facebook Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '432475371126727');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=432475371126727&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel Code -->

    
<script type="text/javascript">
_linkedin_partner_id = "2525417";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script><script type="text/javascript">
(function(){var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})();
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=2525417&fmt=gif" />
</noscript>
                `);
            }
            result = result.replace(/GOOGLE_PIXEL_TAG_ID/g, tagid);


            if (settings.forWho.args.leftToRight) {
                result = result.replace(/<body dir="rtl">/g, '<body dir="ltr">');
            }
            if (settings.forWho.args.languageCode) {
                let lang = settings.forWho.args.languageCode;
                result = result.replace(/&language=iw&/, `&language=${lang}&`)
                    .replace(/טוען/g, 'Loading');
            }
            if (settings.forWho.args.languageFile) {
                let lang = settings.forWho.args.languageFile;
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





    if (!process.env.DISABLE_SERVER_EVENTS) {
        let serverEvents = new ServerEvents(app, () => eb);


        let lastMessage = new Date();
        Families.SendMessageToBrowsers = (x, c, distCenter) => {
            if (new Date().valueOf() - lastMessage.valueOf() > 1000) {
                lastMessage = new Date();
                serverEvents.SendMessage(x, c, distCenter)
            }
        };
    }


    let eb = initExpress(
        app,
        {
            initRequest: async c => {
                await AuthService.initContext(c)
            },
            dataProvider: dataSource,
            disableAutoApi: Sites.multipleSites,
            queueStorage: await preparePostgresQueueStorage(dataSource(new ServerContext()))
        });
    if (process.env.logUrls != "true")
        eb.logApiEndPoints = false;



    if (Sites.multipleSites) {
        let createSchemaApi = async schema => {
            let area = eb.addArea('/' + schema + '/api', req => {
                if (req.user) {
                    let context = new ServerContext();
                    context.setReq(req);
                    if (context.isAllowed(Sites.getOrgRole(context)))
                        return true;
                }
                return false;
            });
            registerActionsOnServer(area);
            registerEntitiesOnServer(area);
            registerImageUrls(app, eb.getValidContext, '/' + schema);
        };
        for (const schema of Sites.schemas) {
            createSchemaApi(schema);
        }
        OverviewComponent.createSchemaApi = async schema => {
            let stack: [] = app._router.stack;
            stack.splice(stack.length - 1, 1);

            createSchemaApi(schema);
            app.use('/*', async (req, res) => {
                await sendIndex(res, req);
            });

        };
        {
            let area = eb.addArea('/' + Sites.guestSchema + '/api', req => {
                if (req.user) {
                    let context = new ServerContext();
                    context.setReq(req);
                    if (context.isAllowed(Sites.getOrgRole(context)))
                        return true;


                }
                return false;
            });
            registerActionsOnServer(area);
            registerEntitiesOnServer(area);
        }
    }
    else {
        registerImageUrls(app, eb.getValidContext, '');
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

function registerImageUrls(app, getContext: (req: express.Request) => Promise<ServerContext>, sitePrefix: string) {
    app.use(sitePrefix + '/assets/apple-touch-icon.png', async (req, res) => {
        try {
            let context = await getContext(req);
            let imageBase = (await ApplicationImages.ApplicationImages.getAsync(context)).base64PhoneHomeImage;
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
        catch {
            res.send(fs.readFileSync('assets/favicon.ico'));
        }
    })
    app.use(sitePrefix + '/favicon.ico', async (req, res) => {
        try {
            let context = await getContext(req);
            res.contentType('ico');
            let imageBase = (await ApplicationImages.ApplicationImages.getAsync(context)).base64Icon;
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





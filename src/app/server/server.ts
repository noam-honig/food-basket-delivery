import * as ApplicationImages from "../manage/ApplicationImages";
import * as express from 'express';
import * as secure from 'express-force-https';
import * as compression from 'compression';
import { ExpressBridge } from 'radweb-server';
import { DataApi } from 'radweb';
import * as fs from 'fs';
import { myAuthInfo } from '../auth/my-auth-info';
import { evilStatics } from '../auth/evil-statics';
import { serverInit } from './serverInit';
import { ServerEvents } from './server-events';
import { Families } from '../families/families';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { serverActionField, myServerAction, actionInfo } from "../auth/server-action";
import { SiteArea } from "radweb-server";
import "../helpers/helpers.component";
import '../app.module';
import { ContextEntity, ServerContext, allEntities } from "../shared/context";
import * as jwt from 'jsonwebtoken';
import * as passwordHash from 'password-hash';

serverInit().then(async () => {


    let app = express();
    if (!process.env.DISABLE_SERVER_EVENTS) {
        let serverEvents = new ServerEvents(app);
        Families.SendMessageToBrowsers = x => serverEvents.SendMessage(x);
    }


    app.use(compression());

    if (!process.env.DISABLE_HTTPS)
        app.use(secure);
    let port = process.env.PORT || 3000;

    let eb = new ExpressBridge<myAuthInfo>(app);

    let allUsersAlsoNotLoggedIn = eb.addArea('/api');

    evilStatics.auth.tokenSignKey = process.env.TOKEN_SIGN_KEY;

    var addAction = (area: SiteArea<myAuthInfo>, a: any) => {
        let x = <myServerAction>a[serverActionField];
        if (!x) {
            throw 'failed to set server action, did you forget the RunOnServerDecorator?';
        }
        area.addAction(x);
    };


    actionInfo.runningOnServer = true;
    evilStatics.auth.applyTo(eb, allUsersAlsoNotLoggedIn, {
        verify: (t, k) => jwt.verify(t, k),
        sign: (i, k) => jwt.sign(i, k),
        decode: t => jwt.decode(t)
    });
    evilStatics.passwordHelper = {
        generateHash: p => passwordHash.generate(p),
        verify: (p, h) => passwordHash.verify(p, h)
    }

    actionInfo.allActions.forEach(a => {
        addAction(allUsersAlsoNotLoggedIn, a);
    });

    //add Api Entries
    allEntities.forEach(e => {
        let x = new ServerContext().for(e).create();
        if (x instanceof ContextEntity) {
            let j = x;
            allUsersAlsoNotLoggedIn.add(r => {
                let c = new ServerContext();
                c.setReq(r);
                return new DataApi(c.create(e), j._getEntityApiSettings(c));
            });
        }
    });




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

        let imageBase = (await ApplicationImages.ApplicationImages.getAsync(new ServerContext())).base64PhoneHomeImage.value;
        res.contentType('png');
        if (imageBase) {
            try {
                res.send(Buffer.from(imageBase, 'base64'));
                return;
            }
            catch (err) {
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
        let imageBase = (await ApplicationImages.ApplicationImages.getAsync(new ServerContext())).base64Icon.value;
        if (imageBase) {
            try {
                res.send(Buffer.from(imageBase, 'base64'));
                return;
            }
            catch (err) { }
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
            let x = (await ApplicationSettings.getAsync(new ServerContext())).organisationName.value;

            res.send(fs.readFileSync(index).toString().replace('!TITLE!', x));
        }
        else {
            res.send('No Result' + fs.realpathSync(index));
        }
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
//import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
//let moduleLoader = new CustomModuleLoader('/dist-server/radweb');
import * as ApplicationImages from "../manage/ApplicationImages";
import * as express from 'express';
import { ExpressBridge, JWTCookieAuthorizationHelper } from 'radweb-server';
import * as fs from 'fs';
import { serverInit } from './serverInit';
import { ServerEvents } from './server-events';
import { Families } from '../families/families';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import "../helpers/helpers.component";
import '../app.module';
import { ServerContext } from "radweb";
import { AuthService } from "../auth/auth-service";
import { Helpers } from '../helpers/helpers';

serverInit().then(async (dataSource) => {


    let app = express();
    if (!process.env.DISABLE_SERVER_EVENTS) {
        let serverEvents = new ServerEvents(app);
        Families.SendMessageToBrowsers = x => serverEvents.SendMessage(x);
    }
    let eb = new ExpressBridge(app, dataSource, process.env.DISABLE_HTTPS == "true");
    Helpers.helper = new JWTCookieAuthorizationHelper(eb, process.env.TOKEN_SIGN_KEY);
    let serverContext = new ServerContext();
    serverContext.setDataProvider(dataSource);
    app.use('/assets/apple-touch-icon.png', async (req, res) => {

        let imageBase = (await ApplicationImages.ApplicationImages.getAsync(serverContext)).base64PhoneHomeImage.value;
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
        let imageBase = (await ApplicationImages.ApplicationImages.getAsync(serverContext)).base64Icon.value;
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
        await sendIndex(res);
    });
    let port = process.env.PORT || 3000;
    app.listen(port);
});
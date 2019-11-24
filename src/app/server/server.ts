import { CustomModuleLoader } from '../../../../radweb/src/app/server/CustomModuleLoader';
let moduleLoader = new CustomModuleLoader('/dist-server/radweb');
import * as ApplicationImages from "../manage/ApplicationImages";
import * as express from 'express';
import { ExpressBridge, JWTCookieAuthorizationHelper, ExpressRequestBridgeToDataApiRequest } from '@remult/server';
import * as fs from 'fs';
import { serverInit, validOrganization } from './serverInit';
import { ServerEvents } from './server-events';
import { Families } from '../families/families';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import "../helpers/helpers.component";
import '../app.module';
import { ServerContext, ActualDirectSQL, DateColumn } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import { FamilyDeliveriesStats } from "../delivery-history/delivery-history.component";
import { SqlBuilder } from "../model-shared/types";
import { getOrgRole } from '../auth/auth-service';
import { PostgresDataProvider } from '@remult/server-postgres';


serverInit().then(async (dataSource) => {


    let app = express();
    if (!process.env.DISABLE_SERVER_EVENTS) {
        let serverEvents = new ServerEvents(app);
        Families.SendMessageToBrowsers = x => serverEvents.SendMessage(x);
    }

    let eb = new ExpressBridge(
        //@ts-ignore
        app,
        dataSource, process.env.DISABLE_HTTPS == "true");
    Helpers.helper = new JWTCookieAuthorizationHelper(eb, process.env.TOKEN_SIGN_KEY);
    eb.addRequestProcessor(req => {
        if (req.user) {
            let context = new ServerContext();
            context.setReq(req);
            if (!context.isAllowed(getOrgRole(context)))
                req.user = undefined;
        }
    });
    function getContext(req: express.Request, sendDs?: (ds: PostgresDataProvider) => void) {
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

    app.use('/assets/apple-touch-icon.png', async (req, res) => {
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
        } catch (err) {
            res.statusCode = 404;
            res.send(err);
        }
    });
    app.use('/favicon.ico', async (req, res) => {
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
    async function sendIndex(res: express.Response, req: express.Request) {
        let context = getContext(req);
        const index = 'dist/index.html';

        if (fs.existsSync(index)) {
            let x = '';
            x = (await ApplicationSettings.getAsync(context)).organisationName.value;
            res.send(fs.readFileSync(index).toString().replace('!TITLE!', x));
        }
        else {
            res.send('No Result' + fs.realpathSync(index));
        }
    }
    app.get('/monitor-report', async (req, res) => {
        let auth = req.header('Authorization');
        if (auth != process.env.MONITOR_KEY) {
            res.sendStatus(404);
            return;
        }
        let ds: PostgresDataProvider;
        let context = getContext(req, x => ds = x);
        var dsql = ds.getDirectSql();
        var fromDate = DateColumn.stringToDate(req.query["fromdate"]);
        var toDate = DateColumn.stringToDate(req.query["todate"]);
        if (!fromDate)
            fromDate = new Date();
        if (!toDate)
            toDate = new Date();
        toDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() + 1);


        var connections = (await dsql.execute("SELECT count(*) as x FROM pg_stat_activity where datname=current_database()")).rows[0]['x'];

        var familiesInEvent = await context.for(Families).count(f => f.deliverStatus.isInEvent());
        var totalFamilies = await context.for(Families).count();
        var sql = new SqlBuilder();
        var deliveries = await context.for(FamilyDeliveriesStats).count(f => f.deliveryStatusDate.isGreaterOrEqualTo(fromDate).and(f.deliveryStatusDate.isLessThan(toDate)));
        var fds = new FamilyDeliveriesStats(context);
        var query = sql.build(
            'select count (distinct ',
            fds.courier,
            ' ) as x from ',
            fds.__getDbName(),
            ' where ',
            fds.deliveryStatusDate.isGreaterOrEqualTo(fromDate).and(fds.deliveryStatusDate.isLessThan(toDate)));


        var helpers = (await dsql.execute(query)).rows[0]['x'];
        await context.for(FamilyDeliveriesStats).count(f => f.deliveryStatusDate.isGreaterOrEqualTo(fromDate).and(f.deliveryStatusDate.isLessThan(toDate)));
        var onTheWay = await context.for(Families).count(f => f.onTheWayFilter());
        var settings = await ApplicationSettings.getAsync(context);

        let r: monitorResult = {
            totalFamilies,
            familiesInEvent,
            dbConnections: connections,
            deliveries,
            name: settings.organisationName.value,
            onTheWay,
            helpers

        };
        res.json(r);
    });

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


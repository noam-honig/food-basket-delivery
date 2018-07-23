import * as models from './../models';
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
import { helpersDataApi } from './helpers-dataapi';

import { AddBoxAction } from '../asign-family/add-box-action';
import { SendSmsAction } from '../asign-family/send-sms-action';
import { LoginFromSmsAction } from '../login-from-sms/login-from-sms-action';
import { GetBasketStatusAction } from '../asign-family/get-basket-status-action';
import { serverInit } from './serverInit';
import { ServerEventAuthorizeAction } from './server-event-authorize-action';
import { ServerEvents } from './server-events';
import * as morgan from 'morgan';

serverInit();


let app = express();
//app.use(morgan('tiny')); 'logging';
if (!process.env.DISABLE_SERVER_EVENTS) {
    let serverEvents = new ServerEvents(app);
    models.Families.SendMessageToBrowsers = x => serverEvents.SendMessage(x);
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
"";


openedData.add(r => helpersDataApi(r));
dataApi.add(r => new DataApi(new models.NewsUpdate()));

[
    new models.BasketType(),
    new models.FamilySources()
].forEach(x => {
    dataApi.add(r => new DataApi(x, {
        allowDelete: r.authInfo && r.authInfo.admin,
        allowInsert: r.authInfo && r.authInfo.admin,
        allowUpdate: r.authInfo && r.authInfo.admin
    }));
});
dataApi.add(r => {
    var settings: DataApiSettings<models.Families> = {
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
            if (r.authInfo && r.authInfo.admin)
                return [];
            return [f.internalComment, f.callComments, f.callHelper, f.callStatus, f.callTime, f.createDate, f.createUser, f.familySource, f.familyMembers, f.special];
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


    return new DataApi(new models.Families(), settings)
});
adminApi.add(r => {
    return new DataApi(new models.HelpersAndStats(), {
        excludeColumns: h => [h.isAdmin, h.password, h.realStoredPassword, h.shortUrlKey, h.createDate]
    });
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

app.use(express.static('dist'));

app.use('/*', (req, res) => {
    if (req.method == 'OPTIONS')
        res.send('');
    else {
        const index = 'dist/index.html';
        if (fs.existsSync(index))
            res.send(fs.readFileSync(index).toString());
        else
            res.send('No Result');
    }
});
app.listen(port);

import * as models from './../models';
import * as express from 'express';
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
import * as net from 'net';
import { Entity, Column } from 'radweb';

serverInit();


let app = express();
app.use(compression());
let port = process.env.PORT || 3000;



let eb = new ExpressBridge<myAuthInfo>(app);

let openedData = eb.addArea('/openedDataApi');
let dataApi = eb.addArea('/dataApi', async x => x.authInfo != undefined);
let openActions = eb.addArea('');
let adminActions = eb.addArea('', async x => x.authInfo && x.authInfo.admin);
evilStatics.auth.tokenSignKey = process.env.TOKEN_SIGN_KEY;
eb.addRequestProcessor(req => {
    var apikey = process.env.HOSTEDGRAPHITE_APIKEY;
    try {
        var socket = net.createConnection(2003, "carbon.hostedgraphite.com", function () {
            socket.write(apikey + ".request.count 1\n");
            socket.end();
        });
    } catch{ }
    return true;
});
evilStatics.auth.applyTo(eb, openActions);

openActions.addAction(new LoginAction());
openActions.addAction(new LoginFromSmsAction());
adminActions.addAction(new ResetPasswordAction());
adminActions.addAction(new AddBoxAction());
adminActions.addAction(new SendSmsAction());
adminActions.addAction(new GetBasketStatusAction());


openedData.add(r => helpersDataApi(r));

dataApi.add(r => {
    var settings: DataApiSettings<models.EventHelpers> = {
        allowDelete: r.authInfo && r.authInfo.admin,
        allowInsert: true,
        allowUpdate: true
    };

    if (!(r && r.authInfo && r.authInfo.admin)) {
        settings.get = {
            where: eh => eh.helperId.isEqualTo(r.authInfo.helperId)
        };
    }
    return new DataApi(new models.EventHelpers(), settings)
});

[
    new models.Events(),
    new models.Items(),
    new models.BasketType(),
    new models.FamilySources
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
                return f.__iterateColumns().filter(c => { c == f.courierComments, c == f.deliverStatus });
            }
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
dataApi.add(r => {
    return new DataApi(new models.HelpersAndStats(), {
        excludeColumns: h => [h.isAdmin, h.password, h.realStoredPassword, h.shortUrlKey, h.createDate]
    });
});


dataApi.add(r => new DataApi(new models.ItemsPerHelper(), {
    allowDelete: !r.authInfo || r.authInfo.admin,
    allowInsert: true,
    allowUpdate: true
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

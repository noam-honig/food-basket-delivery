import { environment } from './../../environments/environment';
import * as models from './../models';
import * as express from 'express';
import * as radweb from 'radweb';
import { SQLServerDataProvider, ExpressBridge, PostgresDataProvider } from 'radweb/server';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { DataApi, DataApiSettings } from 'radweb/utils/server/DataApi';
import * as path from 'path';
import * as fs from 'fs';
import { CompoundIdColumn } from 'radweb';
import { SchemaBuilder } from './schema-build';
import { LoginAction } from '../auth/loginAction';
import { myAuthInfo } from '../auth/my-auth-info';
import { evilStatics } from '../auth/evil-statics';
import { ResetPasswordAction } from '../helpers/reset-password';
import { helpersDataApi } from './helpers-dataapi';
import { FamiliesComponent } from '../families/families.component';
config();



let app = express();
let port = process.env.PORT || 3000;

let ssl = true;
if (process.env.DISABLE_POSTGRES_SSL)
    ssl = false;


if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: ssl
});
evilStatics.dataSource = new PostgresDataProvider(pool);
evilStatics.openedDataApi = new PostgresDataProvider(pool);

var sb = new SchemaBuilder(pool);
[
    new models.Events(),
    new models.EventHelpers(),
    new models.Helpers(),
    new models.Items(),
    new models.ItemsPerHelper(),
    new models.Families()
].forEach(x => sb.CreateIfNotExist(x));




let eb = new ExpressBridge<myAuthInfo>(app);

let openedData = eb.addArea('/openedDataApi');
let dataApi = eb.addArea('/dataApi', async x => x.authInfo != undefined);
let openActions = eb.addArea('');
let adminActions = eb.addArea('', async x => x.authInfo && x.authInfo.admin);
evilStatics.auth.tokenSignKey = process.env.TOKEN_SIGN_KEY;

evilStatics.auth.applyTo(eb, openActions);

openActions.addAction(new LoginAction());
adminActions.addAction(new ResetPasswordAction());

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
        allowUpdate: r.authInfo && r.authInfo.admin
    };

    
    return new DataApi(new models.Families(), settings)

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

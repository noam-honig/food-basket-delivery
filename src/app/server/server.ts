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
    new models.ItemsPerHelper()
].forEach(x => sb.CreateIfNotExist(x));



let eb = new ExpressBridge<myAuthInfo>(app);

let openedData = eb.addArea('/openedDataApi');
let dataApi = eb.addArea('/dataApi', async x => x.authInfo && x.authInfo.valid);
let actions = eb.addArea('');
evilStatics.auth.applyTo(eb, actions);

actions.addAction(new LoginAction());




openedData.add(r => {
    var loggedIn = r.authInfo && r.authInfo.valid;
    var settings: DataApiSettings<models.Helpers> = {
        allowUpdate: loggedIn,
        allowDelete: loggedIn,
        allowInsert: true,
        get: {}
    };

    if (!loggedIn) {
        settings.get.where = h => h.id.isEqualTo("No User")
    } else if (!r.authInfo.admin)
        settings.get.where = h => h.id.isEqualTo(r.authInfo.helperId);


    return new DataApi(new models.Helpers(), settings);
});

var sb = new SchemaBuilder(pool);
[
    new models.Events(),
    new models.EventHelpers(),
    new models.Helpers(),
    new models.Items(),
    new models.ItemsPerHelper()
].forEach(x => {
    dataApi.add(r => new DataApi(x, {
        allowDelete: true,
        allowInsert: true,
        allowUpdate: true
    }));
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



console.log('this code should never run in the browser');

app.listen(port);

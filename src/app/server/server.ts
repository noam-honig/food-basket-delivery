import { environment } from './../../environments/environment';
import * as models from './../models';
import * as express from 'express';
import * as radweb from 'radweb';
import { SQLServerDataProvider, ExpressBridge, PostgresDataProvider } from 'radweb/server';
import { Pool } from 'pg';
import { config } from 'dotenv';
import { DataApi } from 'radweb/utils/server/DataApi';
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
environment.dataSource = new PostgresDataProvider(pool);

var sb = new SchemaBuilder(pool);
[
    new models.Events(),
    new models.EventHelpers(),
    new models.Helpers(),
    new models.Items(),
    new models.ItemsPerHelper()
].forEach(x => sb.CreateIfNotExist(x));



let eb = new ExpressBridge<myAuthInfo>(app);

let dataApi = eb.addArea('/dataApi');
let actions = eb.addArea('');
evilStatics.auth.applyTo(eb,actions);
actions.addAction(new LoginAction());


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
    if (req.method=='OPTIONS')
    res.send('');
    res.send(fs.readFileSync('dist/index.html').toString());
});





app.listen(port);

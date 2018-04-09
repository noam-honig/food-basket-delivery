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
config();

let app = express();
let port = process.env.PORT || 3000;


if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
}

environment.dataSource = new PostgresDataProvider(new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
}));

let eb = new ExpressBridge(app);
let dataApi = eb.addArea('/dataApi');

dataApi.add(r => new DataApi(new models.Categories(), {
    allowDelete: true,
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
    res.send(fs.readFileSync('dist/index.html').toString());
});





app.listen(port);

import { Pool } from 'pg';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder } from 'radweb/server';
import { evilStatics } from '../auth/evil-statics';
import * as models from './../models';
import { foreachSync } from '../shared/utils';

export async function serverInit() {
    config();
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


    var sb = new PostgrestSchemaBuilder(pool);
    foreachSync([
        new models.Events(),
        new models.EventHelpers(),
        new models.Helpers(),
        new models.Items(),
        new models.ItemsPerHelper(),
        new models.Families(),
        new models.BasketType(),
        new models.FamilySources(),
        new models.DeliveryEvents(),
        new models.FamilyDeliveryEvents()
    ], async x => await sb.CreateIfNotExist(x));

    await sb.verifyAllColumns(new models.Families());
    await sb.verifyAllColumns(new models.Helpers());
    await sb.verifyAllColumns(new models.DeliveryEvents());
    await sb.verifyAllColumns(new models.FamilyDeliveryEvents());
    let h = new models.BasketType();
    await h.source.find({ where: h.id.isEqualTo('') }).then(x => {
        if (x.length == 0) {
            h.setEmptyIdForNewRow();
            h.name.value = 'רגיל';
            h.save();
        }
    });

    let f = new models.Families();
    console.log('fix city start');
    await foreachSync(await f.source.find({ where: f.city.isEqualTo('') }), async ff => {
        ff.city.value = ff.getGeocodeInformation().getCity();
        await ff.save();
    });
    let de = new models.DeliveryEvents();
    if (await de.source.count() == 0) {
        de.name.value = 'אירוע החלוקה הראשון';
        de.isActiveEvent.value = true;
        de.deliveryDate.dateValue = new Date();
        await de.save();
    }
    console.log('fix city done');





}
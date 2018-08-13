import { Pool } from 'pg';
import { Helpers } from '../helpers/helpers';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder, ActualSQLServerDataProvider } from 'radweb/server';

import { evilStatics } from '../auth/evil-statics';
import * as models from './../models';
import { foreachSync } from '../shared/utils';
import { Families, FamilySources } from '../families/families';
import { BasketType } from "../families/BasketType";

export async function serverInit() {
    //ActualSQLServerDataProvider.LogToConsole = true;
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
        new Helpers(),
        new models.Items(),
        new models.ItemsPerHelper(),
        new Families(),
        new BasketType(),
        new FamilySources(),
        new models.DeliveryEvents(),
        new models.FamilyDeliveryEvents(),
        new models.ApplicationSettings(),
        new models.ApplicationImages()
    ], async x => await sb.CreateIfNotExist(x));

    await sb.verifyAllColumns(new Families());
    await sb.verifyAllColumns(new Helpers());
    await sb.verifyAllColumns(new models.DeliveryEvents());
    await sb.verifyAllColumns(new models.FamilyDeliveryEvents());
    await sb.verifyAllColumns(new models.ApplicationSettings());
    await sb.verifyAllColumns(new models.ApplicationImages());
    let h = new BasketType();
    await h.source.find({ where: h.id.isEqualTo('') }).then(x => {
        if (x.length == 0) {
            h.setEmptyIdForNewRow();
            h.name.value = 'רגיל';
            h.save();
        }
    });


    let f = new Families();
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

    let settings = new models.ApplicationSettings();
    if ((await settings.source.count()) == 0) {
        settings.id.value = 1;
        settings.organisationName.value = 'שם הארגון שלי';
        settings.logoUrl.value = '/assets/apple-touch-icon.png';
        settings.smsText.value = 'שלום !משנע!\n לחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
        await settings.save();
    }
    let images = new models.ApplicationImages();
    if ((await images.source.count()) == 0) {
        images.id.value = 1;

        await images.save();

    }
    console.log('fix city done');





}
import { Pool } from 'pg';
import { Helpers } from '../helpers/helpers';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder } from 'radweb/server';

import { evilStatics } from '../auth/evil-statics';



import { foreachSync } from '../shared/utils';
import { Families } from '../families/families';
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DeliveryEvents } from '../delivery-events/delivery-events';
import { EventHelpers, Events, Items } from '../events/Events';
import { ItemsPerHelper } from '../event-item-helpers/ItemsPerHelper';
import { FamilyDeliveryEvents } from '../delivery-events/FamilyDeliveryEvents';
import { ApplicationImages } from '../manage/ApplicationImages';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { NewsUpdate } from '../news/NewsUpdate';
import { FamilyDeliveryEventsView } from '../families/FamilyDeliveryEventsView';


export var allEntities = () => [
    new Events(),
    new EventHelpers(),
    new Helpers(),
    new Items(),
    new ItemsPerHelper(),
    new Families(),
    new BasketType(),
    new FamilySources(),
    new DeliveryEvents(),
    new FamilyDeliveryEvents(),
    new ApplicationSettings(),
    new ApplicationImages(),
    new HelpersAndStats(),
    new NewsUpdate(),
    new FamilyDeliveryEventsView()
];

export async function serverInit() {

    config();
    let ssl = true;
    if (process.env.DISABLE_POSTGRES_SSL)
        ssl = false;


    if (!process.env.DATABASE_URL) {
        console.log("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
    }
    let dbUrl = process.env.DATABASE_URL;
    if (process.env.HEROKU_POSTGRESQL_GREEN_URL)
        dbUrl = process.env.HEROKU_POSTGRESQL_GREEN_URL;
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: ssl
    });
    evilStatics.dataSource = new PostgresDataProvider(pool);



    var sb = new PostgrestSchemaBuilder(pool);
    await foreachSync(allEntities(), async x => {
        if (x.__getDbName().toLowerCase().indexOf('from ') < 0) {
            await sb.CreateIfNotExist(x);
            await sb.verifyAllColumns(x);
        }
    });


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
    let de = new DeliveryEvents();
    if (await de.source.count() == 0) {
        de.name.value = 'אירוע החלוקה הראשון';
        de.isActiveEvent.value = true;
        de.deliveryDate.dateValue = new Date();
        await de.save();
    }

    let settings = new ApplicationSettings();
    if ((await settings.source.count()) == 0) {
        settings.id.value = 1;
        settings.organisationName.value = 'שם הארגון שלי';
        settings.logoUrl.value = '/assets/apple-touch-icon.png';
        settings.smsText.value = 'שלום !משנע!\n לחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
        await settings.save();
    }
    let images = new ApplicationImages();
    if ((await images.source.count()) == 0) {
        images.id.value = 1;

        await images.save();

    }
    console.log('fix city done');





}

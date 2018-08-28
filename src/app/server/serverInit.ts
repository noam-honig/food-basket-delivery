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
import { Entity } from 'radweb';
import { ServerContext } from '../auth/server-action';


export var allEntities: { new(...args: any[]): Entity<any>; }[] =
    [
        Events,
        EventHelpers,
        Helpers,
        Items,
        ItemsPerHelper,
        Families,
        BasketType,
        FamilySources,
        DeliveryEvents,
        FamilyDeliveryEvents,
        ApplicationSettings,
        ApplicationImages,
        HelpersAndStats,
        NewsUpdate,
        FamilyDeliveryEventsView
    ]
    ;

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


    let context = new ServerContext({});
    var sb = new PostgrestSchemaBuilder(pool);
    await foreachSync(allEntities.map(x => new x()), async x => {
        if (x.__getDbName().toLowerCase().indexOf('from ') < 0) {
            await sb.CreateIfNotExist(x);
            await sb.verifyAllColumns(x);
        }
    });


    if ((await context.for(BasketType).count() == 0)) {
        let h = context.for(BasketType).create();
        h.setEmptyIdForNewRow();
        h.name.value = 'רגיל';
        await h.save();
    }




    console.log('fix city start');
    await context.for(Families).foreach(f => f.city.isEqualTo(''), async ff => {
        ff.city.value = ff.getGeocodeInformation().getCity();
        await ff.save();
    });

    if ((await context.for(DeliveryEvents).count()) == 0) {
        let de = context.for(DeliveryEvents).create();
        de.name.value = 'אירוע החלוקה הראשון';
        de.isActiveEvent.value = true;
        de.deliveryDate.dateValue = new Date();
        await de.save();
    }


    if ((await context.for(ApplicationSettings).count()) == 0) {
        let settings = context.for(ApplicationSettings).create();
        settings.id.value = 1;
        settings.organisationName.value = 'שם הארגון שלי';
        settings.logoUrl.value = '/assets/apple-touch-icon.png';
        settings.smsText.value = 'שלום !משנע!\n לחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
        await settings.save();
    }

    let images = await context.for(ApplicationImages).findFirst(ap => ap.id.isEqualTo(1));
    if (!images) {
        images = context.for(ApplicationImages).create();
        images.id.value = 1;
        await images.save();
    }
    console.log('fix city done');





}

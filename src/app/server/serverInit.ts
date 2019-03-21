import { Pool } from 'pg';
import { Helpers } from '../helpers/helpers';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder } from 'radweb-server-postgres';

import { evilStatics } from '../auth/evil-statics';



import { foreachSync } from '../shared/utils';
import { Families } from '../families/families';
import { FamilySources } from "../families/FamilySources";
import { BasketType } from "../families/BasketType";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DeliveryEvents } from '../delivery-events/delivery-events';
import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext, allEntities } from '../shared/context';
import '../app.module';
import { WeeklyFamilyDeliveries } from '../weekly-families-deliveries/weekly-families-deliveries';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { ActualSQLServerDataProvider } from 'radweb-server';



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
    if (process.env.logSqls) {
        ActualSQLServerDataProvider.LogToConsole = true;
    }
    const pool = new Pool({
        connectionString: dbUrl,
        ssl: ssl
    });
    evilStatics.dataSource = new PostgresDataProvider(pool);


    let context = new ServerContext();
    var sb = new PostgrestSchemaBuilder(pool);
    await foreachSync(allEntities.map(x => context.for(x).create()), async x => {
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
    await foreachSync(await context.for(WeeklyFamilyDeliveries).find({ where: d => d.assignedHelper.isEqualTo('') }), async d => {
        let f = await context.for(WeeklyFamilies).lookupAsync(f => f.id.isEqualTo(d.familyId));
        d.assignedHelper.value = f.assignedHelper.value;
        await d.save();

    })



/*
    await context.for(Families).foreach(f => f.city.isEqualTo(''), async ff => {
        ff.city.value = ff.getGeocodeInformation().getCity();
        await ff.save();
    });
*/
    if ((await context.for(DeliveryEvents).count()) == 0) {
        let de = context.for(DeliveryEvents).create();
        de.name.value = 'אירוע החלוקה הראשון';
        de.isActiveEvent.value = true;
        de.deliveryDate.dateValue = new Date();
        await de.save();
    }



    let settings = await context.for(ApplicationSettings).lookupAsync(s => s.id.isEqualTo(1));
    if (settings.isNew()) {
        settings.id.value = 1;
        settings.organisationName.value = 'שם הארגון שלי';
        settings.logoUrl.value = '/assets/apple-touch-icon.png';
        settings.smsText.value = 'שלום !משנע!\n לחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
    }
    if (!settings.commentForSuccessDelivery.value)
        settings.commentForSuccessDelivery.value = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
    if (!settings.commentForProblem.value)
        settings.commentForProblem.value = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
    if (!settings.messageForDoneDelivery.value) {
        settings.messageForDoneDelivery.value = 'תודה על כל העזרה, נשמח אם תתנדבו שוב';
    }
    await settings.save();


    let images = await context.for(ApplicationImages).findFirst(ap => ap.id.isEqualTo(1));
    if (!images) {
        images = context.for(ApplicationImages).create();
        images.id.value = 1;
        await images.save();
    }






}

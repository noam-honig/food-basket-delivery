import { Pool } from 'pg';

import { Helpers } from '../helpers/helpers';
import { config } from 'dotenv';
import { PostgresDataProvider, PostgrestSchemaBuilder } from 'radweb-server-postgres';

import { evilStatics } from '../auth/evil-statics';



import { foreachSync } from '../shared/utils';
import { Families } from '../families/families';

import { BasketType } from "../families/BasketType";
import { ApplicationSettings } from '../manage/ApplicationSettings';

import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext, allEntities } from '../shared/context';
import '../app.module';
import { WeeklyFamilyDeliveries } from '../weekly-families-deliveries/weekly-families-deliveries';
import { WeeklyFamilies } from '../weekly-families/weekly-families';
import { ActualSQLServerDataProvider } from 'radweb-server';
import { ActualDirectSQL, actionInfo } from '../auth/server-action';
import { FamilyDeliveryEvents } from '../delivery-events/FamilyDeliveryEvents';
import { SqlBuilder } from '../model-shared/types';
import { FamilyDeliveries } from '../families/FamilyDeliveries';



export async function serverInit() {
    try {
        config();
        let ssl = true;
        if (process.env.DISABLE_POSTGRES_SSL)
            ssl = false;


        if (!process.env.DATABASE_URL) {
            console.error("No DATABASE_URL environment variable found, if you are developing locally, please add a '.env' with DATABASE_URL='postgres://*USERNAME*:*PASSWORD*@*HOST*:*PORT*/*DATABASE*'");
        }
        let dbUrl = process.env.DATABASE_URL;
        if (process.env.HEROKU_POSTGRESQL_GREEN_URL)
            dbUrl = process.env.HEROKU_POSTGRESQL_GREEN_URL;
        if (process.env.logSqls) {
            ActualSQLServerDataProvider.LogToConsole = true;
            ActualDirectSQL.log = true;
        }
        actionInfo.runningOnServer = true;
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
        let sql = new SqlBuilder();
        let fde = new FamilyDeliveryEvents(context);


        // remove unique constraint on id column if exists

        var r = await pool.query(sql.build('ALTER TABLE ', fde, ' DROP CONSTRAINT IF EXISTS familydeliveryevents_pkey'));


        //create index if required
        await pool.query(sql.build('create index if not exists fde_1 on ', fde, ' (', [fde.family, fde.deliverStatus, fde.courier], ')'));
        //create index for family deliveries if required
        var fd = new FamilyDeliveries(context);
        await pool.query(sql.build('create index if not exists fd_1 on ', fd, ' (', [fd.family, fd.deliveryStatusDate, fd.deliverStatus, fd.courier], ')'));



        if ((await context.for(BasketType).count() == 0)) {
            let h = context.for(BasketType).create();
            h.setEmptyIdForNewRow();
            h.name.value = 'רגיל';
            h.boxes.value = 1;
            await h.save();
        }
        await foreachSync(await context.for(WeeklyFamilyDeliveries).find({ where: d => d.assignedHelper.isEqualTo('') }), async d => {
            let f = await context.for(WeeklyFamilies).lookupAsync(f => f.id.isEqualTo(d.familyId));
            d.assignedHelper.value = f.assignedHelper.value;
            await d.save();

        });





        await context.for(Families).foreach(f => f.addressLongitude.isEqualTo(0), async ff => {
            let g = ff.getGeocodeInformation();
            ff.addressOk.value = !g.partialMatch();
            ff.addressLongitude.value = g.location().lng;
            ff.addressLatitude.value = g.location().lat;
            ff.city.value = ff.getGeocodeInformation().getCity();
            await ff.save();
        });




        let settings = await context.for(ApplicationSettings).lookupAsync(s => s.id.isEqualTo(1));
        if (settings.isNew()) {
            settings.id.value = 1;
            settings.organisationName.value = 'שם הארגון שלי';
            settings.logoUrl.value = '/assets/apple-touch-icon.png';
            settings.smsText.value = 'שלום !משנע!\n לחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
        }
        if (!settings.commentForSuccessDelivery.value)
            settings.commentForSuccessDelivery.value = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
        if (!settings.commentForSuccessLeft.value)
            settings.commentForSuccessLeft.value = 'אנא פרט היכן השארת את הסל ועם מי דיברת';
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
        if (settings.dataStructureVersion.value == 0) {
            console.log("migrating family delivery events to family deliveries");
            let fdes = await context.for(FamilyDeliveryEvents).find({ where: fde => fde.deliverStatus.isAResultStatus() });
            for (const fde of fdes) {
                let f = await context.for(Families).findFirst(f => f.id.isEqualTo(fde.family));
                if (f) {
                    fd = context.for(FamilyDeliveries).create();
                    fd.family.value = f.id.value;
                    fd.basketType.value = fde.basketType.value;
                    fd.deliverStatus.value = fde.deliverStatus.value;
                    fd.courier.value = fde.courier.value;
                    fd.courierComments.value = fde.courierComments.value;
                    fd.deliveryStatusDate.value = fde.deliveryStatusDate.value;
                    fd.courierAssignUser.value = fde.courierAssignUser.value;
                    fd.courierAssingTime.value = fde.courierAssingTime.value;
                    fd.archive_address.value = f.address.originalValue;
                    fd.archive_floor.value = f.floor.originalValue;
                    fd.archive_appartment.value = f.appartment.originalValue;
                    fd.archive_city.value = f.city.originalValue;
                    fd.archive_addressComment.value = f.addressComment.originalValue;
                    fd.archive_deliveryComments.value = f.deliveryComments.originalValue;
                    fd.archive_phone1.value = f.phone1.originalValue;
                    fd.archive_phone1Description.value = f.phone1Description.originalValue;
                    fd.archive_phone2.value = f.phone2.originalValue;
                    fd.archive_phone2Description.value = f.phone2Description.originalValue;
                    fd.archive_addressLongitude.value = f.addressLongitude.originalValue;
                    fd.archive_addressLatitude.value = f.addressLatitude.originalValue;
                    await fd.save();
                }
            }
            settings.dataStructureVersion.value = 1;
            await settings.save();


        }
        if (settings.dataStructureVersion.value == 1) {
            console.log("updating family source for historical information");
            let f = new Families(context);
            let fd = new FamilyDeliveries(context);
            sql.update(fd,{
                set:()=>[[fd.archiveFamilySource,f.familySource]],
                from:f,
                where:()=>[sql.eq(f.id,fd.family)]
            });            
            settings.dataStructureVersion.value = 2;
            await settings.save();
        }

    } catch (error) {
        console.error(error);
        throw error;
    }




}

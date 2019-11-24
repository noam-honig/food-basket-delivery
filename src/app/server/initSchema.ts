
import { PostgresDataProvider,  PostgresPool } from '@remult/server-postgres';
import { Families } from '../families/families';
import { BasketType } from "../families/BasketType";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext } from '@remult/core';
import '../app.module';


import { FamilyDeliveryEvents } from '../delivery-events/FamilyDeliveryEvents';
import { SqlBuilder } from '../model-shared/types';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Helpers } from '../helpers/helpers';
import { FamilyDeliveriesStats } from '../delivery-history/delivery-history.component';

export async function initSchema(pool: PostgresPool) {


    var dataSource = new PostgresDataProvider(pool);
    let context = new ServerContext();
    context.setDataProvider(dataSource);
    let sql = new SqlBuilder();
    let fde = new FamilyDeliveryEvents(context);
    let f = new Families(context);
    // remove unique constraint on id column if exists
    await pool.query(sql.build('ALTER TABLE ', fde, ' DROP CONSTRAINT IF EXISTS familydeliveryevents_pkey'));


    //create index if required
    await pool.query(sql.build('create index if not exists fde_1 on ', fde, ' (', [fde.family, fde.deliverStatus, fde.courier], ')'));
    //create index for family deliveries if required
    var fd = new FamilyDeliveries(context);
    await pool.query(sql.build('create index if not exists fd_1 on ', fd, ' (', [fd.family, fd.deliveryStatusDate, fd.deliverStatus, fd.courier], ')'));
    //create index if required
    await pool.query(sql.build('create index if not exists f_1 on ', f, ' (', [fde.courier, f.deliverStatus], ')'));



    if ((await context.for(BasketType).count() == 0)) {
        let h = context.for(BasketType).create();
        h.setEmptyIdForNewRow();
        h.name.value = 'רגיל';
        h.boxes.value = 1;
        await h.save();
    }

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
        settings.smsText.value = 'שלום !משנע!\nלחלוקת חבילות !ארגון! לחץ על: !אתר! \nתודה !שולח!';
    }
    if (!settings.reminderSmsText.value)
        settings.reminderSmsText.value = 'שלום !משנע!, \nנשמח אם תעדכן את המערכת במצב המסירה של הסלים. לעדכון לחץ על:  !אתר!\nבתודה !ארגון!';

    if (!settings.commentForSuccessDelivery.value)
        settings.commentForSuccessDelivery.value = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
    if (!settings.commentForSuccessLeft.value)
        settings.commentForSuccessLeft.value = 'אנא פרט היכן השארת את הסל ועם מי דיברת';
    if (!settings.commentForProblem.value)
        settings.commentForProblem.value = 'נשמח אם תכתוב לנו הערה על מה שראית והיה';
    if (!settings.messageForDoneDelivery.value) {
        settings.messageForDoneDelivery.value = 'תודה על כל העזרה, נשמח אם תתנדבו שוב';
    }
    if (!settings.deliveredButtonText.value) {
        settings.deliveredButtonText.value = 'מסרתי את החבילה בהצלחה';
    }
    if (!settings.boxes1Name.value)
        settings.boxes1Name.value = 'ארגזים';
    if (!settings.boxes2Name.value)
        settings.boxes2Name.value = 'משהו אחר';
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
                fd.archive_entrance.value = f.entrance.originalValue;
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
        pool.query(sql.update(fd, {
            set: () => [[fd.archiveFamilySource, f.familySource]],
            from: f,
            where: () => [sql.eq(f.id, fd.family)]
        }));
        settings.dataStructureVersion.value = 2;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 2) {
        console.log("updating update date");
        let f = context.for(Families).create();
        pool.query(sql.update(f, {
            set: () => [[f.lastUpdateDate, f.createDate]]
        }));
        settings.dataStructureVersion.value = 3;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 3) {
        console.log("updating family source for historical information");
        let f = new Families(context);
        let fd = new FamilyDeliveries(context);
        pool.query(sql.update(fd, {
            set: () => [[fd.archiveFamilySource, f.familySource]],
            from: f,
            where: () => [sql.eq(f.id, fd.family)]
        }));
        settings.dataStructureVersion.value = 4;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 4) {
        console.log("updating update date");
        let f = context.for(Families).create();
        pool.query(sql.update(f, {
            set: () => [[f.lastUpdateDate, f.createDate]]
        }));
        settings.dataStructureVersion.value = 5;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 5) {
        console.log("updating last sms date");

        let helpers = await context.for(Helpers).find({});
        for (const h of helpers) {
            if (!h.smsDate.value) {
                let f = await context.for(FamilyDeliveriesStats).find({
                    where: f => f.courier.isEqualTo(h.id),
                    orderBy: f => [{ column: f.deliveryStatusDate, descending: true }]
                });
                if (f && f.length > 0) {
                    h.smsDate.value = f[0].deliveryStatusDate.value;
                    await h.save();
                }
            }
        }
        settings.dataStructureVersion.value = 6;
        await settings.save();

    }
    if (settings.dataStructureVersion.value == 6) {
        settings.showLeftThereButton.value = true;
        settings.dataStructureVersion.value = 7;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 7) {
        settings.usingSelfPickupModule.value = true;
        settings.dataStructureVersion.value = 8;
        await settings.save();
    }
}
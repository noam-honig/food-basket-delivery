
import { PostgresDataProvider, PostgresPool } from '@remult/server-postgres';
import { Families } from '../families/families';
import { BasketType } from "../families/BasketType";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { ApplicationImages } from '../manage/ApplicationImages';
import { ServerContext, SqlDatabase } from '@remult/core';
import '../app.module';



import { SqlBuilder } from '../model-shared/types';
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { Helpers } from '../helpers/helpers';
import { FamilyDeliveriesStats } from '../delivery-history/delivery-history.component';
import { Sites } from '../sites/sites';

export async function initSchema(pool1: PostgresPool, org: string) {

    
    var dataSource = new SqlDatabase(new PostgresDataProvider(pool1));
    let context = new ServerContext();
    context.setDataProvider(dataSource);
    let sql = new SqlBuilder();

    let f = context.for(Families).create();



    
    //create index for family deliveries if required
    var fd = context.for(FamilyDeliveries).create();
    await dataSource.execute(sql.build('create index if not exists fd_1 on ', fd, ' (', [fd.family, fd.deliveryStatusDate, fd.deliverStatus, fd.courier], ')'));
    

    
    //create index if required
    await dataSource.execute(sql.build('create index if not exists f_1 on ', f, ' (', [f.courier, f.deliverStatus], ')'));

    

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
        settings.boxes1Name.value = 'מנות';
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
        settings.dataStructureVersion.value = 1;
        await settings.save();


    }
    if (settings.dataStructureVersion.value == 1) {
        console.log("updating family source for historical information");
        let f = context.for(Families).create();
        let fd = context.for(FamilyDeliveries).create();
        dataSource.execute(sql.update(fd, {
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
        dataSource.execute(sql.update(f, {
            set: () => [[f.lastUpdateDate, f.createDate]]
        }));
        settings.dataStructureVersion.value = 3;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 3) {
        console.log("updating family source for historical information");
        let f = context.for(Families).create();
        let fd = context.for(FamilyDeliveries).create();
        dataSource.execute(sql.update(fd, {
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
        dataSource.execute(sql.update(f, {
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
        settings.dataStructureVersion.value = 8;
        await settings.save();
    }
    if (settings.dataStructureVersion.value == 8) {
        if (org && settings.logoUrl.value == '/assets/apple-touch-icon.png') {
            settings.logoUrl.value = '/' + org + settings.logoUrl.value;
        }
        settings.dataStructureVersion.value = 9;
        await settings.save();
    }
    
    if (settings.dataStructureVersion.value == 9) {
        await dataSource.execute(sql.build('update ', fd, ' set ', fd.familyName, ' = ', f.name, ' from ', f, ' where ', sql.build(f, '.', f.id), ' = ', fd.family));
        settings.dataStructureVersion.value = 10;
        await settings.save();
    }
}
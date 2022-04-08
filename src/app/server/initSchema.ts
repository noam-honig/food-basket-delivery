
import { PostgresDataProvider, PostgresPool } from 'remult/postgres';
import { Families } from '../families/families';
import { BasketType } from "../families/BasketType";
import { ApplicationSettings, RemovedFromListExcelImportStrategy, setSettingsForSite } from '../manage/ApplicationSettings';
import { ApplicationImages } from '../manage/ApplicationImages';
import { SqlDatabase, FieldMetadata, Remult, ControllerBase } from 'remult';

import { SqlBuilder, SqlFor } from "../model-shared/SqlBuilder";
import { FamilyDeliveries } from '../families/FamilyDeliveries';
import { DistributionCenters } from '../manage/distribution-centers';
import { pagedRowsIterator } from '../families/familyActionsWiring';
import { Language, TranslationOptions } from '../translate';
import { Sites, getLang, setLangForSite } from '../sites/sites';
import { InitContext } from '../helpers/init-context';
import { HelperCommunicationHistory } from '../in-route-follow-up/in-route-helpers';
import { Helpers } from '../helpers/helpers';
import { Roles } from '../auth/roles';


export async function initSchema(pool1: PostgresPool, org: string) {


    var dataSource = new SqlDatabase(new PostgresDataProvider(pool1));
    let remult = new Remult();
    await InitContext(remult);
    remult.setDataProvider(dataSource);
    let sql = new SqlBuilder(remult);
    let createFamilyIndex = async (name: string, ...columns: FieldMetadata[]) => {
        await dataSource.execute(await sql.build("create index if not exists ", name, " on ", f, "  (", columns, ")"));
    }
    let createDeliveryIndex = async (name: string, ...columns: FieldMetadata[]) => {
        await dataSource.execute(await sql.build("create index if not exists ", name, " on ", fd, "  (", columns, ")"));
    }


    let f = SqlFor(remult.repo(Families));
    //create index for family deliveries if required

    var fd = SqlFor(remult.repo(FamilyDeliveries));

    //

    if ((await remult.repo(BasketType).count() == 0)) {
        let h = remult.repo(BasketType).create();
        h.id = '';
        h.name = 'רגיל';
        h.boxes = 1;
        await h.save();
    }



    /*await  remult.repo(Families).foreach(f => f.addressLongitude.isEqualTo(0), async ff => {
        let g = ff.getGeocodeInformation();
        ff.addressOk = !g.partialMatch();
        ff.addressLongitude.value = g.location().lng;
        ff.addressLatitude.value = g.location().lat;
        ff.city.value = ff.getGeocodeInformation().getCity();
        await ff.save();
    });*/

    let settings = await remult.repo(ApplicationSettings).findId(1, { createIfNotFound: true });
    let l = getLang(remult);
    remult.setUser({
        id: "version_update",
        name: "version_update",
        roles: [Roles.admin]
    });
    if (settings.isNew()) {
        settings.id = 1;
        settings.organisationName = l.defaultOrgName;;
        settings.logoUrl = '/assets/apple-touch-icon.png';
        settings.smsText = l.defaultSmsText;
    }
    if (!settings.reminderSmsText)
        settings.reminderSmsText = l.reminderSmsText;

    if (!settings.commentForSuccessDelivery)
        settings.commentForSuccessDelivery = l.commentForSuccessDelivery;
    if (!settings.commentForSuccessLeft)
        settings.commentForSuccessLeft = l.commentForSuccessLeft;
    if (!settings.commentForProblem)
        settings.commentForProblem = l.commentForProblem;
    if (!settings.messageForDoneDelivery) {
        settings.messageForDoneDelivery = l.messageForDoneDelivery;
    }
    if (!settings.deliveredButtonText) {
        settings.deliveredButtonText = l.deliveredButtonText;
    }
    if (!settings.boxes1Name)
        settings.boxes1Name = l.boxes1Name;
    if (!settings.boxes2Name)
        settings.boxes2Name = l.boxes2Name;
    await settings.save();


    let images = await remult.repo(ApplicationImages).findId(1);
    if (!images) {
        images = remult.repo(ApplicationImages).create();
        images.id = 1;
        await images.save();
    }
    if ((await remult.repo(DistributionCenters).count() == 0)) {
        let h = remult.repo(DistributionCenters).create();
        h.id = '';
        h.name = l.defaultDistributionListName;
        h.address = settings.address;
        await h.save();
    }
    if (settings.dataStructureVersion == 0) {
        settings.dataStructureVersion = 1;
        await settings.save();


    }
    if (settings.dataStructureVersion == 1) {

        settings.dataStructureVersion = 2;
        await settings.save();
    }
    if (settings.dataStructureVersion == 2) {

        let f = SqlFor(remult.repo(Families));
        dataSource.execute(await sql.update(f, {
            set: () => [[f.lastUpdateDate, f.createDate]]
        }));
        settings.dataStructureVersion = 3;
        await settings.save();
    }
    if (settings.dataStructureVersion == 3) {

        settings.dataStructureVersion = 4;
        await settings.save();
    }
    if (settings.dataStructureVersion == 4) {
        console.log("updating update date");
        let f = SqlFor(remult.repo(Families));
        dataSource.execute(await sql.update(f, {
            set: () => [[f.lastUpdateDate, f.createDate]]
        }));
        settings.dataStructureVersion = 5;
        await settings.save();
    }
    if (settings.dataStructureVersion == 5) {

        settings.dataStructureVersion = 6;
        await settings.save();

    }
    if (settings.dataStructureVersion == 6) {
        settings.showLeftThereButton = true;
        settings.dataStructureVersion = 7;
        await settings.save();
    }
    if (settings.dataStructureVersion == 7) {
        settings.dataStructureVersion = 8;
        await settings.save();
    }
    if (settings.dataStructureVersion == 8) {
        if (org && settings.logoUrl == '/assets/apple-touch-icon.png') {
            settings.logoUrl = '/' + org + settings.logoUrl;
        }
        settings.dataStructureVersion = 9;
        await settings.save();
    }
    if (settings.dataStructureVersion == 9) {
        if ((await remult.repo(Families).count()) > 0)
            await dataSource.execute(await sql.build('update ', fd, ' set ', fd.name, ' = ', f.name, ' from ', f, ' where ', await sql.build(f, '.', f.id), ' = ', fd.family));
        settings.dataStructureVersion = 10;
        await settings.save();
    }
    if (settings.dataStructureVersion == 10) {
        settings.checkDuplicatePhones = true;
        settings.checkIfFamilyExistsInDb = true;
        settings.checkIfFamilyExistsInFile = true;
        settings.removedFromListStrategy = RemovedFromListExcelImportStrategy.displayAsError;
        settings.dataStructureVersion = 11;
        await settings.save();
    }
    if (settings.dataStructureVersion == 11) {
        await dataSource.execute(await sql.build('create index if not exists fd_1 on ', fd, ' (', [fd.family, fd.deliveryStatusDate, fd.deliverStatus, fd.courier], ')'));
        //create index if required
        await dataSource.execute(await sql.build('drop index if exists f_1  '));
        await dataSource.execute(await sql.build('drop index if exists for_courier  '));
        await dataSource.execute(await sql.build('drop index if exists for_distribution_status_queries  '));
        await dataSource.execute(await sql.build('drop index if exists for_name  '));
        await dataSource.execute(await sql.build('drop index if exists for_courier1  '));
        await dataSource.execute(await sql.build('drop index if exists for_distribution_status_queries1  '));
        await dataSource.execute(await sql.build('drop index if exists for_basket  '));
        await dataSource.execute(await sql.build('drop index if exists for_basket_dist  '));
        await createDeliveryIndex('for_courier2', fd.courier, fd.deliveryStatusDate, fd.courierAssingTime, fd.city, fd.basketType);
        await createDeliveryIndex("for_distribution_status_queries2", fd.distributionCenter, fd.courier, fd.deliverStatus, fd.city, fd.basketType);
        await createFamilyIndex("for_name1", f.name, f.status, f.basketType);
        await createDeliveryIndex("for_name2", fd.name, fd.deliverStatus, fd.basketType);

        await createDeliveryIndex("for_distCenter_name1", fd.distributionCenter, fd.name, fd.deliverStatus, fd.basketType);
        await createDeliveryIndex("for_basket1", fd.basketType, fd.deliverStatus, fd.courier);
        await createDeliveryIndex("for_basket_dist1", fd.distributionCenter, fd.basketType, fd.deliverStatus, fd.courier);

        await dataSource.execute("create extension if not exists pg_trgm with schema pg_catalog;");
        await dataSource.execute(await sql.build('create index if not exists for_like_on_groups on families using gin  (groups gin_trgm_ops)'));
        settings.dataStructureVersion = 12;
        await settings.save();
    }
    let version = async (ver: number, what: () => Promise<void>) => {
        if (settings.dataStructureVersion < ver) {
            try {
                console.log('start version ', ver, org);
                await what();
                console.log('end version ', ver, org);
            } catch (err) {
                console.error("failed for version ", ver, org, err);
                throw err;

            }
            settings.dataStructureVersion = ver;
            await settings.save();
        }
    }
    await version(13, async () => {
        if ((await remult.repo(Families).count()) > 0)
            await dataSource.execute(await sql.update(f, {
                set: () => [
                    [f.status, sql.case([{ when: ['deliverstatus=99'], then: 99 }], 0)],
                    [f.statusUser, 'deliverystatususer'],
                    [f.statusDate, 'deliverystatusdate']
                ]


            }));
    })

    if (settings.dataStructureVersion == 13) {
        await pagedRowsIterator(remult.repo(Families), {
            forEachRow: async f => {
                f._suppressLastUpdateDuringSchemaInit = true;
                let g = f.addressHelper.getGeocodeInformation;
                f.addressByGoogle = g.getAddress();
                f.drivingLatitude = g.location().lat;
                f.drivingLongitude = g.location().lng;
                await f.save();
            },
            where: undefined,

        });
        settings.dataStructureVersion = 14;
        await settings.save();
    }

    await version(15, async () => {
        let fromArchive = (col: FieldMetadata) =>
            [col, sql.build('archive_', col.getDbName())] as [FieldMetadata, any];
        if ((await remult.repo(Families).count()) > 0)
            await dataSource.execute(await sql.update(fd, {
                set: () => [
                    [fd.archive, true],
                    [fd.name, 'familyname'],
                    [fd.createDate, fd.deliveryStatusDate],
                    fromArchive(fd.deliveryComments),
                    [fd.groups, 'archivegroups'],
                    [fd.familySource, 'archivefamilysource'],
                    fromArchive(fd.address),
                    fromArchive(fd.entrance),
                    fromArchive(fd.floor),
                    fromArchive(fd.addressComment),
                    fromArchive(fd.appartment),
                    fromArchive(fd.addressLongitude),
                    fromArchive(fd.city),
                    fromArchive(fd.addressLatitude),
                    [fd.drivingLongitude, fd.addressLongitude],
                    [fd.drivingLatitude, fd.addressLatitude],
                    [fd.addressByGoogle, fd.address],
                    [fd.addressOk, true],
                    fromArchive(fd.phone1Description),
                    fromArchive(fd.phone2),
                    fromArchive(fd.phone3),
                    fromArchive(fd.phone3Description),
                    fromArchive(fd.phone4),
                    fromArchive(fd.phone2Description),
                    fromArchive(fd.phone4Description),
                ]
            }));
    });
    await version(16, async () => {
        if ((await remult.repo(Families).count()) > 0)
            await dataSource.execute(await sql.insert({
                into: fd,
                from: f,
                set: () => {
                    let r: [FieldMetadata, any][] = [
                        [fd.id, f.id],
                        [fd.family, f.id],
                        [fd.createDate, sql.case([{ when: ['deliverStatus in (0,2)'], then: 'deliveryStatusDate' }], 'courierAssingTime')],
                        [fd.createUser, 'courierAssignUser'],
                        [fd.distributionCenter, 'distributionCenter'],
                        [fd.deliverStatus, sql.case([{ when: ['deliverStatus=90'], then: '9' }], 'deliverStatus')]
                    ];
                    for (const c of [
                        fd.name,
                        fd.basketType,


                        fd.courier,
                        fd.courierComments,
                        fd.routeOrder,
                        fd.special,
                        fd.deliveryStatusDate,
                        fd.courierAssignUser,
                        fd.courierAssingTime,
                        fd.deliveryStatusUser,
                        fd.needsWork,
                        fd.needsWorkDate,
                        fd.needsWorkUser,
                        fd.deliveryComments,
                        fd.familySource,
                        fd.groups,
                        fd.address,
                        fd.floor,
                        fd.appartment,
                        fd.entrance,
                        fd.city,
                        fd.addressComment,
                        fd.addressLongitude,
                        fd.addressLatitude,
                        fd.addressByGoogle,
                        fd.addressOk,
                        fd.phone1,
                        fd.phone1Description,
                        fd.phone2,
                        fd.phone2Description,
                        fd.phone3,
                        fd.phone3Description,
                        fd.phone4,
                        fd.phone4Description

                    ]) {
                        r.push([c, c.getDbName()])
                    }
                    return r;
                },
                where: () => ['deliverstatus not in (99,95)']
            }));

    });
    await version(17, async () => {
        await dataSource.execute(await sql.build('drop index if exists for_distCenter_name  '));
    });
    await version(18, async () => {
        await dataSource.execute(await sql.update(f, { set: () => [[f.quantity, 1]] }));
    });
    await version(19, async () => {
        await dataSource.execute(await sql.update(fd, { set: () => [[fd.quantity, 1]] }));
    });
    await version(20, async () => {
        let dc = await remult.repo(DistributionCenters).find({ where: { name: 'נקודת חלוקה ראשונה' } });
        for await (const d of dc) {
            d.name = 'חלוקת מזון';
            await d.save();
        }
    });
    await version(21, async () => {
        if ((await remult.repo(Families).count()) > 0)
            await dataSource.execute(await sql.update(fd, {
                set: () => [[fd.fixedCourier, f.fixedCourier], [fd.familyMembers, f.familyMembers]],
                from: f,
                where: () => [sql.eq(f.id, fd.family)]
            }));
    });
    await version(22, async () => {
        await pagedRowsIterator(remult.repo(Families), {
            where: { addressOk: false },
            forEachRow: async f => {
                f._suppressLastUpdateDuringSchemaInit = true;
                f.addressOk = !f.addressHelper.getGeocodeInformation.partialMatch();
                if (f.addressOk)
                    await f.save();
            }
        });
    });
    await version(23, async () => {
        let r = await dataSource.execute(await sql.query({
            from: fd,
            select: () => [fd.id],
            innerJoin: () => [{ to: f, on: () => [sql.eq(f.id, fd.family)] }],
            where: () => [fd.where(FamilyDeliveries.active), sql.or(sql.ne(fd.addressByGoogle, f.addressByGoogle), sql.ne(fd.addressOk, f.addressOk))]
        }));
        console.log("fixing deliveries mismatch with family info ", r.rows.length);
        for (const id of r.rows.map(x => x.id)) {
            let fd = await remult.repo(FamilyDeliveries).findId(id);
            let f = await remult.repo(Families).findId(fd.family);
            f.updateDelivery(fd);
            await fd.save();
        }
    });
    await version(24, async () => {
        settings.forWho = settings._old_for_soliders ? TranslationOptions.soldiers : TranslationOptions.Families;
        await settings.save();
    });
    await version(25, async () => {
        settings.excelImportUpdateFamilyDefaultsBasedOnCurrentDelivery = true;
        await settings.save();
    });
    await version(26, async () => {
        settings.successMessageText = "שלום !משפחה!, אחד המתנדבים שלנו מסר לכם סל. בברכה !ארגון!";
        await settings.save();

    });
    await version(27, async () => {
        settings.successMessageText = "שלום !משפחה!, אחד המתנדבים שלנו מסר לכם סל. בברכה !ארגון!";
        await settings.save();

    });
    await version(28, async () => {
        await dataSource.execute(await sql.update(fd, {
            set: () => [[fd.needsWork, false]],
            where: () => [fd.where({ archive: true, needsWork: true })]
        }))

    });
    await version(29, async () => {
        await dataSource.execute(await sql.update(fd, {
            set: () => [[fd.area, sql.func('trim', fd.area)]]
        }))

    });
    await version(30, async () => {
        await dataSource.execute(await sql.update(f, {
            set: () => [[f.area, sql.func('trim', f.area)]]
        }))

    });
    await version(31, async () => {
        //    await dataSource.execute(await sql.build("alter table ", fd, " alter column ", fd.courier, " drop not null"));

    });
    await version(32, async () => {
        //  await dataSource.execute(await sql.update(fd, { set: () => [[fd.courier, "null"]], where: () => [sql.eq(fd.courier, sql.str(""))] }));
    });
    await version(33, async () => {
        //   await dataSource.execute(await sql.update(fd, { set: () => [[fd.courier, sql.str("")]], where: () => [await sql.build(fd.courier, " is null")] }));
    });
    await version(34, async () => {
        //await dataSource.execute(await sql.build("alter table ", fd, " alter column ", fd.courier, " set not null"));

    });
    await version(35, async () => {
    });
    await version(36, async () => {
        settings.questionForVolunteerWhenUploadingPhoto = settings.lang.defaultQuestionForVolunteerWhenUploadingPhoto;
        await settings.save();
    });
    await version(37, async () => {
        settings.askVolunteerForAPhotoToHelp = true;
        await settings.save();
    });
    await version(38, async () => {
        if (settings.successMessageText == "שלום !משפחה!, אחד המתנדבים שלנו מסר לכם סל. בברכה !ארגון!") {
            settings.successMessageText = "שלום !משפחה!, ";
            await settings.save();
        }
    });
    await version(39, async () => {
        let l = new Language();
        if (settings.lang.defaultQuestionForVolunteerWhenUploadingPhoto != l.defaultQuestionForVolunteerWhenUploadingPhoto) {
            settings.questionForVolunteerWhenUploadingPhoto = settings.lang.defaultQuestionForVolunteerWhenUploadingPhoto;
            await settings.save();
        }
    });
    await version(40, async () => {
        settings.setDefaultsForProblemStatuses();
        await settings.save();
    });
    await version(41, async () => {
        let repo = remult.repo(HelperCommunicationHistory);
        let com = SqlFor(repo);
        if ((await repo.count()) > 0)
            await dataSource.execute(await sql.update(com, {
                set: () => [
                    [com.message, "comment"]

                ]
            }));
    });
    await version(42, async () => {
        settings.confirmEventParticipationMessage = `שלום !מתנדב!, הנך רשום/ה ל!ארוע! ל!תאריך!
לאישור השתתפות השב כן
לביטול השתתפות השב לא
להסרה מהרשימה השב הסר`;
        await settings.save();
    });
    await version(43, async () => {
        for await (const helper of remult.repo(Helpers).query({
            where: {
                $or: [
                    { preferredDistributionAreaAddress: { "!=": '' } },
                    { preferredFinishAddress: { "!=": '' } }
                ]
            }
        })) {
            helper.preferredDistributionAreaAddressHelper.updateCityColumn();
            helper.preferredFinishAddressHelper.updateCityColumn();
            await helper.save();
        }
    });






    setLangForSite(org, settings.forWho);
    setSettingsForSite(org, settings);

}
/*
delete from haderamoadonit.families
;
UPDATE haderamoadonit.familydeliveries
    SET couriercomments='', archivefamilysource='', archivegroups='', archive_address='', archive_floor='', archive_appartment='', archive_entrance='', archive_postalcode=0
    , archive_city='', archive_addresscomment='', archive_deliverycomments='', phone='', archive_phone1description='', archive_phone2='', archive_phone2description='',
    familyname='', archive_phone4='', archive_phone3description='', archive_phone3='', archive_phone4description='', distributioncenter='', name='', address='', groups='',
    deliverycomments='', familysource='', floor='', appartment='', city='', entrance='',  area='', phone2='',  phone2description='', addresscomment='',
    addressbygoogle='', phone1description='', phone4='', phone3='', phone4description='', archive=true, phone3description='', fixedcourier='', familymembers=0,
    internaldeliverycomment='';
update haderamoadonit.helpers set name='מתנדב', phone='0501234567' where isadmin=false;

;
select * from haderamoadonit.familydeliveries */
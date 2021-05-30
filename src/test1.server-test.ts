import { actionInfo,  getControllerDefs,  myServerAction, ServerContext, ServerFunction, SqlDatabase } from "@remult/core";
import { settings } from "cluster";
import "jasmine";
import { AsignFamilyComponent } from "./app/asign-family/asign-family.component";
import { Roles } from "./app/auth/roles";
import { HelpersAndStats } from "./app/delivery-follow-up/HelpersAndStats";
import { DeliveryStatus } from "./app/families/DeliveryStatus";
import { Families } from "./app/families/families";
import { FamiliesComponent } from "./app/families/families.component";
import { bridgeFamilyDeliveriesToFamilies, UpdateArea, UpdateAreaForDeliveries, UpdateStatus, UpdateStatusForDeliveries } from "./app/families/familyActions";
import { ActiveFamilyDeliveries, FamilyDeliveries } from "./app/families/FamilyDeliveries";
import { FamilyStatus } from "./app/families/FamilyStatus";
import { ArchiveDeliveries, DeleteDeliveries, UpdateDeliveriesStatus } from "./app/family-deliveries/family-deliveries-actions";
import { FamilyDeliveriesComponent } from "./app/family-deliveries/family-deliveries.component";
import { HelperId, Helpers, HelperUserInfo } from "./app/helpers/helpers";
import { ApplicationSettings } from "./app/manage/ApplicationSettings";
import { serverInit } from "./app/server/serverInit";
import { GeocodeInformation } from "./app/shared/googleApiHelpers";
import { fitAsync, itAsync } from "./app/shared/test-helper";
import { Sites } from "./app/sites/sites";

async function init() {
    let context = new ServerContext();
    context.setUser({
        id: 'admin',
        name: 'admin',
        roles: [Roles.admin, Roles.distCenterAdmin]
    });
    actionInfo.runningOnServer = true;
    let sql: SqlDatabase;


    beforeAll(
        done => {
            serverInit().then(x => {
                let dp = Sites.getDataProviderForOrg("test");
                sql = <any>dp;
                context.setDataProvider(dp);
                done();
            });
        });

    describe("helpers", () => {
        itAsync('helpers and stats work', async () => {

            let h = await context.for(HelpersAndStats).find();
        })
            ;
    });
    describe("the test", () => {
        let helperId: HelperId;
        beforeEach(async done => {
            for (const d of await context.for(FamilyDeliveries).find()) {
                await d.delete();
            }

            let as = await ApplicationSettings.getAsync(context);
            {
                let g = new GeocodeInformation({

                    status: "OK",
                    results: [{
                        address_components: [],
                        formatted_address: '',
                        partial_match: false,
                        place_id: '123',
                        types: [],
                        geometry: {
                            location: { lat: 0, lng: 0 },
                            location_type: '',
                            viewport: {
                                northeast: { lat: 0, lng: 0 },
                                southwest: { lat: 0, lng: 0 }

                            }
                        }
                    }]
                });
                as.addressApiResult = g.saveToString();
                await as.save();
            }
            let h = context.for(Helpers).create();
            h.name = 'a';
            h._disableOnSavingRow = true;
            await h.save();
            helperId = h.helperId();
            done();
        });
        async function callAddBox() {
            return await AsignFamilyComponent.AddBox({
                allRepeat: false,
                area: '',
                basketType: '',
                city: '',
                distCenter: '',
                group: '',
                helperId: helperId.evilGetId(),
                numOfBaskets: 1,
                preferRepeatFamilies: false
            }, context, sql);
        }
        async function createDelivery(distanceFromRoot: number) {
            let d = context.for(ActiveFamilyDeliveries).create();
            d.name = distanceFromRoot.toString();
            d.addressLatitude = distanceFromRoot;
            d.family = distanceFromRoot.toString();
            await d.save();
            return d;
        }

        itAsync("Starts with farthest delivery", async () => {
            await createDelivery(10);
            await createDelivery(5);
            let r = await callAddBox();
            expect(r.families.length).toBe(1);
            expect(r.families[0].name).toBe("10");
        });
        itAsync("chooses closest to previous delivery", async () => {

            await createDelivery(10);
            await createDelivery(5);
            let d = await createDelivery(6);
            d.courier = helperId;
            await d.save();
            let r = await callAddBox();
            expect(r.families.length).toBe(2);
            expect(r.families.some(d => d.name == '6')).toBeTruthy();;
            expect(r.families.some(d => d.name == '5')).toBeTruthy();
        });
        itAsync("chooses closest to helper", async () => {

            await createDelivery(10);
            await createDelivery(5);
            let h = await context.for(Helpers).findId(helperId);
            h.addressApiResult = new GeocodeInformation({

                status: "OK",
                results: [{
                    address_components: [],
                    formatted_address: '',
                    partial_match: false,
                    place_id: '123',
                    types: [],
                    geometry: {
                        location: { lat: 6, lng: 0 },
                        location_type: '',
                        viewport: {
                            northeast: { lat: 0, lng: 0 },
                            southwest: { lat: 0, lng: 0 }

                        }
                    }
                }]
            }).saveToString();
            await h.save();

            let r = await callAddBox();
            expect(r.families.length).toBe(1);

            expect(r.families[0].name).toBe('5');
        });
        itAsync("prefer repeat family", async () => {
            await createDelivery(10);

            let d = await createDelivery(5);
            d.deliverStatus = DeliveryStatus.Success;
            d.courier = helperId;
            await d.save();
            await createDelivery(5);
            let r = await callAddBox();
            expect(r.families.length).toBe(1);
            expect(r.families[0].name).toBe("5");
        });
        itAsync("prefer repeat family over helper preference", async () => {
            await createDelivery(10);

            let d = await createDelivery(5);
            d.deliverStatus = DeliveryStatus.Success;
            d.courier = helperId;
            await d.save();
            await createDelivery(5);

            let h = await context.for(Helpers).findId(helperId);
            h.addressApiResult = new GeocodeInformation({

                status: "OK",
                results: [{
                    address_components: [],
                    formatted_address: '',
                    partial_match: false,
                    place_id: '123',
                    types: [],
                    geometry: {
                        location: { lat: 9, lng: 0 },
                        location_type: '',
                        viewport: {
                            northeast: { lat: 0, lng: 0 },
                            southwest: { lat: 0, lng: 0 }

                        }
                    }
                }]
            }).saveToString();
            await h.save();


            let r = await callAddBox();
            expect(r.families.length).toBe(1);
            expect(r.families[0].name).toBe("5");
        });
    });
    describe("test update family status", () => {

        beforeEach(async (done) => {
            for (const d of await context.for(FamilyDeliveries).find()) {
                await d.delete();
            }
            for (const f of await context.for(Families).find()) {
                await f.delete();
            }
            done();
        });
        itAsync("update status, updatesStatus and deletes delivery", async () => {
            let f = await context.for(Families).create();
            f.name = "test";
            await f.save();

            let fd = f.createDelivery('');
            fd.deliverStatus = DeliveryStatus.FailedBadAddress;
            await fd.save();

            let fd2 = f.createDelivery('');
            fd2.deliverStatus = DeliveryStatus.FailedBadAddress;
            await fd2.save();

            expect(+await context.for(ActiveFamilyDeliveries).count(x => x.family.isEqualTo(f.id))).toBe(2);

            let b = new UpdateStatusForDeliveries(context);
            let u = b.orig as UpdateStatus;
            u.status = FamilyStatus.Frozen;
            u.archiveFinshedDeliveries = true;

            await b.internalForTestingCallTheServer({
                count: 1,
                where: x => x.id.isEqualTo(fd.id)
            });

            let fd_after = await context.for(FamilyDeliveries).findId(fd.id);
            expect(fd_after.archive).toBe(true, "fd");
            let fd2_after = await context.for(FamilyDeliveries).findId(fd2.id);
            expect(fd2_after.archive).toBe(true, "fd2");
        });
        itAsync("update status for delivery", async () => {
            let f = await context.for(Families).create();
            f.name = "test";
            await f.save();
            let fd = f.createDelivery('');
            await fd.save();

            expect(+await context.for(ActiveFamilyDeliveries).count(x => x.id.isEqualTo(fd.id))).toBe(1);
            let u = new UpdateDeliveriesStatus(context);

            u.status = DeliveryStatus.Frozen;

            await u.internalForTestingCallTheServer({
                count: 1,
                where: x => x.id.isEqualTo(fd.id)
            });
            let fd_after = await context.for(ActiveFamilyDeliveries).findId(fd.id);
            expect(fd_after.deliverStatus).toBe(DeliveryStatus.Frozen, "fd");

        });
        itAsync("update area for family", async () => {
            let f = await context.for(Families).create();
            f.name = "test";
            await f.save();

            let u = new UpdateArea(context);

            u.area = "north";

            await u.internalForTestingCallTheServer({
                count: 1,
                where: x => x.id.isEqualTo(f.id)
            });
            let fd_after = await context.for(Families).findId(f.id);
            expect(fd_after.area).toBe("north");

        });
        itAsync("update area", async () => {
            let f = await context.for(Families).create();
            f.name = "test";
            await f.save();
            let fd = f.createDelivery('');
            await fd.save();

            let b = new UpdateAreaForDeliveries(context);
            let u = b.orig as UpdateArea;
            u.area = 'north';


            await b.internalForTestingCallTheServer({
                count: 1,
                where: x => x.id.isEqualTo(fd.id)
            });

            let fd_after = await context.for(FamilyDeliveries).findId(fd.id);
            expect(fd_after.area).toBe("north", "fd");

        });
        itAsync("test Action Where", async () => {

            let f = await context.for(Families).create();
            f.name = "test";
            await f.save();
            let fd = f.createDelivery('');
            fd.deliverStatus = DeliveryStatus.Success;
            await fd.save();
            var u = new DeleteDeliveries(context);
            await u.internalForTestingCallTheServer({
                count: 0,
                where: x => undefined
            });
            expect(+(await context.for(FamilyDeliveries).count())).toBe(1);
            fd.deliverStatus = DeliveryStatus.ReadyForDelivery;
            await fd.save();
            await u.internalForTestingCallTheServer({
                count: 1,
                where: x => undefined
            });
            expect(+(await context.for(FamilyDeliveries).count())).toBe(0);

        });
        itAsync("test delete only works for user dist center", async () => {
            let f = await context.for(Families).create();
            f.name = "test";
            await f.save();
            await f.createDelivery('a').save();
            await f.createDelivery('a').save();
            await f.createDelivery('b').save();
            let c2 = new ServerContext();
            c2.setUser({
                id: 'distCenterAdmin',
                name: 'distCenterAdmin',
                distributionCenter: 'b',
                escortedHelperName: undefined,
                theHelperIAmEscortingId: undefined,
                roles: [Roles.distCenterAdmin]
            } as HelperUserInfo);
            c2.setDataProvider(sql);
            expect(+(await context.for(ActiveFamilyDeliveries).count())).toBe(3);
            var u = new DeleteDeliveries(c2);
            await u.internalForTestingCallTheServer({
                count: 1,
                where: x => undefined
            });
            expect(+(await context.for(ActiveFamilyDeliveries).count())).toBe(2);
        });
        itAsync("archive helper is serialized ok", async () => {

            let x = new ArchiveDeliveries(context);
            expect("wrong").toBe("right");
            //expect([...getControllerDefs(x).columns].includes(getControllerDefs( x.archiveHelper).columns.markOnTheWayAsDelivered)).toBe(true);
            
        });
    });
}
init();

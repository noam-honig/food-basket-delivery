import { actionInfo, myServerAction, ServerContext, ServerFunction, SqlDatabase } from "@remult/core";
import "jasmine";
import { AsignFamilyComponent } from "./app/asign-family/asign-family.component";
import { Roles } from "./app/auth/roles";
import { Families } from "./app/families/families";
import { ActiveFamilyDeliveries } from "./app/families/FamilyDeliveries";
import { Helpers } from "./app/helpers/helpers";
import { ApplicationSettings } from "./app/manage/ApplicationSettings";
import { serverInit } from "./app/server/serverInit";
import { GeocodeInformation } from "./app/shared/googleApiHelpers";
import { itAsync } from "./app/shared/test-helper";
import { Sites } from "./app/sites/sites";

async function init() {
    let context = new ServerContext();
    context._setUser({
        id: 'admin',
        name: 'admin',
        roles: [Roles.admin]
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

    describe("the test", () => {
        let helperId: string;
        beforeEach(async done => {
            for (const d of await context.for(ActiveFamilyDeliveries).find()) {
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
                as.addressApiResult.value = g.saveToString();
                await as.save();
            }
            let h = context.for(Helpers).create();
            h.name.value = 'a';
            h._disableOnSavingRow =true;
            await h.save();
            helperId = h.id.value;
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
                helperId: helperId,
                numOfBaskets: 1,
                preferRepeatFamilies: false
            }, context, sql);
        }
        async function createDelivery(distanceFromRoot: number) {
            let d = context.for(ActiveFamilyDeliveries).create();
            d.name.value = distanceFromRoot.toString();
            d.addressLatitude.value = distanceFromRoot;
            await d.save();
            return d;
        }

        itAsync("Starts with farthest delivery", async () => {
            await createDelivery(10);
            await createDelivery(5);
            let d = await createDelivery(6);
            let r = await callAddBox();
            expect(r.families.length).toBe(1);
            expect(r.families[0].name).toBe("10");
        });
        itAsync("chooses closest to previous delivery", async () => {

            await createDelivery(10);
            await createDelivery(5);
            let d = await createDelivery(6);
            d.courier.value = helperId;
            await d.save();
            let r = await callAddBox();
            expect(r.families.length).toBe(2);
            expect(r.families.some(d => d.name == '6')).toBeTruthy();;
            expect(r.families.some(d => d.name == '5')).toBeTruthy();
        });
    });
}
init();
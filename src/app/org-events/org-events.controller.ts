import { Event, EventType } from '../events/events';

import { BackendMethod, remult } from 'remult';
import { EventInList, eventStatus } from '../events/events';
import { Helpers, HelpersBase } from '../helpers/helpers';
import { Phone } from '../model-shared/phone';
import { Sites } from '../sites/sites';
import { createSiteContext } from '../helpers/init-context';
import { setSettingsForSite, settingsForSite, SmallAdressHelper, SmallSettings } from '../manage/ApplicationSettings';
import { getDb, SqlBuilder, SqlFor } from '../model-shared/SqlBuilder';
import { VolunteerNeedType } from '../manage/VolunteerNeedType';



export class OrgEventsController {
    @BackendMethod({ allowed: true })
    static async getAllEvents(phone: string, sitesFilter: string): Promise<EventInList[]> {
        let r: EventInList[] = [];
        let sql = new SqlBuilder();
        let e = SqlFor(remult.repo(Event));
        let schemas = Sites.schemas;
        if (sitesFilter) {
            let x = sitesFilter.split(',');
            if (x.length > 0)
                schemas = x;
        }
        let query = '';
        for (const org of schemas) {
            const s = settingsForSite.get(org);
            if (s) {
                if (s.volunteerNeedStatus.includeInList)
                    r.push(OrgEventsController.createOrgEvent(s, org));
                if (query != '')
                    query += ' union all ';
                query += await sql.build('select ', ["'" + org + "' site"], ' from ', org + '.' + await e.metadata.getDbName(),
                    " where ", [e.where({ eventStatus: eventStatus.active, eventDate: { ">=": new Date() } })]);
            }
        }
        let sites = (await getDb().execute(' select distinct site from (' + query + ') x')).rows.map(x => x.site);

        for (const org of sites) {

            await createSiteContext(org);

            let settings = await remult.context.getSettings();
            setSettingsForSite(org, settings);


            if (!settings.donotShowEventsInGeneralList && !settings.forWho.args.leftToRight) {
                let items = await OrgEventsController.getEvents(phone, '');
                r.push(...items.map(i => ({ ...i, site: org })));
            }

        }
        return r;
    }

    static createOrgEvent(s: {
        addressHelper: SmallAdressHelper,
        descriptionInOrganizationList: string,
        logoUrl: string,
        organisationName: string,
        phoneInOrganizationList: string,
        phoneInOrganizationListDisplay: string,
        volunteerNeedStatus: VolunteerNeedType
    }, org: string): EventInList {

        return {
            city: s.addressHelper.getCity,
            description: s.descriptionInOrganizationList,
            endTime: '',
            eventDateJson: s.volunteerNeedStatus.jsonDate,
            id: org,
            eventLogo: s.logoUrl,
            location: s.addressHelper.location,
            longLat: s.addressHelper.getlonglat,
            name: s.organisationName,
            orgName: '',
            registeredToEvent: false,
            registeredVolunteers: 0,
            requiredVolunteers: 0,
            startTime: '',
            theAddress: s.addressHelper.getAddress,
            thePhone: s.phoneInOrganizationList,
            thePhoneDescription: '',
            thePhoneDisplay: s.phoneInOrganizationListDisplay,
            type: EventType.other,
            site: org
        };
    }

    @BackendMethod({ allowed: true })
    static async getEvents(phone: string, specificUrl?: string): Promise<EventInList[]> {

        if (!specificUrl)
            specificUrl = '';
        let helper: HelpersBase = (await remult.context.getCurrentUser());
        if (!helper && phone)
            helper = await remult.repo(Helpers).findFirst({ phone: new Phone(phone) });
        return Promise.all((await remult.repo(Event).find({
            orderBy: { eventDate: "asc", startTime: "asc" },
            where: { eventStatus: eventStatus.active, eventDate: { ">=": new Date() }, specificUrl }
        })).map(async e => await e.toEventInList(helper)));
    }
}
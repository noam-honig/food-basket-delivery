import { DeliveryStatus } from "../families/DeliveryStatus";
import { NumberColumn, StringColumn } from 'radweb';
import { evilStatics } from '../auth/evil-statics';
import { HelperId, Helpers } from '../helpers/helpers';
import { IdEntity, changeDate, DateTimeColumn, buildSql } from '../model-shared/types';
import { Families } from "../families/families";

import { Context, ServerContext } from "../shared/context";



let f = new Families(new ServerContext({}));
let h = new Helpers(new ServerContext({}));
let fromFamilies = () => buildSql(' from ', f,
    ' where ', f.courier, ' = ', h, '.', h.id);

let fromFamiliesWithCourierAndStatus = (s: DeliveryStatus) => buildSql(fromFamilies(), ' and ', f.deliverStatus, ' = ', s.id);

let fromFamiliesWithCourierAndReady = () => fromFamiliesWithCourierAndStatus(DeliveryStatus.ReadyForDelivery);

function log(s: string) {
    console.log(s);
    return s;
}

export class HelpersAndStats extends IdEntity<HelperId> {
    name = new StringColumn({
        caption: "שם",
        onValidate: v => {
            if (!v.value || v.value.length < 3)
                this.name.error = 'השם קצר מידי';
        }
    });
    phone = new StringColumn({ caption: "טלפון", inputType: 'tel' });
    smsDate = new changeDate('מועד משלוח SMS');
    reminderSmsDate = new changeDate('מועד משלוח תזכורת SMS');
    deliveriesInProgress = new NumberColumn({
        dbReadOnly: true,
        caption: 'משפחות מחכות'
    });
    allFamilies = new NumberColumn({
        dbReadOnly: true,
        caption: 'משפחות'
    });
    deliveriesWithProblems = new NumberColumn({
        dbReadOnly: true,
        caption: 'משפחות עם בעיות'
    });
    firstDeliveryInProgressDate = new DateTimeColumn({
        dbReadOnly: true
    });
    constructor(context: Context) {
        super(new HelperId(context), HelpersAndStats, {
            name: "helpersAndStats",
            apiReadOnly: context.isAdmin(),
            dbName: buildSql('(select ', [
                h.id,
                h.name,
                h.phone,
                h.smsDate,
                h.reminderSmsDate,
                buildSql('(select count(*) ', fromFamiliesWithCourierAndReady(), ') deliveriesInProgress'),
                buildSql('(select count(*) ', fromFamilies(), ') allFamilies'),
                buildSql('(select count(*) ', buildSql(fromFamilies(), ' and ', f.deliverStatus, ' in (', [
                    DeliveryStatus.FailedBadAddress.id,
                    DeliveryStatus.FailedNotHome.id,
                    DeliveryStatus.FailedOther.id
                ], ')'), ') deliveriesWithProblems'),
                buildSql('(select min(', f.courierAssingTime, ') ', fromFamiliesWithCourierAndReady(), ') firstDeliveryInProgressDate')
            ], ' from ', h, ') x')
        });
        this.initColumns();
    }
}
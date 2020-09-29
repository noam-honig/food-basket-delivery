import { TestBed, async, inject } from '@angular/core/testing';

import { ServerContext, InMemoryDataProvider, JwtSessionManager, myServerAction, actionInfo, WebSqlDataProvider, SqlDatabase } from '@remult/core';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { Roles } from '../auth/roles';
import { AsignFamilyComponent } from './asign-family.component';
import { Helpers } from '../helpers/helpers';
import { itAsync } from '../shared/test-helper';




describe('assign item', () => {
    let x = new WebSqlDataProvider("test");
    let sql = new SqlDatabase(x);
    let context = new ServerContext(sql);
    context._setUser({
        id: 'a',
        name: 'a',
        roles: [Roles.admin]
    });
    itAsync("testing basics", async () => {
        let h = context.for(Helpers).create();
        h.name.value = 'a';
        await h.save();
        let helperId = h.id.value;;


        let d = context.for(ActiveFamilyDeliveries).create();
        d.name.value = "1";
        //throw 'err';
        await d.save();


        /*
        let r = await AsignFamilyComponent.AddBox({
            allRepeat: false,
            area: undefined,
            basketType: undefined,
            city: undefined,
            distCenter: undefined,
            group: undefined,
            helperId: helperId,
            numOfBaskets: 1,
            preferRepeatFamilies: false
        }, context, sql);
        expect(r.families.length).toBe(2);*/
    });
});
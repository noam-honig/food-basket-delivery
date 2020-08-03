import { TestBed, async, inject } from '@angular/core/testing';
import { ServerContext, InMemoryDataProvider, JwtSessionManager, myServerAction, actionInfo } from '@remult/core';
import { Helpers } from '../helpers/helpers';
import { Roles } from './roles';
import { AuthService } from './auth-service';
import { JWTCookieAuthorizationHelper } from '@remult/server/jwt-cookie-authoerization-helper';



const PHONE = '0507330590';

describe('users and security', () => {
    Helpers.passwordHelper = {
        generateHash: x => x,
        verify: (a, b) => a == b
    };
    Helpers.helper = new JWTCookieAuthorizationHelper({
        addAllowedHeader: (x) => { },
        addRequestProcessor: (a) => { }
    }, "asdfasdfsa");
    actionInfo.runningOnServer = true;
    it("user can only update their own info", async(async () => {
        let { c, context } = await getHelperContext();
        let h = await c.findFirst();
        h.name.value = '123';
        await expectFail(() => h.save());
        context._setUser({
            id: 'stam',
            name: 'stam',
            roles: []
        });
        await expectFail(() => h.save());
        context._setUser({
            id: h.id.value,
            name: 'stam',
            roles: []
        });
        await h.save();
        h = await c.findFirst();
        expect(h.name.value).toBe('123');
    }));
    it("admin can update anyone", async(async () => {
        let { c, context } = await getHelperContext();
        let h = await c.findFirst();
        h.name.value = '123';
        context._setUser({
            id: 'stam',
            name: 'stam',
            roles: [Roles.admin]
        });
        await h.save();
        expect(h.name.value).toBe('123');
    }));
    it("admin can only be updated with admin privilege", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.admin.value = true; h.password.value = '123' }
        });
        let h = await c.findFirst();
        h.password.value = '456';
        context._setUser({
            id: h.id.value,
            name: 'stam',
            roles: []
        });
        await expectFail(() => h.save());
        context._setUser({
            id: h.id.value,
            name: 'stam',
            roles: [Roles.admin]
        });
        await h.save();
    }));
    it("test login", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: ''
        }, context);
        if (!r.authToken) {
            throw 'should have worked';
        }
        let jwt = new JwtSessionManager(context);
        jwt.setToken(r.authToken);
        expect(context.user.name).toBe('test');
    }));
    it("test login for admin without a password", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.admin.value = true; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: ''
        }, context);
        expect(r.authToken).toBe(undefined);
        expect(r.requiredToSetPassword).toBe(true);
    }));
    it("test login  with invalid password", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.password.value = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: '456'
        }, context);
        expect(r.authToken).toBe(undefined);
        expect(r.invalidPassword).toBe(true);
    }));
    it("test login  with valid password", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.password.value = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: '123'
        }, context);
        if (!r.authToken) {
            throw 'should have worked';
        }
    }));
    it("change password to same password should fail", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.password.value = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '123',
            password: '123'
        }, context);
        expect(r.authToken).toBe(undefined);
        expect(r.requiredToSetPassword).toBe(true);
    }));
    it("change password should work", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.password.value = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '456',
            password: '123'
        }, context);
        if (!r.authToken) {
            throw r;
        }
    }));
    it("signin from sms and renewLease should stay with no privliges or even fail", async(async () => {
        let { c, context } = await getHelperContext({
            setValues: h => { h.password.value = '123'; h.admin.value = true; h.shortUrlKey.value = '1234567890' }
        });

        let r = await AuthService.loginFromSms('1234567890', context);
        if (!r.authToken) {
            throw r;
        }
        let jwt = new JwtSessionManager(context);
        jwt.setToken(r.authToken);
        expect(context.user.name).toBe('test');
        expect(context.isAllowed(Roles.admin)).toBe(false);
        let r2 = await AuthService.renewToken(context);
        jwt.setToken(r2);
        expect(context.user.name).toBe('test');
        expect(context.isAllowed(Roles.admin)).toBe(false);
    }));
});
async function getHelperContext(args?: { setValues?: (h: Helpers) => void }) {
    if (!args) {
        args = {};
    }
    let mem = new InMemoryDataProvider();
    var context = new ServerContext(mem);
    let c = context.for(Helpers);
    let h = c.create();
    h.name.value = 'test';
    h.phone.value = PHONE;
    h.realStoredPassword.value = '';
    if (args.setValues)
        args.setValues(h);
    let disableAdmin = true;
    if (h.admin.value)
        disableAdmin = false;
    await h.save();
    if (disableAdmin)
        mem.rows[h.defs.name][0].admin = false;// because by default the first user is admin, and we don't want that for tests
    return { c, context };
}

async function expectFail(x: () => Promise<any>) {
    let ok = true;
    try {
        await x();
        ok = false;
    }
    catch {

    }
    if (!ok)
        throw "expected an error";
}


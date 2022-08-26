import { TestBed, async, inject } from '@angular/core/testing';
import { Remult, InMemoryDataProvider, } from 'remult';

import { Helpers, HelpersBase } from '../helpers/helpers';
import { Roles } from './roles';
import { AuthService, TokenService } from './auth-service';
import { Phone } from "../model-shared/phone";
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { actionInfo } from 'remult/src/server-action';
import { initConfig, InitContext } from '../helpers/init-context';




const PHONE = '0507330590';
process.env.TOKEN_SIGN_KEY = '1234';
Helpers.generateHash = async password => {
    return password;
};
Helpers.verifyHash = async (a, b) => {
    return a == b
};
AuthService.signJwt = async (x) => JSON.stringify(x);
AuthService.decodeJwt = async x => JSON.parse(x);

describe('users and security', () => {
    initConfig.disableForTesting = true;
    actionInfo.runningOnServer = true;
    it("user can only update their own info", async(async () => {
        let { c, remult } = await getHelperContext();
        let h2 = await c.create({ id: 'stam', name: 'stam', admin: false, phone: new Phone("123") }).save();
        let h = await c.findFirst();
        h.name = '123';
        await expectFail(() => h.save());
        remult.user = ({
            id: h2.id,
            name: 'stam',
            roles: []
        });

        await expectFail(() => h.save());
        remult.user = ({
            id: h.id,
            name: 'stam',
            roles: []
        });
        await h.save();
        h = await c.findFirst();
        expect(h.name).toBe('123');
    }));
    it("admin can update anyone", async(async () => {
        let { c, remult } = await getHelperContext();
        let h2 = await c.create({ id: 'stam', name: 'stam', admin: true, phone: new Phone("123") }).save();
        let h = await c.findFirst();
        h.name = '123';
        remult.user = ({
            id: h2.id,
            name: 'stam',
            roles: [Roles.admin]
        });
        await h.save();
        expect(h.name).toBe('123');
    }));
    it("admin can only be updated with admin privilege", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.admin = true; h.password = '123' }
        });
        let h = await c.findFirst();
        h.password = '456';
        remult.user = ({
            id: h.id,
            name: 'stam',
            roles: []
        });
        await expectFail(() => h.save());
        remult.user = ({
            id: h.id,
            name: 'stam',
            roles: [Roles.admin]
        });
        await h.save();
    }));
    it("test login", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: ''
        }, remult);
        if (!r.authToken) {
            throw 'should have worked';
        }
        let jwt = getAuthService(remult);
        jwt.setToken(r.authToken, false);
        expect(remult.user.name).toBe('test');
    }));
    it("test login for admin without a password", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.admin = true; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: ''
        }, remult);
        expect(r.authToken).toBe(undefined);
        expect(r.requiredToSetPassword).toBe(true);
    }));
    it("test login  with invalid password", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: '456'
        }, remult);
        expect(r.authToken).toBe(undefined);
        expect(r.invalidPassword).toBe(true);
    }));
    it("test login  with valid password", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '',
            password: '123'
        }, remult);
        if (!r.authToken) {
            throw 'should have worked';
        }
    }));
    it("change password to same password should fail", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '123',
            password: '123'
        }, remult);
        expect(r.authToken).toBe(undefined);
        expect(r.requiredToSetPassword).toBe(true);
    }));
    it("change password should work", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; }
        });

        let r = await AuthService.login({
            phone: PHONE,
            EULASigned: false,
            newPassword: '456',
            password: '123'
        }, remult);
        if (!r.authToken) {
            throw r;
        }
    }));
    it("sign in from sms and renewLease should stay with no privileges or even fail", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; h.admin = true; h.shortUrlKey = '1234567890' }
        });

        let r = await AuthService.loginFromSms('1234567890', remult);
        expect(r.valid).toBe(false);

    }));
    it("sign in from sms, for a user with a password or with privliges, should move to login screen", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; h.admin = true; h.shortUrlKey = '1234567890' }
        });
        let r = await AuthService.loginFromSms('1234567890', remult);
        expect(r.valid).toBe(false);
    }));
    it("helper can sign in from sms", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.admin = false; h.shortUrlKey = '1234567890' }
        });
        let r = await AuthService.loginFromSms('1234567890', remult);
        expect(r.valid).toBe(true);
    }));
    it("helper with password cannot sign in from sms", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; h.admin = false; h.shortUrlKey = '1234567890' }
        });
        let r = await AuthService.loginFromSms('1234567890', remult);
        expect(r.valid).toBe(false);
    }));
    it("signed in user should sign in ok", async(async () => {
        let { c, remult } = await getHelperContext({
            setValues: h => { h.password = '123'; h.admin = true; h.shortUrlKey = '1234567890' }
        });
        let l = await AuthService.login({
            phone: PHONE,
            password: '123',
            EULASigned: true,
            newPassword: ''
        }, remult);
        if (!l.authToken)
            throw l;
        let jwt = getAuthService(remult);
        jwt.setToken(l.authToken, false);
        let r = await AuthService.loginFromSms('1234567890', remult);
        expect(r.valid).toBe(true);
    }));
});
function getAuthService(remult: Remult) {
    var s = new ApplicationSettings(remult);
    s.currentUserIsValidForAppLoadTest = true;
    let jwt = new TokenService(remult);
    return jwt;
}

async function getHelperContext(args?: { setValues?: (h: Helpers) => void }) {
    if (!args) {
        args = {};
    }
    let mem = new InMemoryDataProvider();
    var remult = new Remult();
    remult.dataProvider = (mem);
    await remult.userChange.observe(async () => InitContext(remult));
    let c =  remult.repo(Helpers);
    let h = c.create();
    h.name = 'test';
    h.phone = new Phone(PHONE);
    h.realStoredPassword = '';
    if (args.setValues)
        args.setValues(h);
    let disableAdmin = true;
    if (h.admin)
        disableAdmin = false;
    await h.save();
    if (disableAdmin)
        mem.rows[h._.repository.metadata.key][0].admin = false;// because by default the first user is admin, and we don't want that for tests
    return { c, remult };
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


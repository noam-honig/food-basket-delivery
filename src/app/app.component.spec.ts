import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import '../app/manage/ApplicationSettings';


import { IdEntity, Remult } from 'remult';

import { SqlBuilder, QueryBuilder, SqlFor, SqlDefs } from "./model-shared/SqlBuilder";
import { Phone, isPhoneValidForIsrael } from "./model-shared/phone";
import { WebDriverProxy } from 'blocking-proxy/built/lib/webdriver_proxy';
import { fixPhone, processPhone, phoneResult, parseAndUpdatePhone } from './import-from-excel/import-from-excel.component';
import { ActiveFamilyDeliveries, FamilyDeliveries } from './families/FamilyDeliveries';
import { validSchemaName } from './sites/sites';
import { MergeFamiliesComponent } from './merge-families/merge-families.component';
import { FamilyStatus } from './families/FamilyStatus';
import { parseAddress, Families, parseUrlInAddress } from './families/families';
import { BasketType } from './families/BasketType';
import { fitAsync, itAsync } from './shared/test-helper';
import { Helpers } from './helpers/helpers';
import { RegisterURL, urlDbOperator } from './resgister-url/regsiter-url';
import { initConfig } from './helpers/init-context';
import { eventDisplayDate, EventInList } from './events/events';

describe('AppComponent', () => {
  initConfig.disableForTesting = true;
  var remult = new Remult();
  var bt: SqlDefs<BasketType>;
  var f: SqlDefs<Families>;
  let afd: SqlDefs<ActiveFamilyDeliveries>;
  let fd: SqlDefs<FamilyDeliveries>;
  var sql = new SqlBuilder();
  beforeEach(async () => {
    sql = new SqlBuilder();
    f = SqlFor(remult.repo(Families));
    afd = SqlFor(remult.repo(ActiveFamilyDeliveries));
    fd = SqlFor(remult.repo(FamilyDeliveries));
    bt = SqlFor(remult.repo(BasketType));
    sql.addEntity(bt, 'p');
    sql.addEntity(afd, 'fd');
    sql.addEntity(fd, 'h');

  });


  var q = async (query: QueryBuilder, expectedResult: String) => {
    expect(await sql.query(query)).toBe(expectedResult);
  };

  it('test q', async () => {
    expect(
      await sql.query({
        select: () => [f.id], from: f, where: async () => [f.where({ status: { "!=": FamilyStatus.ToDelete } }),
        sql.build(f.id, ' in (', await sql.query({ select: () => [afd.family], from: afd }), ')')]
      })).toBe("select e1.id from Families e1 where status <> 98 and e1.id in (select fd.family from FamilyDeliveries fd where archive = false)");

  });
  it("test custom filter", async () => {
    expect(await sql.build(fd.where(FamilyDeliveries.onTheWayFilter()))).toBe("deliverStatus = 0 and courier <> ''");
  });
  it("test build", async () => {
    expect(await sql.build("a", f.id)).toBe("aid");
  });
  it("test build", async () => {
    expect(await sql.max(f.id)).toBe("max(id)");
  });
  it("test build", async () => {
    expect(await sql.func('max', f.id)).toBe("max(id)");
  });
  it("test bla bla", async () => {
    let h = SqlFor(remult.repo(Helpers));
    let u = SqlFor(remult.repo(RegisterURL));
    let sql = new SqlBuilder();
    let urls = [];


    let q = await sql.query({
      select: async () => [sql.build('distinct ', urlDbOperator(await h.referredBy.getDbName()), ' as url')],
      from: h,
      outerJoin: () => [{ to: u, on: () => [sql.build(h, ' like textcat(textcat(\'%\',', u.URL, '),\'%\')')] }],
      where: () => [sql.build(u.URL, ' is null')]
    })
    expect(q).toBe("select distinct split_part(referredBy, '/', 3) as url from Helpers e1 left outer join RegisterURL e2 on Helpers like textcat(textcat('%',e2.URL),'%') where e2.URL is null");


  })

  it("select with promise", async () => {
    expect(await sql.query({
      from: f,
      select: () => [new Promise(res => setTimeout(() => {
        res(f.id)
      }, 5))]
    })).toBe("select e1.id from Families e1");

  });
  it("select with promise", async () => {
    expect(await sql.query({
      from: f,
      select: () => [sql.max(f.id)]
    })).toBe("select max(e1.id) from Families e1");

  });
  it('basics work', async () => {
    expect(await sql.build(bt.id)).toBe('p.id');
  });
  it('select start', () => {
    q({
      select: () => [bt.id],
      from: bt,
      orderBy: [bt.id]
    }, 'select p.id from BasketType p order by p.id');
  });
  it('fixed filter', () => {

    q({
      select: () => [afd.id],
      from: afd
    }, 'select fd.id from FamilyDeliveries fd where archive = false');
  });
  it('fixed filter 2', async () => {
    expect(await sql.columnInnerSelect(afd, {
      select: async () => [await sql.columnWithAlias(afd.deliverStatus, 's')],
      from: afd,

      where: () => [sql.eq(afd.family, '123'),
      ],
      orderBy: [{ field: afd.deliveryStatusDate, isDescending: true }]
    })).toBe('(select FamilyDeliveries.deliverStatus s from FamilyDeliveries FamilyDeliveries where FamilyDeliveries.family = 123 and archive = false order by FamilyDeliveries.deliveryStatusDate desc limit 1)');
  });
  it('fixed filter 3', async () => {
    expect(await sql.columnInnerSelect(fd, {
      select: async () => [await sql.columnWithAlias(fd.deliverStatus, 's')],
      from: fd,

      where: () => [sql.eq(fd.family, '123'),
      ],
      orderBy: [{ field: fd.deliveryStatusDate, isDescending: true }]
    })).toBe('(select FamilyDeliveries.deliverStatus s from FamilyDeliveries FamilyDeliveries where FamilyDeliveries.family = 123 order by FamilyDeliveries.deliveryStatusDate desc limit 1)');
  });
  it('Where', () => {
    q({
      select: () => [bt.id],
      from: bt,
      where: () => [sql.eq(bt.boxes, 5)]
    }, 'select p.id from BasketType p where p.boxes = 5');
  });
  it('Where', () => {
    let b = remult.repo(BasketType).create({ id: '11', name: 'basket' });

    return q({
      select: () => [fd.id],
      from: fd,
      where: () => [fd.where({ basketType: b })]
    }, "select h.id from FamilyDeliveries h where basketType = '11'");
  });
  it('another where', async () => {
    let b = remult.repo(BasketType).create({ id: '11', name: 'basket' });
    expect(await sql.build(fd.where({ basketType: b }))).toBe("basketType = '11'")

  });
  it('group By', () => {
    q({
      select: () => [bt.id],
      from: bt,
      groupBy: () => [bt.id],
      having: () => ['count(*)>1'],
      where: () => [sql.eq(bt.boxes, 5)]
    }, 'select p.id from BasketType p where p.boxes = 5 group by p.id having count(*)>1');
  });
  it('Where 2', () => {
    q({
      select: () => [bt.id],
      from: bt,
      where: () => [sql.eq(bt.boxes, 5), sql.eq(bt.boxes, 6)]
    }, 'select p.id from BasketType p where p.boxes = 5 and p.boxes = 6');
  });
  it('Join', () => {
    q({
      select: () => [bt.id],
      from: bt,
      innerJoin: () => [{ to: f, on: () => [sql.eq(f.basketType, bt.id)] }]
    }, 'select p.id from BasketType p left join Families e1 on e1.basketType = p.id');

  });
  it('Join1', () => {
    q({
      select: () => [bt.id],
      from: bt,
      innerJoin: async () => [{ to: f, on: async () => [sql.build(await f.basketType.getDbName(), ' = ', bt.id)] }]
    }, 'select p.id from BasketType p left join Families e1 on basketType = p.id');

  });
  it('select multiple Order By', () => {
    q({
      select: () => [bt.id],
      from: bt,
      orderBy: [bt.id, { field: bt.name, isDescending: true }]
    }, 'select p.id from BasketType p order by p.id, p.name desc');
  });
  it("column dbname can reference root entity", async () => {
    let sql = new SqlBuilder();
    expect(await sql.columnSumInnerSelect(bt, f.familyMembers, {
      from: f,
      where: () => [sql.eq(f.basketType, bt.id)]

    })).toBe('(select sum(e1.familyMembers) from Families e1 where e1.basketType = BasketType.id)');
  });
  it("case ", async () => {
    expect(await sql.case([
      { when: ['1=1', '2=2'], then: '3' },
      { when: ['3=3'], then: '4' }
    ], 9)).toBe("case when 1=1 and 2=2 then 3 when 3=3 then 4 else 9 end");
  });
  it('delete 2', async () => {
    let p = SqlFor(remult.repo(BasketType));
    expect(await sql.delete(p, sql.eq(p.boxes, 5), sql.eq(p.boxes, 6))).toBe('delete from BasketType where boxes = 5 and boxes = 6');
  });
  it('update ', async () => {
    expect(await sql.update(bt, {
      set: () => [[bt.id, "'123'"], [bt.name, "'noam'"]],
      where: () => [sql.eq(bt.boxes, 5), sql.eq(bt.boxes, 6)]
    })).toBe("update BasketType p set id = '123', name = 'noam' where p.boxes = 5 and p.boxes = 6");
  });
  it('update 2 ', async () => {
    sql.getEntityAlias(f);
    let pd = SqlFor(remult.repo(Families));
    expect(await sql.update(bt, {
      set: () => [[bt.id, pd.basketType], [bt.name, "'noam'"]],
      from: pd,
      where: () => [sql.eq(bt.boxes, 5), sql.eq(bt.boxes, pd.familyMembers)]
    })).toBe("update BasketType p set id = e2.basketType, name = 'noam' from Families e2 where p.boxes = 5 and p.boxes = e2.familyMembers");
  });
  it('insert ', async () => {
    sql = new SqlBuilder();

    expect(await sql.insert({
      into: bt,
      set: () => [[bt.id, f.id], [bt.name, "'noam'"]],
      from: f,
      where: () => [sql.eq(f.familyMembers, 5)]
    })).toBe("insert into BasketType (id, name) select e1.id, 'noam' from Families e1 where e1.familyMembers = 5");
  });
  it('filter ', async () => {
    expect(await sql.build(bt.where({ boxes: 3, $and: [{ boxes: 5 }] }))).toBe('boxes = 3 and boxes = 5');
  });
  it('parse address', () => {
    let r = parseAddress("שנהב 4 דירה 76 קומה 19 כניסה א'");
    expect(r.address).toBe('שנהב 4');
    expect(r.dira).toBe('76');
    expect(r.floor).toBe('19');
    expect(r.knisa).toBe("א'");
  });
  it('parse address2', () => {
    let r = parseAddress("שנהב 4/76 רמת גן");
    expect(r.address).toBe('שנהב 4 רמת גן');
    expect(r.dira).toBe('76');

  });
  it('parse address3', () => {
    let r = parseAddress("שנהב 4/76, רמת גן");
    expect(r.address).toBe('שנהב 4, רמת גן');
    expect(r.dira).toBe('76');

  });
  it('parse address4', () => {
    let r = parseAddress("הבדיקה 5/3, קומה ב' דלת משמאל");
    expect(r.dira).toBe('3');

  });
  it("test phones", () => {
    expect(fixPhone("0507330590", "03")).toBe("0507330590");
    expect(fixPhone("507330590", "03")).toBe("0507330590");
    expect(fixPhone("036733059", "03")).toBe("036733059");
    expect(fixPhone("36733059", "03")).toBe("036733059");
    expect(fixPhone("6733059", "03")).toBe("036733059");
    expect(fixPhone("733059", "03")).toBe("733059");
    expect(fixPhone("o507330590", "03")).toBe("0507330590");
    expect(fixPhone("O507330590", "03")).toBe("0507330590");
    expect(fixPhone("ox07330590", "03")).toBe("ox07330590");
    expect(fixPhone("+972507330590", "")).toBe("+972507330590");

  });
  it("test address parser", () => {
    expect(parseUrlInAddress("https://maps.google.com/maps?q=32.53666305541992%2C34.905311584472656&z=17&hl=en")).toBe("32.53666305541992,34.905311584472656");
    expect(parseUrlInAddress("https://www.google.com/maps/place/32%C2%B032'12.0%22N+34%C2%B054'19.1%22E/@32.5366631,34.9031229,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d32.5366631!4d34.9053116?hl=en")).toBe("32.5366631,34.9053116");
    expect(parseUrlInAddress("https://www.google.com/maps/place/32%C2%B032'01.9%22N+34%C2%B054'14.3%22E/@32.5338692,34.9055186,17z/data=!3m1!4b1!4m14!1m7!3m6!1s0x0:0x0!2zMzLCsDMyJzEyLjYiTiAzNMKwNTQnMjAuMiJF!3b1!8m2!3d32.5368337!4d34.9056189!3m5!1s0x0:0x0!7e2!8m2!3d32.533866!4d34.9039709?hl=iw")).toBe("32.533866,34.9039709");

    expect(parseUrlInAddress(`מיקום:32.267417990635636,34.878578873069586דיוק: 20.679268441942863`)).toBe('32.267417990635636,34.878578873069586')
    expect(parseUrlInAddress('32.267417990635636,34.878578873069586')).toBe('32.267418,34.878579')
    expect(parseUrlInAddress("נועם")).toBe("נועם");

  });
  it("format phone", () => {

    expect(Phone.formatPhone("214,391,757")).toBe("021-439-1757");
  });
  it("fix phone input", () => {

    expect(Phone.fixPhoneInput("+972507330590", remult)).toBe("+972507330590");
  });
  it("test schema name", () => {
    expect(validSchemaName("abc")).toBe("abc");
    expect(validSchemaName("1abc")).toBe("abc");
    expect(validSchemaName("abc#")).toBe("abc");
    expect(validSchemaName("a#b#c#")).toBe("abc");
    expect(validSchemaName("ABC")).toBe("abc");
    expect(validSchemaName("abc1")).toBe("abc1");
    expect(validSchemaName("abc-")).toBe("abc");
  });
  let testPhone = (phone: string, results: phoneResult[]) => {
    it(phone, () => {
      let r = processPhone(phone);
      expect(r.length).toBe(results.length, r);
      if (r.length == results.length) {
        for (let i = 0; i < r.length; i++) {
          const p = r[i];
          expect(p.phone).toBe(results[i].phone, 'phone ' + i);
          expect(p.comment).toBe(results[i].comment, 'comment ' + i);
        }
      }
    });
  }
  testPhone("o532777561", [{ phone: '0532777561', comment: '' }]);
  testPhone("050-7330590 (noam)", [{ phone: '050-7330590', comment: '(noam)' }]);
  testPhone("0532777561 // 0532777561", [{ phone: '0532777561', comment: '' }, { phone: '0532777561', comment: '' }]);
  testPhone("04-8767772 / 050-7467774 (לריסה)", [{ phone: '04-8767772', comment: '' }, { phone: '050-7467774', comment: '(לריסה)' }]);
  testPhone("  03-1234567   ", [{ phone: '03-1234567', comment: '' }]);
  testPhone("0 52-727-7773", [{ phone: '052-727-7773', comment: '' }]);
  testPhone('‎050-7277770‏', [{ phone: '050-7277770', comment: '‎ ‏' }]);
  testPhone('0533377277- אלי אחיו של יעקב', [{ phone: '0533377277', comment: 'אלי אחיו של יעקב' }]);
  testPhone("+772 57-777-7572", [{ phone: '+77257-777-7572', comment: '' }]);
  testPhone("0537777237 או 057-7227322(של שותף)", [{ phone: '0537777237', comment: 'או' }, { phone: '057-7227322', comment: '(של שותף)' }]);
  testPhone("טלפון איש קשר 0523773707 אורלי", [{ phone: '0523773707', comment: 'טלפון איש קשר אורלי' }]);
  testPhone("חרשים -הבן יוסף 057-5773777-    03-7377772", [{ comment: 'חרשים-הבן יוסף', phone: '057-5773777' }, { phone: '03-7377772', comment: '' }]);
  testPhone("אמא רויטל 057-2225337", [{ phone: '057-2225337', comment: 'אמא רויטל' }]);
  testPhone("057 - 5005570", [{ phone: '057-5005570', comment: '' }]);
  testPhone("טלפון של סימי- אחות: 0527323705", [{ phone: "0527323705", comment: 'טלפון של סימי-אחות:' }]);
  testPhone("נהוראי-אבא: 052-7777737", [{ phone: '052-7777737', comment: 'נהוראי-אבא:' }]);
  testPhone("7337777 - 057", [{ phone: '057-7337777', comment: '' }]);
  testPhone("מלכי ישראל 770/77", [{ phone: "מלכי ישראל 770/77", comment: '' }]);
  testPhone("0507330590/1", [{ phone: '0507330590', comment: '' }, { phone: '0507330591', comment: '' }]);
  testPhone("0507330590/81", [{ phone: '0507330590', comment: '' }, { phone: '0507330581', comment: '' }]);
  testPhone("052-737-7703 052-737-7703", [{ phone: '052-737-7703', comment: '' }, { phone: '052-737-7703', comment: '' }]);
  testPhone("7322575 – 057", [{ phone: '057-7322575', comment: '' }]);
  testPhone("050-7330590 | 050-7953019", [{ phone: '050-7330590', comment: '' }, { phone: '050-7953019', comment: '' }]);
  testPhone("0532777561 // 0532777561", [{ phone: '0532777561', comment: '' }, { phone: '0532777561', comment: '' }]);
  testPhone("-6733059", [{ phone: '-6733059', comment: '' }]);

  //testPhone("0507330590 / 1", [{ phone: '0507330590', comment: '' }, { phone: '0507330591', comment: '' }]);
  //testPhone("0507330590 / 81", [{ phone: '0507330590', comment: '' }, { phone: '0507330581', comment: '' }]);
  it("updatePhone", () => {
    let f = remult.repo(Families).create();
    parseAndUpdatePhone("04-8767772 / 050-7467774 (לריסה)", f, '');
    expect(f.phone1.thePhone).toBe('04-8767772');
    expect(f.phone1Description).toBe(undefined);
    expect(f.phone2.thePhone).toBe('050-7467774');
    expect(f.phone2Description).toBe('(לריסה)');
    expect(f.phone3).toBe(undefined);
    expect(f.phone3Description).toBe(undefined);
  });
  it("updatePhone2", () => {
    let f = remult.repo(Families).create();
    f.phone1 = new Phone('0507330590');
    parseAndUpdatePhone("04-8767772 / 050-7467774 (לריסה)", f, '');
    expect(f.phone1.thePhone).toBe('0507330590');
    expect(f.phone2.thePhone).toBe('04-8767772');
    expect(f.phone2Description).toBe(undefined);
    expect(f.phone3.thePhone).toBe('050-7467774');
    expect(f.phone3Description).toBe('(לריסה)');
    expect(f.phone4).toBe(undefined);
    expect(f.phone4Description).toBe(undefined);
  });
  it("updatePhone3", () => {
    let f = remult.repo(Families).create();
    f.phone2 = new Phone('0507330590');
    parseAndUpdatePhone("04-8767772 / 050-7467774 (לריסה)", f, '');
    expect(f.phone1.thePhone).toBe('04-8767772');
    expect(f.phone1Description).toBe(undefined);
    expect(f.phone2.thePhone).toBe('0507330590');
    expect(f.phone3.thePhone).toBe('050-7467774');
    expect(f.phone3Description).toBe('(לריסה)');
    expect(f.phone4).toBe(undefined);
    expect(f.phone4Description).toBe(undefined);
  });
  it("properMerge4", () => {
    let f = remult.repo(Families).create();
    let f2 = remult.repo(Families).create();
    let c = new MergeFamiliesComponent(remult, undefined, undefined, undefined, undefined);
    c.family = remult.repo(Families).create();
    c.family.phone1 = new Phone('0507330590');
    c.families = [f, f2];
    f.phone1 = new Phone('0507330590');
    f2.phone1 = new Phone('0523307014');
    f2.phone2 = new Phone('3');
    c.rebuildCompare(true);
    expect(c.family.phone1.thePhone).toBe('0507330590');
    expect(c.family.phone2.thePhone).toBe('0523307014');
    expect(c.family.phone3.thePhone).toBe('3');
  });
  it("worksWithUndefined", () => {
    expect(processPhone(undefined).length).toBe(0);
    expect(processPhone('-').length).toBe(1);
  });
  it("properMerge", () => {
    let f = remult.repo(Families).create();
    let f2 = remult.repo(Families).create();
    let c = new MergeFamiliesComponent(remult, undefined, undefined, undefined, undefined);
    c.family = remult.repo(Families).create();
    c.families = [f, f2];
    f.tz = '1';
    f2.tz = '2';
    c.rebuildCompare(true);
    expect(c.family.tz).toBe('1');
    expect(c.family.tz2).toBe('2');
  });
  it("properMerge1", () => {
    let f = remult.repo(Families).create();
    let f2 = remult.repo(Families).create();
    let c = new MergeFamiliesComponent(remult, undefined, undefined, undefined, undefined);
    c.family = remult.repo(Families).create();
    c.families = [f, f2];

    f2.tz = '2';
    c.rebuildCompare(true);
    expect(c.family.tz).toBe('2');
  });
  it("properMerge2", () => {
    let f = remult.repo(Families).create();
    let f2 = remult.repo(Families).create();
    let c = new MergeFamiliesComponent(remult, undefined, undefined, undefined, undefined);
    c.family = remult.repo(Families).create();
    c.families = [f, f2];
    f.tz = '1';
    f2.tz = '01';
    c.rebuildCompare(true);
    expect(c.family.tz).toBe('1');

  });
  it("properMerge3", () => {
    let f = remult.repo(Families).create();
    let f2 = remult.repo(Families).create();
    let c = new MergeFamiliesComponent(remult, undefined, undefined, undefined, undefined);
    c.family = remult.repo(Families).create();
    c.families = [f, f2];
    f.phone1 = new Phone('1');
    f.phone1Description = 'd1';
    f2.phone1 = new Phone('2');
    f2.phone1Description = 'd2';
    c.rebuildCompare(true);
    expect(c.family.phone1.thePhone).toBe('1');
    expect(c.family.phone1Description).toBe('d1');
    expect(c.family.phone2.thePhone).toBe('2');
    expect(c.family.phone2Description).toBe('d2');
  });
  it("valid phoneb", () => {
    let test = (phone: string, expected: boolean) => expect(isPhoneValidForIsrael(phone)).toBe(expected, phone);
    test('039197373', true);
  });
  it("test event date", () => {
    let today = new Date("2021-08-03T08:38:19.237Z");
    let x = {} as EventInList;
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-08-02" }, true, today)).toBe("עבר")
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-08-03" }, true, today)).toBe("היום (03/08)")
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-08-04" }, true, today)).toBe("מחר (04/08)")
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-08-05" }, true, today)).toBe("השבוע")
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-08-10" }, true, today)).toBe("שבוע הבא")
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-08-15" }, true, today)).toBe("אוגוסט")
    expect(eventDisplayDate({ ...x, eventDateJson: "2021-09-13" }, true, today)).toBe("ספטמבר")
  });



});



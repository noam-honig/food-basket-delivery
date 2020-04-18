import { TestBed, async } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

import { ServerContext } from '@remult/core';
import { SqlBuilder, QueryBuilder } from './model-shared/types';
import { WebDriverProxy } from 'blocking-proxy/built/lib/webdriver_proxy';
import { parseAddress, Families, parseUrlInAddress } from './families/families';
import { BasketType } from './families/BasketType';
import { fixPhone } from './import-from-excel/import-from-excel.component';

describe('AppComponent', () => {
  var context = new ServerContext();
  var bt = context.for(BasketType).create();
  var f = context.for(Families).create();
  var sql = new SqlBuilder();
  sql.addEntity(bt, 'p');
  var q = (query: QueryBuilder, expectresult: String) => {
    expect(sql.query(query)).toBe(expectresult);
  };
  it('basics work', () => {
    expect(sql.build(bt.id)).toBe('p.id');
  });
  it('select start', () => {
    q({
      select: () => [bt.id],
      from: bt,
      orderBy: [bt.id]
    }, 'select p.id from BasketType p order by p.id');
  });
  it('Where', () => {
    q({
      select: () => [bt.id],
      from: bt,
      where: () => [sql.eq(bt.boxes, 5)]
    }, 'select p.id from BasketType p where p.boxes = 5');
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
  it('select multiple Order By', () => {
    q({
      select: () => [bt.id],
      from: bt,
      orderBy: [bt.id, { column: bt.name, descending: true }]
    }, 'select p.id from BasketType p order by p.id, p.name desc');
  });
  it("column dbname can reference root entity", () => {
    let sql = new SqlBuilder();
    expect(sql.columnSumInnerSelect(bt, f.familyMembers, {
      from: f,
      where: () => [sql.eq(f.basketType, bt.id)]

    })).toBe('(select sum(e1.familyMembers) from Families e1 where e1.basketType = BasketType.id)');
  });
  it("case ", () => {
    expect(sql.case([
      { when: ['1=1', '2=2'], then: '3' },
      { when: ['3=3'], then: '4' }
    ], 9)).toBe("case when 1=1 and 2=2 then 3 when 3=3 then 4 else 9 end");
  });
  it('delete 2', () => {
    let p = context.for(BasketType).create();
    expect(sql.delete(p, sql.eq(p.boxes, 5), sql.eq(p.boxes, 6))).toBe('delete from BasketType where boxes = 5 and boxes = 6');
  });
  it('update ', () => {
    expect(sql.update(bt, {
      set: () => [[bt.id, "'123'"], [bt.name, "'noam'"]],
      where: () => [sql.eq(bt.boxes, 5), sql.eq(bt.boxes, 6)]
    })).toBe("update BasketType p set id = '123', name = 'noam' where p.boxes = 5 and p.boxes = 6");
  });
  it('update 2 ', () => {
    let pd = context.for(Families).create();
    expect(sql.update(bt, {
      set: () => [[bt.id, pd.basketType], [bt.name, "'noam'"]],
      from: pd,
      where: () => [sql.eq(bt.boxes, 5), sql.eq(bt.boxes, pd.familyMembers)]
    })).toBe("update BasketType p set id = e2.basketType, name = 'noam' from Families e2 where p.boxes = 5 and p.boxes = e2.familyMembers");
  });
  it('insert ', () => {
    sql = new SqlBuilder();

    expect(sql.insert({
      into: bt,
      set: () => [[bt.id, f.id], [bt.name, "'noam'"]],
      from: f,
      where: () => [sql.eq(f.familyMembers, 5)]
    })).toBe("insert into BasketType (id, name) select e1.id, 'noam' from Families e1 where e1.familyMembers = 5");
  });
  it('filter ', () => {
    expect(sql.build(bt.boxes.isEqualTo(3).and(bt.boxes.isEqualTo(5)))).toBe('boxes = 3 and boxes = 5');
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

  });
  it("test address parser", () => {
    expect(parseUrlInAddress("https://maps.google.com/maps?q=32.53666305541992%2C34.905311584472656&z=17&hl=en")).toBe("32.53666305541992,34.905311584472656");
    expect(parseUrlInAddress("https://www.google.com/maps/place/32%C2%B032'12.0%22N+34%C2%B054'19.1%22E/@32.5366631,34.9031229,17z/data=!3m1!4b1!4m5!3m4!1s0x0:0x0!8m2!3d32.5366631!4d34.9053116?hl=en")).toBe("32.5366631,34.9053116");
    expect(parseUrlInAddress("https://www.google.com/maps/place/32%C2%B032'01.9%22N+34%C2%B054'14.3%22E/@32.5338692,34.9055186,17z/data=!3m1!4b1!4m14!1m7!3m6!1s0x0:0x0!2zMzLCsDMyJzEyLjYiTiAzNMKwNTQnMjAuMiJF!3b1!8m2!3d32.5368337!4d34.9056189!3m5!1s0x0:0x0!7e2!8m2!3d32.533866!4d34.9039709?hl=iw")).toBe("32.533866,34.9039709");

    expect(parseUrlInAddress(`מיקום:32.267417990635636,34.878578873069586דיוק: 20.679268441942863`)).toBe('32.267417990635636,34.878578873069586')
    expect(parseUrlInAddress('32.267417990635636,34.878578873069586')).toBe('32.267418,34.878579')
    expect(parseUrlInAddress("נועם")).toBe("נועם");

  });

});


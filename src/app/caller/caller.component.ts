import { Component, OnInit } from '@angular/core';
import { DataAreaSettings } from '@remult/angular/interfaces';
import { FieldRef, Remult } from 'remult';
import { Families } from '../families/families';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';

@Component({
  selector: 'app-caller',
  templateUrl: './caller.component.html',
  styleUrls: ['./caller.component.scss']
})
export class CallerComponent implements OnInit {

  constructor(private remult: Remult) { }
  f: Families;
  d: ActiveFamilyDeliveries;
  address: DataAreaSettings;
  ngOnInit(): void {
    this.remult.repo(ActiveFamilyDeliveries).findFirst().then(
      async d => {
        this.d = d;
        this.f = await this.remult.repo(Families).findId(this.d.family);
        const f = this.f.$;
        function visible(ref: FieldRef, arr: FieldRef[]) {
          return arr.map(f => ({ field: f, visible: () => ref.value || arr.find(f => f.value) }));

        }
        this.address = new DataAreaSettings({
          fields: () => [
            f.name,
            [f.phone1, f.phone1Description],
            visible(f.phone1, [f.phone2, f.phone2Description]),
            visible(f.phone2, [f.phone3, f.phone3Description]),
            visible(f.phone3, [f.phone4, f.phone4Description]),
            f.address,
            [
              f.appartment, f.floor, f.entrance, f.buildingCode
            ],
            f.addressComment,
            d.$.deliveryComments,
            [{ field: d.$.basketType, width: '' }, d.$.quantity]
          ]
        })
      }
    )

  }

}

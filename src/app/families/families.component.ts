import { Component, OnInit } from '@angular/core';
import { GridSettings } from 'radweb';
import { Families, Helpers } from '../models';
import { SelectService } from '../select-popup/select-service';

@Component({
  selector: 'app-families',
  templateUrl: './families.component.html',
  styleUrls: ['./families.component.scss']
})
export class FamiliesComponent implements OnInit {

  families = new GridSettings(new Families(), {
    allowDelete: true,
    allowUpdate: true,
    allowInsert: true,
    columnSettings: f => [
      f.name,
      f.phone,
      f.address,
      {
        column: f.courier,
        getValue: f => f.lookup(new Helpers(), f.courier).name,
        click: f => this.dialog.showPopup(new Helpers(), s => f.courier.value = s.id.value,{
          columnSettings:h=>[h.name,h.phone]
        })

      }
    ]
  });
  constructor(private dialog: SelectService) { }

  ngOnInit() {
  }

}

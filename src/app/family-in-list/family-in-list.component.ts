import { Component, OnInit, Input } from '@angular/core';
import { ActiveFamilyDeliveries } from '../family-deliveries/family-deliveries-join';


@Component({
  selector: 'app-family-in-list',
  templateUrl: './family-in-list.component.html',
  styleUrls: ['./family-in-list.component.scss']
})
export class FamilyInListComponent implements OnInit {

  constructor() { }
  @Input() f: ActiveFamilyDeliveries;
  @Input() i: number;
  @Input() newAssign:boolean;
  ngOnInit() {
  }

}

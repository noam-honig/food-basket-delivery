import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';



@Component({
  selector: 'app-family-in-list',
  templateUrl: './family-in-list.component.html',
  styleUrls: ['./family-in-list.component.scss']
})
export class FamilyInListComponent implements OnInit {

  constructor() { }
  @Input() f: ActiveFamilyDeliveries;
  @Input() i: number;
  @Input() newAssign: boolean;
  @Input() sameAddress: boolean;
  @Output() delivered =  new EventEmitter<void>();
  ngOnInit() {
    
  }
  getAddressDescription() {

    let r = this.f.getAddressDescription();
    if (this.sameAddress) {
      r += " *";
    }
    return r;

  }
 
  swipe = false;
  doDelivered(e:MouseEvent){
    console.log(e);
    e.cancelBubble = true;
    this.delivered.emit();
    this.swipe = false;
    return false;
  }

}

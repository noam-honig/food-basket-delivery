import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { DomSanitizer } from '@angular/platform-browser';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { TranslationOptions } from '../translate';
import { Location } from '../shared/googleApiHelpers';



@Component({
  selector: 'app-family-in-list',
  templateUrl: './family-in-list.component.html',
  styleUrls: ['./family-in-list.component.scss']
})
export class FamilyInListComponent implements OnInit {

  constructor(private sanitization: DomSanitizer, public settings: ApplicationSettings) { }
  @Input() f: ActiveFamilyDeliveries;
  @Input() i: number;
  @Input() newAssign: boolean;
  @Input() latestAssign: boolean;
  @Input() distanceFromPreviousLocation: number;
  @Output() delivered = new EventEmitter<void>();
  ngOnInit() {

  }
  getName() {
    if (this.settings.showOnlyLastNamePartToVolunteer)
      return this.f.name.replace(/^.* /g, '');
    return this.f.name;

  }

  offsetX() {
    return this.sanitization.bypassSecurityTrustStyle('translateX(' + this.offsetXValue + 'px)');
  }
  offsetXValue = 0;
  getAddressDescription() {

    let r = this.f.getAddressDescription();
    if (this.distanceFromPreviousLocation === 0) {
      let x = "";
      if (this.f.entrance)
        x += this.settings.lang.entrance + " " + this.f.entrance;
      if (this.f.floor)
        x += " " + this.settings.lang.floor + " " + this.f.floor;
      if (this.f.appartment) {
        x += " " + this.settings.lang.appartment + " " + this.f.appartment;
      }
      if (x != "") {
        r = '* ' + this.settings.lang.dido + ' ' + x;
      } else
        r = "* " + r;
    }
    if (this.distanceFromPreviousLocation > 0) {
      r += ", " + this.distanceFromPreviousLocation.toFixed(1) + " " + this.settings.lang.km;
    }
    return r;

  }
  horizontalPan(e: any) {
    if (this.settings.forWho == TranslationOptions.Families)
      if (Math.abs(e.overallVelocityX) < 1) {

        this.offsetXValue = Math.max(-100, Math.min(0, e.deltaX));

        this.swipe = this.offsetXValue <= -85;


      }
  }
  panend(e: any) {
    this.offsetXValue = this.swipe ? -100 : 0;
  }

  swipe = false;
  doDelivered(e: MouseEvent) {
    console.log(e);
    e.cancelBubble = true;
    this.delivered.emit();
    this.swipe = false;
    return false;
  }

}

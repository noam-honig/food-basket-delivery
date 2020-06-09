import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries';
import { DomSanitizer } from '@angular/platform-browser';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { TranslationOptions } from '../translate';



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
  @Input() sameAddress: boolean;
  @Output() delivered = new EventEmitter<void>();
  ngOnInit() {

  }

  offsetX() {
    return this.sanitization.bypassSecurityTrustStyle('translateX(' + this.offsetXValue + 'px)');
  }
  offsetXValue = 0;
  getAddressDescription() {

    let r = this.f.getAddressDescription();
    if (this.sameAddress) {
      r += " *";
    }
    return r;

  }
  horizontalPan(e: any) {
    if (this.settings.forWho.value == TranslationOptions.Families)
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

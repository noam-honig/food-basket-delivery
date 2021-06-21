import { Component, OnInit, ViewChild } from '@angular/core';
import { infoOnMap, statusClass, Statuses } from '../distribution-map/distribution-map.component';
import * as chart from 'chart.js';
import { BackendMethod, Context, SqlDatabase } from '@remult/core';
import { Roles } from '../auth/roles';
import { SqlBuilder, SqlFor } from '../model-shared/types';
import { DeliveryStatus } from '../families/DeliveryStatus';
import { ActiveFamilyDeliveries, FamilyDeliveries } from '../families/FamilyDeliveries';
import { DateRangeComponent } from '../date-range/date-range.component';
import { ApplicationSettings } from '../manage/ApplicationSettings';
import { DialogService } from '../select-popup/dialog';
import { DateValueConverter } from '@remult/core/valueConverters';

@Component({
  selector: 'app-playback',
  templateUrl: './playback.component.html',
  styleUrls: ['./playback.component.scss']
})
export class PlaybackComponent implements OnInit {

  constructor(public settings: ApplicationSettings, public dialog: DialogService) { }
  public pieChartLabels: string[] = [];
  public pieChartData: number[] = [];
  public colors: Array<any> = [
    {
      backgroundColor: []

    }];
  public pieChartType: chart.ChartType = 'pie';
  options: chart.ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    legend: {
      position: 'right',
      onClick: (event: MouseEvent, legendItem: any) => {

        return false;
      }
    },
  };

  bounds = new google.maps.LatLngBounds();
  dict = new Map<string, infoOnMap>();
  mapInit = false;
  map: google.maps.Map;

  @ViewChild('gmap', { static: true }) gmapElement: any;

  statuses = new Statuses(this.settings);
  @ViewChild(DateRangeComponent, { static: false }) dateRange:DateRangeComponent;
  ready = false;
  async select() {
    this.ready = true;
    let from = this.dateRange.fromDate;
    let to = this.dateRange.toDate;


    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };


    if (!this.mapInit) {

      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;


    }
    let families = await PlaybackComponent.GetTimeline(from, to);
    for (const f of families) {
      let familyOnMap = {
        marker: new google.maps.Marker({
          map: this.map,
          position: { lat: f.lat, lng: f.lng }
        })
        , prevStatus: undefined,
        prevCourier: undefined
      };

      this.bounds.extend(familyOnMap.marker.getPosition());
      let startStatus = this.statuses.ready;
      if (f.status == DeliveryStatus.SelfPickup.id || f.status == DeliveryStatus.SuccessPickedUp.id)
        startStatus = this.statuses.selfPickup;
      startStatus.value++;
      familyOnMap.marker.setIcon(startStatus.icon);
      let prevStep = startStatus;
      let addTimeLineStep = (newStat: statusClass, when: Date) => {
        if (newStat == prevStep)
          return;
        let p = prevStep;
        when = new Date(when.valueOf());
        this.timeline.push({
          caption: prevStep.name + ' > ' + newStat.name,
          timeline: when,
          do: () => {
            familyOnMap.marker.setMap(undefined);
            familyOnMap.marker = new google.maps.Marker({
              map: this.map,
              position: { lat: f.lat, lng: f.lng }
            })
            familyOnMap.marker.setAnimation(google.maps.Animation.DROP);
            familyOnMap.marker.setIcon(newStat.icon);

            p.value--;
            newStat.value++;
          },
          revert: () => {
            p.value++;
            newStat.value--;
            familyOnMap.marker.setMap(undefined);
            familyOnMap.marker = new google.maps.Marker({
              map: this.map,
              position: { lat: f.lat, lng: f.lng }
            })
            familyOnMap.marker.setAnimation(google.maps.Animation.DROP);
            familyOnMap.marker.setIcon(newStat.icon);

            familyOnMap.marker.setIcon(p.icon);
          }
          , orig: f
        });
        prevStep = newStat;
      }
      if (f.courierTime && startStatus != this.statuses.selfPickup) {
        addTimeLineStep(this.statuses.onTheWay, DateValueConverter.fromJson(f.courierTime));
      }
      let stat = this.statuses.getBy(f.status, f.courier);
      if (stat != startStatus)
        addTimeLineStep(stat, DateValueConverter.fromJson(f.statusTime));

    }
    this.map.fitBounds(this.bounds);
    this.timeline.sort((a, b) => a.timeline.valueOf() - b.timeline.valueOf());
    this.timeline.splice(0, 0, {
      caption: 'start',
      do: () => { },
      revert: () => { },
      timeline: new Date(this.timeline[0].timeline.valueOf() - 1),
      orig: undefined
    });

    this.updateChart();
    this.zoom = this.map.getZoom();
  }
  height = 600;
  getHeight() {
    return this.height.toString() + "px";
  }
  async ngOnInit() {

    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(32.3215, 34.8532),
      zoom: 17,
      mapTypeId: google.maps.MapTypeId.ROADMAP,

    };


    if (!this.mapInit) {

      this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp);
      this.mapInit = true;


    }
  }
  position = 0;
  zoom = 0;
  speed = 30;
  showOnLeft = false;
  showOrgTitle = false;
  showOrgLogo = false;
  showHagaiLogo = false;
  next() {

    let now = this.timeline[this.position].timeline.valueOf();
    do {
      if (this.position == this.timeline.length - 1)
        break;
      this.position++;
      let x = this.timeline[this.position];
      x.do();
    }
    while (this.timeline[this.position].timeline.valueOf() < now + 1 * 1000);

    this.updateChart();
  }
  prev() {

    let now = this.timeline[this.position].timeline.valueOf();
    do {
      if (this.position == 0)
        break;
      let x = this.timeline[this.position];
      x.revert();
      this.position--;

    }
    while (this.timeline[this.position].timeline.valueOf() >= now - 60 * 1000);
    this.updateChart();
  }
  playing = false;
  animate() {
    this.playing = true;
    setTimeout(() => {
      this.next();
      if (this.position < this.timeline.length - 1)
        this.animate();
    }, +(this.speed * 1000 / this.timeline.length));
  }
  reset() {
    while (this.position > 0) {
      this.prev();
    }
    this.playing = false;
  }

  currentTime() {
    if (this.timeline.length > 0)
      return this.timeline[this.position].timeline.toLocaleString("he-il");
    return '';
  }


  updateChart() {
    this.pieChartData = [];
    this.pieChartLabels.splice(0);
    this.colors[0].backgroundColor.splice(0);


    this.statuses.statuses.forEach(s => {

      this.pieChartLabels.push(s.name + ' ' + s.value);
      this.pieChartData.push(s.value);
      this.colors[0].backgroundColor.push(s.color);

    });
  }
  timeline: timelineStep[] = [];

  @BackendMethod({ allowed: Roles.admin })
  static async GetTimeline(fromDateDate: Date, toDateDate: Date, context?: Context, db?: SqlDatabase) {
    let f = SqlFor(context.for(FamilyDeliveries));


    
    toDateDate = new Date(toDateDate.getFullYear(), toDateDate.getMonth(), toDateDate.getDate() + 1);

    let sql = new SqlBuilder();
    sql.addEntity(f, "Families");
    let r = (await db.execute(sql.query({
      select: () => [f.id, f.addressLatitude, f.addressLongitude, f.deliverStatus, f.courier, f.courierAssingTime, f.deliveryStatusDate],
      from: f,
      where: () => {
        let where = [(DeliveryStatus.isAResultStatus(f.deliverStatus).and(f.deliveryStatusDate.isGreaterOrEqualTo(fromDateDate).and(f.deliveryStatusDate.isLessThan(toDateDate))))];
        return where;
      },
      orderBy: [f.addressLatitude, f.addressLongitude]
    })));

    return r.rows.map(x => {
      return {
        id: x[r.getColumnKeyInResultForIndexInSelect(0)],
        lat: +x[r.getColumnKeyInResultForIndexInSelect(1)],
        lng: +x[r.getColumnKeyInResultForIndexInSelect(2)],
        status: +x[r.getColumnKeyInResultForIndexInSelect(3)],
        courier: x[r.getColumnKeyInResultForIndexInSelect(4)],
        courierTime: DateValueConverter.toJson(x[r.getColumnKeyInResultForIndexInSelect(5)]),
        statusTime: DateValueConverter.toJson(x[r.getColumnKeyInResultForIndexInSelect(6)])
      } as familyQueryResult;

    }) as familyQueryResult[];
  }



}
interface familyQueryResult {
  id: string;
  lat: number;
  lng: number;
  status: number;
  courier: string;
  courierTime: string;
  statusTime: string;
}
interface timelineStep {
  timeline: Date;
  do: () => void;
  revert: () => void;
  caption: string;
  orig: familyQueryResult;
}
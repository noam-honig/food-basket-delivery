import { Component, ViewChild } from '@angular/core'
import { Route } from '@angular/router'
import { remult, repo } from 'remult'

import { SderotGuard, SignedInAndNotOverviewGuard } from '../auth/guards'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { Roles } from '../auth/roles'
import { Helpers } from '../helpers/helpers'
import { ActiveFamilyDeliveries } from '../families/FamilyDeliveries'
import { HelperBasketTypes } from '../helper-register/HelperBasketTypes'
import { DeliveryStatus } from '../families/DeliveryStatus'
import { DialogService } from '../select-popup/dialog'

@Component({
  selector: 'app-deliveries-distribute',
  templateUrl: './deliveries-distribute.component.html',
  styleUrl: './deliveries-distribute.component.scss'
})
export class DeliveriesDistributeComponent {
  static route: Route = {
    path: 'deliveries-distribute',
    component: DeliveriesDistributeComponent,
    canActivate: [SignedInAndNotOverviewGuard, SderotGuard],
    data: { name: 'משימות פתוחים' }
  }

  constructor(
    public settings: ApplicationSettings,
    public dialog: DialogService
  ) {}

  @ViewChild('gmap', { static: true }) gmapElement: any
  map: google.maps.Map

  deliveries: ActiveFamilyDeliveries[] = []
  deliveriesParent: {
    deliveryParent: ActiveFamilyDeliveries
    deliveries: ActiveFamilyDeliveries[]
    basketTypes: string
  }[] = []

  helper!: Helpers

  countDeliveries: number = 0
  deliveriesBlock: boolean = false
  loaded: boolean = false
  ngOnInit() {
    this.load()
  }

  async load() {
    this.helper = await repo(Helpers).findId(remult.user.id)

    const helperBasketTypes = (
      await repo(HelperBasketTypes).find({
        where: { helperId: [remult.user?.id] }
      })
    )?.map((BasketType) => BasketType.basketType)
    remult
      .repo(ActiveFamilyDeliveries)
      .liveQuery({
        where: {
          courier: null!,
          // visibleToCourier:
          //   !this.settings.isSytemForMlt &&
          //   !remult.isAllowed(Roles.distCenterAdmin)
          //     ? true
          //     : undefined,
          basketType: helperBasketTypes,
          deliverStatus: DeliveryStatus.ReadyForDelivery,
        },
        orderBy: {
          deliverStatus: 'asc',
          routeOrder: 'asc',
          address: 'asc'
        },
        limit: 1000
      })
      .subscribe({
        next: async (reducer) => {
          await this.countDeliveriesActive()
          this.deliveries = reducer.items

          if (!this.loaded) this.loaded = true
          this.loadMap()
        }
      })
  }

  loadMap() {
    var mapProp: google.maps.MapOptions = {
      center: new google.maps.LatLng(
        this.settings.forWho.args.bounds.east,
        this.settings.forWho.args.bounds.north
      ),
      zoom: 15,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    }
    this.map = new google.maps.Map(this.gmapElement.nativeElement, mapProp)
    let markers: google.maps.Marker[] = []
    this.deliveries.forEach((d) => {
      let deliveryOnMap!: any
      if (!deliveryOnMap) {
        deliveryOnMap = {
          marker: new google.maps.Marker({
            position: {
              lat: d.getDrivingLocation().lat,
              lng: d.getDrivingLocation().lng
            }
          }),
          prevStatus: undefined,
          prevCourier: undefined,
          id: d.id
        }
        const date = d.createDate.toLocaleString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        })
        if (d.deliveryComments) markers.push(deliveryOnMap.marker)
        const infoWindow = new google.maps.InfoWindow({
          content:
            `<div class="map-body">` +
            `<span style="font-size: 18px;font-weight: bold;">${d.basketType.name}</span>` +
            `<div class="map-data" ><img src="assets/calendar.png" alt="">${date}</div>` +
            (d.deliveryComments
              ? `<div class="map-data"><img src="assets/comment.png" alt="">${d.deliveryComments}</div>`
              : '') +
            `<button class="rounded-button mdc-button mdc-button--outlined mat-mdc-outlined-button mat-unthemed mat-mdc-button-base" id="${d.id}" style="width: 10px;height: 40px;align-self: self-end;">${this.settings.lang.assign}</button>` +
            `</div>`,
          maxWidth: 200
        })
        google.maps.event.addListener(
          deliveryOnMap.marker,
          'click',
          async () => {
            if (!this.deliveriesBlock) {
              await infoWindow.open(this.map, deliveryOnMap.marker)
              const button = document.getElementById(d.id)
              if (button) {
                button.addEventListener('click', () => {
                  infoWindow.close()
                  this.assignDelivery(d)
                })
              }
            }
          }
        )

        deliveryOnMap.marker.setMap(this.map)
      }
    })
  }

  mapTabClicked() {
    this.settings.lang.list
  }

  async countDeliveriesActive() {
    this.countDeliveries = await repo(ActiveFamilyDeliveries).count({
      deliverStatus: DeliveryStatus.ReadyForDelivery,
      courier: [this.helper]
    })
    if (
      this.countDeliveries >= this.helper.maxDeliveries &&
      !!this.helper.maxDeliveries
    ) {
      this.dialog.Info('הגעת למקסימום המשלוחים הפתוחים')
      this.deliveriesBlock = true
    }
  }

  async assignDelivery(d: ActiveFamilyDeliveries) {
    await d
      .assign({
        courier: this.helper
      })
      .save()
  }
}

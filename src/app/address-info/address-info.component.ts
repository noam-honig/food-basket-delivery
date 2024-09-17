import { Component, Input, OnInit } from '@angular/core'
import { use } from '../translate'
import { FieldRef } from 'remult'
import { ImageInfo } from '../images/images.component'
import { Phone } from '../model-shared/phone'
import { ApplicationSettings } from '../manage/ApplicationSettings'
import { DialogService } from '../select-popup/dialog'
import { SendSmsAction } from '../asign-family/send-sms-action'

@Component({
  selector: 'app-address-info',
  templateUrl: './address-info.component.html',
  styleUrls: ['./address-info.component.scss']
})
export class AddressInfoComponent implements OnInit {
  @Input() args!: AddressInfoArgs
  phones: { phone: Phone; desc: string }[]
  initPhones() {
    this.phones = [
      {
        phone: this.args.f.$.phone1.value,
        desc: this.args.f.$.phone1Description.value
      },
      {
        phone: this.args.f.$.phone2.value,
        desc: this.args.f.$.phone2Description.value
      },
      {
        phone: this.args.f.$.phone3?.value,
        desc: this.args.f.$.phone3Description?.value
      },
      {
        phone: this.args.f.$.phone4?.value,
        desc: this.args.f.$.phone4Description?.value
      }
    ].filter((x) => x.phone)
  }
  navigate() {
    if (!this.args.f.addressOk) {
      this.dialog.YesNoQuestion(use.language.addressNotOkOpenWaze, () => {
        if (this.args.useWaze) this.args.f.openWaze()
        else this.args.f.openGoogleMaps()
      })
    } else if (this.args.useWaze) this.args.f.openWaze()
    else this.args.f.openGoogleMaps()
  }
  callPhone(col: Phone) {
    col?.call()
  }
  async sendWhatsapp(phone: Phone) {
    phone.sendWhatsapp(
      SendSmsAction.getSuccessMessage(
        this.settings.successMessageText,
        this.settings.organisationName,
        this.args.f.name
      )
    )
  }

  constructor(
    public settings: ApplicationSettings,
    private dialog: DialogService
  ) {}
  lang = use.language

  ngOnInit(): void {
    this.initPhones()
  }
}
export interface AddressInfoArgs {
  f: {
    $: {
      floor: FieldRef<unknown, string>
      appartment: FieldRef<unknown, string>
      entrance: FieldRef<unknown, string>
      phone1: FieldRef<unknown, Phone>
      phone1Description: FieldRef<unknown, string>
      phone2: FieldRef<unknown, Phone>
      phone2Description: FieldRef<unknown, string>
      phone3?: FieldRef<unknown, Phone>
      phone3Description?: FieldRef<unknown, string>
      phone4?: FieldRef<unknown, Phone>
      phone4Description?: FieldRef<unknown, string>
    }
    addressOk?: boolean
    buildingCode?: string
    addressComment: string
    name?: string
    openWaze: VoidFunction
    openGoogleMaps: VoidFunction
    getAddressDescription: () => string
  }
  title?: string
  callerScreen?: boolean
  useWaze: boolean
  hasImages?: boolean
  images?: ImageInfo[]
  loadImages?: VoidFunction
  completed?: () => boolean
}

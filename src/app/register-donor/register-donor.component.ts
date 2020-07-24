import { Component, OnInit } from '@angular/core';
import { PhoneColumn } from '../model-shared/types';
import { StringColumn, NumberColumn, DataAreaSettings, ServerFunction, Context, Column } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';
import { allCentersToken } from '../manage/distribution-centers';
import { executeOnServer, pack } from '../server/mlt';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {

  constructor(private dialog: DialogService, private context: Context) { }
  donor = new donorForm();
  area = new DataAreaSettings({ columnSettings: () => this.donor.columns });
  ngOnInit() {
  }
  async submit() {
    try {
      await RegisterDonorComponent.doDonorForm(pack(this.donor));
      await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על תרומך", showOnlyConfirm: true });
      window.location.href = "https://www.mitchashvim.org.il/";
    }
    catch (err) {
      this.dialog.exception("donor form", err);
    }
  }
  @ServerFunction({ allowed: true })
  static async doDonorForm(args: any[], context?: Context) {
    await executeOnServer(new donorForm(), args, context);
  }

}

class donorForm {
  name = new StringColumn("שם מלא");
  phone = new StringColumn({
    caption: "טלפון",
    dataControlSettings: () => ({ inputType: 'tel' })
  });
  email = new StringColumn({
    caption: "דואל",
    dataControlSettings: () => ({ inputType: 'email' })
  });
  address = new StringColumn("כתובת");
  city = new StringColumn("עיר");
  computer = new NumberColumn("מספר מחשבים ניידים");
  laptop = new NumberColumn("מספר מחשבים נייחים");
  screen = new NumberColumn("מספר מסכים");
  columns = [this.name, this.phone, this.email, this.address, this.city, this.computer, this.laptop, this.screen];


  async doWork(context: Context) {
    let f = context.for(Families).create();
    f.name.value = this.name.value;
    if (!this.address.value)
      this.address.value = '';
    if (!this.city.value)
      this.city.value = '';
    f.address.value = this.address.value + " " + this.city.value;
    f.phone1.value = this.phone.value;
    f.email.value = this.email.value;
    await f.save();
    var quantity = 0;
    async function addDelivery(type: string, q: number) {
      if (q > 0) {
        quantity += q;
        await Families.addDelivery(f.id.value, {
          comment: '',
          basketType: type,
          courier: '',
          distCenter: allCentersToken,
          quantity: q,
          selfPickup: false
        }, context);
      }
    }
    await addDelivery('מחשב', this.computer.value);
    await addDelivery('לפטופ', this.laptop.value);
    await addDelivery('מסך', this.screen.value);

    if (quantity == 0) {
      await Families.addDelivery(f.id.value, {
        comment: '',
        basketType: 'לא פורט',
        courier: '',
        distCenter: allCentersToken,
        quantity: 1,
        selfPickup: false
      }, context);
    }
  }
}





import { Component, OnInit } from '@angular/core';
import { Context } from '../shared/context';
import { Helpers } from '../helpers/helpers';
import { AsignFamilyComponent } from '../asign-family/asign-family.component'
import { Families } from '../families/families';

@Component({
  selector: 'app-stress-test',
  templateUrl: './stress-test.component.html',
  styleUrls: ['./stress-test.component.scss']
})
export class StressTestComponent implements OnInit {

  constructor(private context: Context) { }

  ngOnInit() {
  }
  phone: string = '0507335000';
  times:number=100;
  duration:number;
  helpers:number;
  families:number;
  async doTest() {
    let start = new Date();
    this.helpers = 0;
    this.families = 0;
    for (let index = 0; index < this.times; index++) {
      let x:number = +this.phone;
      
      x++;
      this.phone = '0'+ x;
      await this.testPhone(this.phone);
      this.duration = new Date().valueOf()-start.valueOf();
      
    }
  
  }


  async testPhone(phoneNumber: string) {
    this.helpers++;
    let h = await this.context.for(Helpers).findFirst(h => h.phone.isEqualTo(phoneNumber));

    let name = 'noam';
    let helperId = '';
    let count = 0;
    if (!h) {

      name = 'עוזר ' + phoneNumber;
    }
    else {
      helperId = h.id.value;
      name = h.name.value;
      let families = await this.context.for(Families).find({ where: f => f.courier.isEqualTo(helperId) });
      count = families.length;
    }
    let stats = await AsignFamilyComponent.getBasketStatus({
      filterCity: '',
      filterLanguage: -1,
      helperId
    });


    while (count < 5) {
      let addBox = await AsignFamilyComponent.AddBox({
        basketType: "",
        city: "",
        language: -1,
        numOfBaskets: 1,
        preferRepeatFamilies: true,
        name,
        phone: phoneNumber,
        helperId
      });
      helperId = addBox.helperId;
      count = addBox.families.length;
      if (!addBox.addedBoxes)
        return;

      let route =  AsignFamilyComponent.RefreshRoute(helperId,true);
      this.families++;
    }
  }

}

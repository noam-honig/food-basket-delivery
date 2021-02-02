import { Component, OnInit, ViewChild } from '@angular/core';
import { Context, EntityClass, IdEntity, StringColumn, BoolColumn, NumberColumn, ServerFunction } from '@remult/core';
import { CreateNewEvent } from '../create-new-event/create-new-event';
import { HelpersAndStats } from '../delivery-follow-up/HelpersAndStats';
import { ControllerBase, ServerController, ServerMethod, ServerMethod2 } from '../dev/server-method';
import { ApplicationSettings } from '../manage/ApplicationSettings';


@Component({
  selector: 'app-test-map',
  templateUrl: './test-map.component.html',
  styleUrls: ['./test-map.component.scss']
})



export class TestMapComponent implements OnInit {


  constructor(private context: Context) { }


  async ngOnInit() {
    setTimeout(() => {

      this.doIt();
    }, 1000);
  }
  async doIt() {

    let t = new Test3();
    t.greeting.value = "hello";
    let r = await t.test("noam");
    console.log(r);
    console.log(t.greeting.value);
    return;


  }


}




class myTest {
  greeting = new StringColumn();
  constructor(private stam: { s: string }) {
    stam.s.toString();
  }
  @ServerMethod2()
  test(name: string) {
    let x = this.greeting.value + " " + name + " " + this.stam.s;
    console.log('server ' + x);
    this.greeting.value = "good bye";

    //console.log(x);
    return x;
  }
}

@ServerController({
  key: 'test3key',
  allowed: true
})
class Test3 extends myTest {
  constructor() {
    super({ s: 'what' })
    console.log('test3 constructor');
  }

}
@ServerController({
  key: 'test4key',
  allowed: true
})
class Test4 extends myTest {
  constructor() {
    super({ s: 'test4' })
  }

}


@ServerController({ key: 'mostBasicController', allowed: true })
class mostBasicController {

  @ServerMethod2()
  async doSomething() {
      
  }
}


class mostBasicController1 extends ControllerBase {
  constructor() {
    super({
      key: 'mostBasicController1',
      allowed: true
    });
    
  }

  @ServerMethod()
  async doSomething() {

  }
}
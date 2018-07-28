import { Component, OnInit, ViewChild } from '@angular/core';
import { UserFamiliesList } from '../my-families/user-families';
import { AuthService } from '../auth/auth-service';
import { Helpers } from '../models';
import { MapComponent } from '../map/map.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-print-helper-families',
  templateUrl: './print-helper-families.component.html',
  styleUrls: ['./print-helper-families.component.scss']
})
export class PrintHelperFamiliesComponent implements OnInit {


  familyLists = new UserFamiliesList();
  helper = new Helpers();
  constructor(public auth: AuthService, private route: ActivatedRoute) { }
  async ngOnInit() {
    this.familyLists.setMap(this.map);
    this.route.paramMap.subscribe(async x => {

      var id = x.get('id');
      await this.helper.source.find({ where: this.helper.shortUrlKey.isEqualTo(id) }).then(async h => {
        if (h.length > 0) {
          this.helper = h[0];
          await this.familyLists.initForHelper(this.helper.id.value, this.helper);
          this.map.show();
        }
      });
    });
  }
  @ViewChild("map") map: MapComponent;

}

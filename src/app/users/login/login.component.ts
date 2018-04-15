import { Component, OnInit } from '@angular/core';
import { foreachSync, foreachEntityItem } from '../../shared/utils';
import { Helpers } from '../../models';
import { SelectService } from '../../select-popup/select-service';
import { AuthService } from '../../auth/auth-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(
    private dialog: SelectService,
    private auth: AuthService
  ) { }
  user: string;
  password: string;
  remember: boolean;
  ngOnInit() {
  }
  login() {
    foreachEntityItem(new Helpers(), h => h.phone.isEqualTo(this.user), async h => {
      this.auth.auth.info = {
        helperId:h.id.value,
        admin: h.isAdmin.value,
        name: h.name.value,
        authToken: 'stam token',
        valid: true
      };
      if (this.remember)
        this.auth.auth.rememberOnThisMachine();
    });
  }
}

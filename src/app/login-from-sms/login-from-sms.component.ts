import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoginFromSmsAction } from './login-from-sms-action';
import { AuthService } from '../auth/auth-service';

@Component({
  selector: 'app-login-from-sms',
  templateUrl: './login-from-sms.component.html',
  styleUrls: ['./login-from-sms.component.scss']
})
export class LoginFromSmsComponent implements OnInit {

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authServer:AuthService
  ) { }

  ngOnInit() {
    this.route.paramMap.subscribe(async x => {

      var id = x.get('id');
      console.log(id);

      this.authServer.loginFromSms(id);
      
    });
  }

}

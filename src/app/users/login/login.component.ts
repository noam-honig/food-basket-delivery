import { Component, OnInit } from '@angular/core';
import { foreachSync, foreachEntityItem } from '../../shared/utils';
import { Helpers } from '../../models';
import { SelectService } from '../../select-popup/select-service';
import { AuthService } from '../../auth/auth-service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  constructor(
    private dialog: SelectService,
    private auth: AuthService,
    private router:Router
  ) { }
  user: string;
  password: string;
  remember: boolean;
  ngOnInit() {
  }
  login() {
    this.auth.login(this.user,this.password,this.remember);
    
  }
  register(){
    this.router.navigate(['/register']);
  }
}

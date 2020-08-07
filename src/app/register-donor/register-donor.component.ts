import { Component, OnInit, Injectable } from '@angular/core';
import { PhoneColumn, required, isPhoneValidForIsrael } from '../model-shared/types';
import { StringColumn, NumberColumn, BoolColumn, DataAreaSettings, ServerFunction, Context, Column } from '@remult/core';
import { DialogService } from '../select-popup/dialog';
import { Sites } from '../sites/sites';
import { Families } from '../families/families';
import { allCentersToken } from '../manage/distribution-centers';
import { executeOnServer, pack } from '../server/mlt';
import { YesNoQuestionComponent } from '../select-popup/yes-no-question/yes-no-question.component';
import { RequiredValidator } from '@angular/forms';

@Component({
  selector: 'app-register-donor',
  templateUrl: './register-donor.component.html',
  styleUrls: ['./register-donor.component.scss']
})
export class RegisterDonorComponent implements OnInit {
  constructor(private dialog: DialogService, private context: Context) { }
  donor = new donorForm(this.context);
  static sendMail: (subject: string, message: string, email: string) => Promise<boolean>;
  area = new DataAreaSettings({
    columnSettings: () =>
      this.donor.columns.filter(c => c != this.donor.name && c != this.donor.address && c != this.donor.selfDeliver)
  });
  ngOnInit() {
  }
  allowSubmit() {
    return this.hasQuantity() && this.hasMandatoryFields();
  }

  hasMandatoryFields() {
    return (this.donor.name.value != null) && (isPhoneValidForIsrael(this.donor.phone.value)
      && ((this.donor.selfDeliver.value) || (this.donor.address.value != null))
    );
  }
  hasQuantity() {
    return +this.donor.laptop.value > 0 || +this.donor.computer.value > 0 || +this.donor.screen.value > 0;
  }
  async submit() {

    if (!this.hasQuantity()) {
      this.dialog.Error("אנא הזן מספר מחשבים, לפטופים או מסכים");
      return;
    }
    if (!this.hasMandatoryFields()) {
      this.dialog.Error("יש למלא שדות חובה");
      return;
    }
    try {
      let error = '';
      for (const c of this.donor.columns) {
        //@ts-ignore
        c.__clearErrors();
        //@ts-ignore
        c.__performValidation();
        if (!error && c.validationError) {
          error = c.defs.caption + ": " + c.validationError;
        }
      }
      if (error) {
        this.dialog.Error(error);
        return;
      }
      var message = `

      <div style="background-color:#ffffff">
<div style="background-color:#ffeb9c;width:100%;border-style:solid;border-color:#9c6500;border-width:1pt;padding:2pt;font-size:10pt;line-height:12pt;font-family:'Calibri';color:Black;text-align:left;font-weight:bold">
<span style="color:#ff0000;font-weight:bold">CAUTION:</span> This email originated from outside of Western Digital. Do not click on links or open attachments unless you recognize the sender and know that the content is safe.</div>
<br>
<div>
<div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden">
נעים מאוד! שמי כרמל כהן ואני מנהלת מערך ההתנדבות של "מתחשבים", המיזם הלאומי לחלוקת מחשבים לתלמידים בפריפריה הגיאוגרפית-חברתית בישר</div>
<div class="m_1144634086940345926lc" style="width:100%"><img src="https://ci6.googleusercontent.com/proxy/4OLK6kvn2g1d_uHt_t2he5gG-6U7uYcqcb79dcQJ4uKYeRu-Et21p1-6yJEZi3I2j04benKW017SCUHonoDI5zlb5z0l6DYwYzydn2d2Sk7kybYBpGxprYqmX1s6hliB9e9qHkHwRQwNJhnhG0gaevCrMwubzFTNUHEO2dJAjQ33sCTfVARvvDTUNDexU58kmT9KYhySOHFbjfGteGwdLpbJIJGsfGm1X-O-m0WfCWC0MNggrz6MMVnevxmdjRsurp0rKeBwV_j4Mpp5GzXHxhdO=s0-d-e1-ft#https://shoutout.wix.com/so/pixel/17f71be5-0cba-4ed4-9e6b-b06ae00acae0/251062a3-d116-4178-ae12-a469fe3115d0/bc6f2367-7e33-4869-af94-45e4c4d0d2ed/00000000-0000-0000-0000-000000000000/top/true" style="display:table;height:1px!important;width:1px!important;border:0!important;margin:0!important;padding:0!important" width="1" height="1" border="0" class="CToWUd">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td>
<div style="margin:0px auto;max-width:732px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%">
<tbody>
<tr>
<td style="direction:ltr;font-size:0px;padding:19px 20px 20px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top" width="100%">
<tbody>
<tr>
<td align="center" style="font-size:0px;padding:0;word-break:break-word">
<div style="font-family:Helvetica,Ubuntu,Arial,sans-serif;font-size:10px;line-height:18px;text-align:center;color:#3899ec">
<a style="font-family:Helvetica,Ubuntu,Arial,sans-serif;color:#3899ec;font-size:10px;line-height:18px;text-decoration:none" href="https://shoutout.wix.com/so/edNCpYNwl/c?w=OCmzbYv5Mp7IkTS0Qm5wRPMy_wV1MwFlrZ3Sry29x6M.eyJ1IjoiaHR0cHM6Ly9zaG91dG91dC53aXguY29tL3NvL2VkTkNwWU53bCIsIm0iOiJtYWlsIiwiYyI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9" rel="noopener noreferrer" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://shoutout.wix.com/so/edNCpYNwl/c?w%3DOCmzbYv5Mp7IkTS0Qm5wRPMy_wV1MwFlrZ3Sry29x6M.eyJ1IjoiaHR0cHM6Ly9zaG91dG91dC53aXguY29tL3NvL2VkTkNwWU53bCIsIm0iOiJtYWlsIiwiYyI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9&amp;source=gmail&amp;ust=1596882988227000&amp;usg=AFQjCNF4V0TMrz-guXSGc4JtXU-dPpo2Gw"><strong style="font-weight:normal"><span><span>Can't
 See This Message? <b><u>View in a browser</u></b></span></span></strong></a></div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
<table align="center" class="m_1144634086940345926zb" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#eeeff9;width:100%;background-color:#eeeff9" width="100%" bgcolor="#EEEFF9">
<tbody>
<tr>
<td>
<div style="margin:0px auto;max-width:732px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%">
<tbody>
<tr>
<td style="direction:ltr;font-size:0px;padding:16px;text-align:center">
<div class="m_1144634086940345926hb" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;border-top:0;direction:ltr;font-size:0px;padding:42px 90px 50px 90px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:transparent;vertical-align:top" width="100%">
<tbody>
<tr>
<td align="center" style="font-size:0px;padding:0px;word-break:break-word">
<div style="font-family:Ubuntu,Helvetica,Arial,sans-serif;font-size:13px;line-height:1;text-align:center;color:#000000">
<a style="padding-top:0px;padding-bottom:0px;display:inline-block;max-width:100%;max-height:90px"><img src="https://ci5.googleusercontent.com/proxy/TKNxGdd8pcHdcajtvM2nO4Bhw1DHaYW5SfT88vX41G8-obKX-K-48EbF9ZD62kMFJalfYewazeut09MP4N9-laCTlJfPlGXFI7UKvk8qriNmnG--iIPduxgZBjfpar92NX56LuZ-yxDrullN_YGM8LbSNUzzf_OQmmynlNYrruNoDfjWbs4uPVrrXR7rLYx9KA2djvsUAa5NkIZXsFU2qVhtb97xkpDVeMlIhNZQ8FNPJ0nQ=s0-d-e1-ft#https://static.wixstatic.com/media/b2d0b1_ffa569a650264f26bc90d3d5209371f0~mv2.png/v1/fit/h_180,q_100,w_520,al_c/b2d0b1_ffa569a650264f26bc90d3d5209371f0~mv2.png" width="auto" height="90" style="display:inline-block;max-width:100%;width:auto;vertical-align:middle;max-height:90px" alt="" class="CToWUd"></a></div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926y" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;direction:ltr;font-size:0px;padding:0px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td style="vertical-align:top;padding:0px">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td align="left" class="m_1144634086940345926kb" style="font-size:0px;padding:0px 10px 30px 10px;word-break:break-word">
<div style="font-family:helvetica,sans-serif;font-size:42px;font-style:normal;line-height:1;text-align:left;text-transform:none;color:#000000">
<div class="m_1144634086940345926i" dir="rtl" style="letter-spacing:0;line-height:1.3;font-weight:bold;text-align:center">
<p class="m_1144634086940345926n m_1144634086940345926ib m_1144634086940345926jb" dir="rtl" style="margin:0;color:#030303;font-family:helvetica,sans-serif;font-size:12px;text-align:right;line-height:18px">
<span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb">הי&nbsp;</span></p>
</div>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926y" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;direction:ltr;font-size:0px;padding:0px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td style="vertical-align:top;padding:0px">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td align="left" class="m_1144634086940345926kb" style="font-size:0px;padding:25px 90px 25px 90px;word-break:break-word">
<div style="font-family:times new roman,serif;font-size:25px;font-style:normal;line-height:1;text-align:left;text-transform:none;color:#030303">
<div class="m_1144634086940345926f" dir="rtl" style="line-height:1.5;text-align:center">
<p class="m_1144634086940345926n m_1144634086940345926ib m_1144634086940345926jb" dir="rtl" style="margin:0;color:#030303;font-family:helvetica,sans-serif;font-size:12px;text-align:right;line-height:18px">
<span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb"><span style="font-size:12px;line-height:18px" class="m_1144634086940345926ib m_1144634086940345926jb"><span style="font-weight:bold" class="m_1144634086940345926ib m_1144634086940345926jb">נעים מאוד! שמי כרמל כהן</span><br>
ואני מנהלת מערך ההתנדבות של "מתחשבים",<br>
המיזם הלאומי לחלוקת מחשבים לתלמידים בפריפריה הגיאוגרפית-חברתית בישראל.<br>
<br>
ראשית, אני ממש מעריכה שהצטרפת להתנדבות איתנו.<br>
יחד איתך ועם מאות מתנדבים נוספים, נצליח להגיע לעשרות אלפי תלמידים.<br>
<span style="font-weight:bold" class="m_1144634086940345926ib m_1144634086940345926jb">תודה!</span><br>
<br>
המתנדבים הם <img goomoji="2764" data-goomoji="2764" style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="❤" src="https://mail.google.com/mail/e/2764" data-image-whitelisted="" class="CToWUd"> המיזם וחשוב לי להשאיר אותך בלופ על הפעילות ולהעביר לך עדכונים חשובים.<br>
לכן אני מזמינה אותך להצטרף לקבוצת הווסטאפ של המתדנבים<br>
<span style="font-weight:bold" class="m_1144634086940345926ib m_1144634086940345926jb">בה רק אני כותבת (Admin only) ואין חפירות, מבטיחה!</span><br>
<a href="https://shoutout.wix.com/so/edNCpYNwl/c?w=KAglT6HmqvHA0k70kDJSl4vOeN63L4Pmw5AlOwcp0uE.eyJ1IjoiaHR0cHM6Ly9jaGF0LndoYXRzYXBwLmNvbS9LcXFuS2lHRE9zYjl3d3IwZlQwOGsxIiwiciI6IjBkMTFjZjA4LTRiNmUtNDRjYy1lYTA5LWViMTJlNDg3ZjdkZSIsIm0iOiJtYWlsIiwiYyI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9" style="color:#109fff;text-decoration:none" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://shoutout.wix.com/so/edNCpYNwl/c?w%3DKAglT6HmqvHA0k70kDJSl4vOeN63L4Pmw5AlOwcp0uE.eyJ1IjoiaHR0cHM6Ly9jaGF0LndoYXRzYXBwLmNvbS9LcXFuS2lHRE9zYjl3d3IwZlQwOGsxIiwiciI6IjBkMTFjZjA4LTRiNmUtNDRjYy1lYTA5LWViMTJlNDg3ZjdkZSIsIm0iOiJtYWlsIiwiYyI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9&amp;source=gmail&amp;ust=1596882988227000&amp;usg=AFQjCNH2JT4e8YJXvddP3lrgNIJmvJ7Y6A">https://chat.whatsapp.com/<wbr>KqqnKiGDOsb9wwr0fT08k1</a></span></span><br>
<br>
<span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb"><span style="font-size:12px;line-height:18px" class="m_1144634086940345926ib m_1144634086940345926jb">אני רוצה להכיר אותך קצת יותר,<br>
מבקשת לקבל ממך עוד 2 דקות לענות על כמה שאלות בסיסיות:</span></span></p>
</div>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926s" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;direction:rtl;font-size:0px;padding:25px 90px 25px 90px;text-align:center">

<div class="m_1144634086940345926b" style="font-size:0px;text-align:left;display:inline-block;vertical-align:top;width:100%;direction:inherit">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td style="vertical-align:top;padding:0">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td align="center" class="m_1144634086940345926ec" style="font-size:0px;padding:0;word-break:break-word">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;line-height:100%">
<tbody>
<tr>
<td align="center" bgcolor="#F35D43" role="presentation" style="border:solid 0px #000000;border-radius:0px;background:#f35d43" valign="middle">
<a href="https://shoutout.wix.com/so/edNCpYNwl/c?w=vnzq3jaMyqJAM3ny83FHU7Rzua3AzlFvE9MR9EzxnrE.eyJ1IjoiaHR0cHM6Ly9mb3Jtcy5nbGUvYlZWTFpqYllrWmdqTHRGMTciLCJyIjoiYTRjZmZkN2UtYWVkMy00ZGQ3LTA1Y2EtZWI5OTQzYjlhZGIyIiwibSI6Im1haWwiLCJjIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIn0" rel="noopener" style="display:inline-block;background:#f35d43;color:#ffffff;font-family:helvetica,sans-serif;font-size:18px;font-weight:normal;line-height:120%;margin:0;text-decoration:none;text-transform:none;padding:10px 30px 10px 30px;border-radius:0px" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://shoutout.wix.com/so/edNCpYNwl/c?w%3Dvnzq3jaMyqJAM3ny83FHU7Rzua3AzlFvE9MR9EzxnrE.eyJ1IjoiaHR0cHM6Ly9mb3Jtcy5nbGUvYlZWTFpqYllrWmdqTHRGMTciLCJyIjoiYTRjZmZkN2UtYWVkMy00ZGQ3LTA1Y2EtZWI5OTQzYjlhZGIyIiwibSI6Im1haWwiLCJjIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIn0&amp;source=gmail&amp;ust=1596882988227000&amp;usg=AFQjCNGvTE-i9Li2V4hm_xPcX6goW0XJrA"><strong style="font-weight:inherit" dir="rtl">יש
 לי 2 דקות. לשאלות &gt;&gt;
<div style="width:80px"></div>
</strong></a></td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926y" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;direction:ltr;font-size:0px;padding:0px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td style="vertical-align:top;padding:0px">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td align="left" class="m_1144634086940345926kb" style="font-size:0px;padding:25px 90px 25px 90px;word-break:break-word">
<div style="font-family:times new roman,serif;font-size:25px;font-style:normal;line-height:1;text-align:left;text-transform:none;color:#030303">
<div class="m_1144634086940345926f" dir="rtl" style="line-height:1.5;text-align:center">
<p class="m_1144634086940345926n m_1144634086940345926ib m_1144634086940345926jb" dir="rtl" style="margin:0;color:#030303;font-family:helvetica,sans-serif;font-size:12px;text-align:right;line-height:18px">
<span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb">בינתיים אני מזמינה אותך לשמור ולעבור על המדריך למתחשב <img goomoji="1f447" data-goomoji="1f447" style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="👇" src="https://mail.google.com/mail/e/1f447" data-image-whitelisted="" class="CToWUd">🏼<br>
(ככה אנחנו מכנים את המתנדבים שלנו </span><span style="font-family:tahoma,sans-serif;color:rgb(51,51,51)" class="m_1144634086940345926ib m_1144634086940345926jb"><img goomoji="1f604" data-goomoji="1f604" style="margin:0 0.2ex;vertical-align:middle;max-height:24px" alt="😄" src="https://mail.google.com/mail/e/1f604" data-image-whitelisted="" class="CToWUd"></span><span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb">)</span></p>
<p class="m_1144634086940345926n m_1144634086940345926ib m_1144634086940345926jb" dir="rtl" style="margin:0;color:#030303;font-family:helvetica,sans-serif;font-size:12px;text-align:right;line-height:18px">
<br>
<span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb"><span style="font-size:12px;line-height:18px" class="m_1144634086940345926ib m_1144634086940345926jb"><span style="font-weight:bold" class="m_1144634086940345926ib m_1144634086940345926jb">שוב- תודה ענקית!</span><br>
זמינה במייל לכל עניין.<br>
<br>
נהיה בקשר,</span></span></p>
<p class="m_1144634086940345926n m_1144634086940345926ib m_1144634086940345926jb" dir="rtl" style="margin:0;color:#030303;font-family:helvetica,sans-serif;font-size:12px;text-align:right;line-height:18px">
<span style="font-family:tahoma,sans-serif" class="m_1144634086940345926ib m_1144634086940345926jb">כרמל כהן</span></p>
</div>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926cb" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;direction:ltr;font-size:0px;padding:25px 10px 25px 10px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td style="vertical-align:top;padding:0px">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td align="center" style="font-size:0px;padding:0px;word-break:break-word">
<div style="font-family:Ubuntu,Helvetica,Arial,sans-serif;font-size:13px;line-height:1;text-align:center;color:#000000">
<a style="display:inline-block;max-width:100%"><img src="https://ci3.googleusercontent.com/proxy/-LJrJvqLEfjY_VRnMxuKhnOqM5PQfQnhBFaS6_jV8PZt_VvSeWhwkFUEkDg8CF2OeQ2_9h39ty_YEPg7oTgx2ANrDUKwUDfm__8z_U0SY7Q9K6X-tkGw_JaYz6n3R6Grx7XTE3FAiUN08JFP8kU5ZOZzTVf_dQXGo95gn4546tTMEnbmSA6XfE5x3oc0=s0-d-e1-ft#https://static.wixstatic.com/media/9dbdc4_c88acfed3afa4ea8b0c19b1f4626850f~mv2.jpg/v1/fit/w_350,h_2000,al_c,q_85/image.jpg" width="350" style="display:inline-block;max-width:100%;vertical-align:middle;width:auto" alt="" class="CToWUd a6T" tabindex="0"><div class="a6S" dir="ltr" style="opacity: 0.01; left: 836.2px; top: 1858.77px;"><div id=":vd" class="T-I J-J5-Ji aQv T-I-ax7 L3 a5q" role="button" tabindex="0" aria-label="Download attachment " data-tooltip-class="a1V" data-tooltip="Download"><div class="aSK J-J5-Ji aYr"></div></div></div></a></div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926t m_1144634086940345926dc" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-left:0;border-right:0;direction:rtl;font-size:0px;padding:25px 0px 15px 0px;text-align:center">

<div style="height:10px"></div>

<div class="m_1144634086940345926a m_1144634086940345926ac" style="font-size:0px;text-align:left;display:inline-block;vertical-align:middle;width:100%;direction:inherit">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td style="vertical-align:middle;padding:0px">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" width="100%">
<tbody>
<tr>
<td class="m_1144634086940345926nb" style="font-size:0px;word-break:break-word">
<div style="height:30px">&nbsp;</div>
</td>
</tr>
<tr>
<td align="center" class="m_1144634086940345926ob" style="font-size:0px;padding:10px 0px 10px 10px;word-break:break-word">
<div style="font-family:Ubuntu,Helvetica,Arial,sans-serif;font-size:13px;line-height:1;text-align:center;color:#000000">
<div style="display:inline-block;vertical-align:middle"><a class="m_1144634086940345926g" href="https://shoutout.wix.com/so/edNCpYNwl/c?w=AliNZ4ynYSn5HHBBDllNgXrQaxT41E_zR1SooV63giU.eyJ1IjoiaHR0cHM6Ly93d3cubWl0Y2hhc2h2aW0ub3JnLmlsLyIsInIiOiIxMWFjYWQyZC05OTdlLTQxM2UtOTg4My1lYTBjZDMxZThkOGIiLCJtIjoibWFpbCIsImMiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAifQ" style="text-decoration:none;font-family:verdana,sans-serif;font-size:12px;margin-right:1.5px;line-height:25px;display:inline-block;overflow:hidden;vertical-align:middle;color:#38393f;max-height:100px" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://shoutout.wix.com/so/edNCpYNwl/c?w%3DAliNZ4ynYSn5HHBBDllNgXrQaxT41E_zR1SooV63giU.eyJ1IjoiaHR0cHM6Ly93d3cubWl0Y2hhc2h2aW0ub3JnLmlsLyIsInIiOiIxMWFjYWQyZC05OTdlLTQxM2UtOTg4My1lYTBjZDMxZThkOGIiLCJtIjoibWFpbCIsImMiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAifQ&amp;source=gmail&amp;ust=1596882988228000&amp;usg=AFQjCNFV4_QMzj3a5i6diKu_ZMgCvt1dLw"><span style="margin-right:1.5px;line-height:25px;display:inline;overflow:hidden;vertical-align:middle;max-height:100px"><strong style="font-weight:inherit">חזרה
 לאתר מתחשבים</strong></span> &nbsp;<img height="22" src="https://ci6.googleusercontent.com/proxy/oFf631jKMymsHLGpaQyd51q0I3KxCWup4nKAT9zDJPel0qw6ga4XzxEJiimraV3mScwcgmaTOS7YwnkiZpCINHg-C02pasVUS9UwSOsnjmPleSkqNPWQSYMjpHq89i6AVjtwwbtJ7G8kgmkP8g-EneRFLBgeKTFmgpf-qQXu5ijXvu2Sy1BGipOT7Ii9ucESQ1ApzgOLHIF0BW5YZ9btWyK35HSUWj5x9ZY40XzKHO2gKIbRCvj0nooTL38FTk0=s0-d-e1-ft#https://static.wixstatic.com/media/a306cb_b5f719a9248c4930a356a660d73e14c1~mv2.png/v1/fit/w_750,h_750,br_-53,sat_-88,hue_51/a306cb_b5f719a9248c4930a356a660d73e14c1~mv2.png" style="vertical-align:middle;border:0" width="22" alt="" class="CToWUd"></a></div>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>

<div class="m_1144634086940345926r" style="background:#ffffff;background-color:#ffffff;margin:0px auto;max-width:700px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td style="border-bottom:0;border-left:0;border-right:0;direction:ltr;font-size:0px;padding:25px 90px 85px 90px;padding-top:0px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top" width="100%">
<tbody>
<tr>
<td align="center" style="background:#2a2c2e;font-size:0px;padding:12px 10px;word-break:break-word">
<div style="font-family:helvetica,sans-serif;font-size:14px;line-height:18px;text-align:center;color:#ffffff">
<span style="color:#fff;padding:5px 0px 5px 0px;word-break:keep-all">Created&nbsp;with</span><span>‌&nbsp;</span><img style="border:none;height:14px;vertical-align:middle" width="97" height="14" src="https://ci5.googleusercontent.com/proxy/RKvYLHShiIfiC91DI0nF_tsOwCTQz2uKGy5TzxWGc8AqtrENSfKM72Tspjtxg37rx0pC_I4I6MjMNjWJ8iwlIuBr9QDSd3kS14YNiIkf4ZgFSSLr9QgQ3MwfWtFgv0WQi7QjXFhQYQSf-VortA77C04iURhy1_0ghuFpb0apzeTZ1VpL9tacrafLl36gs9fL5VJygwNzpqHewCf5PupqEK-G2OTB7jvEog=s0-d-e1-ft#https://static.wixstatic.com/media/b49ee3_e3831b3e6e844c01ad8136cc67ae1a04~mv2.png/v1/fit/w_750,h_750/b49ee3_e3831b3e6e844c01ad8136cc67ae1a04~mv2.png" alt="" class="CToWUd"><span style="color:#fff;padding:5px 0px 5px 3px;display:inline-block"><span><span>‌&nbsp;</span><span style="word-break:keep-all">Love&nbsp;it?</span><span>‌&nbsp;</span></span></span><a style="color:#fff;text-decoration:underline;display:inline-block" href="https://www.wix.com/ascend/home?utm_campaign=vir_promote_em_footer_wixads&amp;referralInfo=SO_LP" rel="noopener noreferrer" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://www.wix.com/ascend/home?utm_campaign%3Dvir_promote_em_footer_wixads%26referralInfo%3DSO_LP&amp;source=gmail&amp;ust=1596882988228000&amp;usg=AFQjCNEdjXjij-N9wtiZrR3FAvsL8IEM3g"><strong style="font-weight:normal"><span style="word-break:keep-all">Disc<wbr>over&nbsp;more</span></strong></a></div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;background-color:#ffffff;width:100%">
<tbody>
<tr>
<td>
<div style="margin:0px auto;max-width:732px">
<table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%">
<tbody>
<tr>
<td style="direction:ltr;font-size:0px;padding:15px 15px 14px;text-align:center">

<div class="m_1144634086940345926a" style="font-size:0px;text-align:left;direction:ltr;display:inline-block;vertical-align:top;width:100%">
<table border="0" cellpadding="0" cellspacing="0" role="presentation" style="vertical-align:top" width="100%">
<tbody>
<tr>
<td align="center" style="font-size:0px;padding:0;word-break:break-word">
<div style="font-family:Helvetica,Ubuntu,Arial,sans-serif;font-size:10px;line-height:18px;text-align:center;color:#3899ec">
<a style="font-family:Helvetica,Ubuntu,Arial,sans-serif;color:#3899ec;font-size:10px;line-height:18px;text-decoration:none" href="https://shoutout.wix.com/so/edNCpYNwl/c?w=0yT4EeXdiYktM3FkyIPpV393x1_zubtrXyBGOTJ-gKY.eyJ1IjoiaHR0cHM6Ly93d3cubWl0Y2hhc2h2aW0ub3JnLmlsLyIsIm0iOiJtYWlsIiwiYyI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9" rel="noopener noreferrer" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://shoutout.wix.com/so/edNCpYNwl/c?w%3D0yT4EeXdiYktM3FkyIPpV393x1_zubtrXyBGOTJ-gKY.eyJ1IjoiaHR0cHM6Ly93d3cubWl0Y2hhc2h2aW0ub3JnLmlsLyIsIm0iOiJtYWlsIiwiYyI6IjAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCJ9&amp;source=gmail&amp;ust=1596882988228000&amp;usg=AFQjCNGVXKN8IPPMPA85fmqSLDmt5p1h8g"><strong style="font-weight:normal"><span><span>You've
 received this email because you are a subscriber of <b><u>this site</u></b></span></span></strong></a></div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</td>
</tr>
</tbody>
</table>
<img src="https://ci4.googleusercontent.com/proxy/DcDX5C2pdbK6_DHKp-N0ZBzEeeYzjnGUA3eYaJED0C3ftXQkaLptUyJLlcbZKPvWBfGDtZT3mgwmxra9ZrboHJ0IgmSjSIWOtlF0xe4IM9TRRC2JAkuCNlb4o90_8h7-_fX8BzZXa8FN_2TZYY2PcXSV2aPOChNIMCuD8U6g2XbvB6S7AvYjff1eiBTzzqN-Xps_ZbvIYh5Ff_DuiuphlZhJVvEcq9-MXoUH-fwJe85fQ4DKKpV76FujRVSMOyFU4Hp4Htc6hY9nZN2-LVLiWuxYiEbC=s0-d-e1-ft#https://shoutout.wix.com/so/pixel/17f71be5-0cba-4ed4-9e6b-b06ae00acae0/251062a3-d116-4178-ae12-a469fe3115d0/bc6f2367-7e33-4869-af94-45e4c4d0d2ed/00000000-0000-0000-0000-000000000000/bottom/true" style="display:table;height:1px!important;width:1px!important;border:0!important;margin:0!important;padding:0!important" width="1" height="1" border="0" class="CToWUd"></div><div class="yj6qo"></div><div class="adL">
</div></div><div class="adL">
</div></div>
      `
      var subject = "";
      await RegisterDonorComponent.doDonorForm(pack(this.donor), subject, message);
      await this.context.openDialog(YesNoQuestionComponent, x => x.args = { question: "תודה על תרומך", showOnlyConfirm: true });
      window.location.href = "https://www.mitchashvim.org.il/";
    }
    catch (err) {
      this.dialog.exception("donor form", err);
    }
  }

  @ServerFunction({ allowed: true })
  static async doDonorForm(args: any[], subject: string, message: string, context?: Context) {
    await RegisterDonorComponent.sendMail(subject, message, args[4]);
    await executeOnServer(donorForm, args, context);
  }
}


class donorForm {
  constructor(private context: Context) {

  }
  name = new StringColumn({
    caption: "שם מלא", validate: () => {
      required(this.name);

    }
  });
  phone = new StringColumn({
    caption: "טלפון",
    dataControlSettings: () => ({ inputType: 'tel' }),
    validate: () => {
      required(this.phone);
      PhoneColumn.validatePhone(this.phone, this.context);
    }
  });
  email = new StringColumn({
    caption: "דואל",
    dataControlSettings: () => ({ inputType: 'email' })
  });

  selfDeliver = new BoolColumn("אגיע עצמאית למעבדה");
  address = new StringColumn({
    caption: "כתובת",
    validate: () => {
      if (!this.selfDeliver.value)
        required(this.address);
    }
  });

  computer = new NumberColumn("מספר מחשבים ניידים");
  laptop = new NumberColumn("מספר מחשבים נייחים");
  screen = new NumberColumn("מספר מסכים");


  columns = [this.name, this.selfDeliver, this.address, this.phone, this.email, this.computer, this.laptop, this.screen];


  async doWork(context: Context) {
    let f = context.for(Families).create();
    f.name.value = this.name.value;
    if (!this.address.value)
      this.address.value = '';
    f.address.value = this.address.value;
    f.phone1.value = this.phone.value;
    f.email.value = this.email.value;
    await f.save();
    var quantity = 0;
    async function addDelivery(type: string, q: number, isSelfDeliver: boolean) {
      if (q > 0) {
        quantity += q;
        await Families.addDelivery(f.id.value, {
          comment: '',
          basketType: type,
          courier: '',
          distCenter: allCentersToken,
          quantity: q,
          selfPickup: isSelfDeliver,
        }, context);
      }
    }
    await addDelivery('מחשב', this.computer.value, this.selfDeliver.value);
    await addDelivery('לפטופ', this.laptop.value, this.selfDeliver.value);
    await addDelivery('מסך', this.screen.value, this.selfDeliver.value);

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





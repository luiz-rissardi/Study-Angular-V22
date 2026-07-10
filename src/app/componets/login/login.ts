import { Component, inject, signal } from '@angular/core';
import { form, FormField, minLength, required, submit } from '@angular/forms/signals';
import { firstValueFrom, Observable } from 'rxjs';
import { UserService } from '../../services/user';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserState } from '../../states/user-state';

@Component({
  selector: 'app-login',
  imports: [FormField],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  private userLogin = signal({
    userName: "",
    password: ""
  });
  private userService = inject(UserService);
  private userState = inject(UserState);
  protected invalidCredentials = signal<boolean>(false);
  private routerService = inject(Router);

  protected userLoginForm = form(this.userLogin, (fields) => {
    required(fields.password, { message: "A senha é obrigatória" })
    required(fields.userName, { message: "o nome de usuário é obrigatória" })
    minLength(fields.password, 4, { message: "A senha deve conter no mínimo 4 caracteres!" });
  })

  async onSubmit(event: Event) {
    event.preventDefault();
    submit(this.userLoginForm, async () => {
      const formData = this.userLoginForm().value();

      try {
        const data = await this.userService.login(formData);
        this.userState.userState.set(data);
        this.invalidCredentials.set(false);
        this.routerService.navigate(["/home"]);
      } catch (error: any) {
        if (error?.status == 401) {
          this.invalidCredentials.set(true);
        }
      }
    })
  }
}

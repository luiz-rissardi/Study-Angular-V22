import { Component, inject, signal, WritableSignal } from '@angular/core';
import { FieldTree, form, required, email, minLength, validate, validateHttp, submit, FormField } from '@angular/forms/signals';
import { UserService } from '../../services/user';
import { UserFormModel } from '../form-card/form-card';
import { Router } from '@angular/router';

@Component({
  selector: 'app-change-user',
  imports: [FormField],
  templateUrl: './change-user.html',
  styleUrl: './change-user.scss',
})
export class ChangeUser {
  private routerService = inject(Router);
  private userService = inject(UserService);
  private userSignal: WritableSignal<UserFormModel> = signal({
    userName: "",
    age: null,
    email: "",
    password: "",
    userType: "0"
  })

  protected userForm: FieldTree<UserFormModel> = form(this.userSignal, (fields) => {
    required(fields.email, { message: 'O email é obrigatório!' });
    email(fields.email, { message: "email nvalido !" });
    minLength(fields.password, 4, { message: "A senha deve conter no mínimo 4 caracteres!" });
  })


  async onSubmit(event: Event) {
    event.preventDefault();
    submit(this.userForm, async () => {
      const formData = this.userForm().value();

      try {
        const data = await this.userService.putUser(formData);
        console.log(data);
        this.routerService.navigate(["/home"]);
      } catch (error) {
        console.log("error 2: ",error);
      }
      // const data: any = await firstValueFrom(this.userService.createUser(formData));
      // if (data?.isSuccess) {
      // }
    })
  }
}

import { ChangeDetectionStrategy, Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { email, FieldTree, form, FormField, minLength, required, submit, validate, validateHttp } from '@angular/forms/signals';
import { Router } from '@angular/router';
import { UserService } from '../../services/user';
import { firstValueFrom } from 'rxjs';

export interface UserFormModel {
  userName: string;
  email: string;
  password: string;
  age: number | null;
  userType: string;
}

export interface UserDomain {
  userName: string;
  email: string;
  age: number | null;
  userType: string;
  id: string;
}


@Component({
  selector: 'app-form-card',
  imports: [FormField],
  templateUrl: './form-card.html',
  styleUrl: './form-card.scss',
  inputs: ["disabled"],
  changeDetection: ChangeDetectionStrategy.OnPush // não prcisa, pois agora a partir da v22 é padrão
})
export class FormCard {

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
    const USER_TYPES = { DEFAULT: "0", VIP: "1" };

    //usuário do tipo default tem que ter obrigatoriamente 18 anos, para vip qualquer idade
    validate(fields.userType, (context) => {
      const userAge = Number(this.userForm.age().value());
      const userTypeAccount = context.value();

      if (userTypeAccount == USER_TYPES.DEFAULT && userAge < 18) {
        return {
          kind: "userType",
          message: "o usuário não tem a idade mínima para esse tipo de usuário"
        }
      }
      return null; // valid
    })

    validateHttp(fields.age, {
      debounce: 600,
      when:()=>{
        return this.userForm.age().touched() == true;
      },
      request: () => ({
        method: "GET",
        url: `/api/findUser/${this.userForm.userName().value()}`
      }),
      onSuccess: (res: any, context) => {
        const serverAge = res.userAge;
        const campoAgeAtual = context.value(); 

        if (Number(campoAgeAtual) === Number(serverAge)) {
          return null; 
        }

        return {
          kind: "age",
          message: res.message || "A idade não condiz com o usuário informado."
        };
      },
      onError: (error) => {
        console.log("error");
      }
    });
  })


  onSubmit(event: Event) {
    event.preventDefault();
    submit(this.userForm, async () => {
      const formData = this.userForm().value();

      const data: any = await firstValueFrom(this.userService.createUser(formData));
      if (data?.isSuccess) {
        this.routerService.navigate(["/auth/login"]);
      }
    })
  }

}

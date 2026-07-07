import { Component, effect, input } from '@angular/core';
import { UserDomain, UserFormModel } from '../form-card/form-card';
import { httpResource, HttpResourceRef } from '@angular/common/http';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';

@Component({
  selector: 'app-home',
  imports: [NgxSkeletonLoaderComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  protected user!:UserDomain;
  userId = input(null);

  protected userResource:HttpResourceRef<UserDomain | undefined> = httpResource<UserDomain>(() =>
    this.userId() != null ? `/api/user/${this.userId()}` : undefined
  );


  constructor() {
    effect(() => {
      if (this.userResource.error()) {
        console.error('Erro no resource');
      }
      if (this.userResource.hasValue()) {
        this.user = this.userResource.value();
      }
    });
  }
}
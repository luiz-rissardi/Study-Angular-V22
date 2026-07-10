import { Component, effect, input, signal } from '@angular/core';
import { UserDomain } from '../form-card/form-card';
import { httpResource, HttpResourceRef } from '@angular/common/http';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-home',
  imports: [NgxSkeletonLoaderComponent, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {

  protected user!: UserDomain;
  userId = signal(1);

  protected userResource: HttpResourceRef<UserDomain | undefined> = httpResource<UserDomain>(() =>
    this.userId() != null ? `/api/user` : undefined
  );


  constructor() {
    effect(() => {
      if (this.userResource.error()) {
        console.error('Erro no resource:', this.userResource.error());
      }
      if (this.userResource.hasValue()) {
        console.log(this.userResource.value());
        this.user = { ...this.userResource.value() };
      }
    });
  }
}
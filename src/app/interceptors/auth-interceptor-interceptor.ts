import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserService } from '../services/user';

export const authInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  const userService = inject(UserService);
  const accessToken = userService.getToken();

  const cloned = accessToken
    ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
    : req;

  return next(cloned);
};

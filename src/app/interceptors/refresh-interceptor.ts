import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, from, switchMap } from 'rxjs';
import { UserService } from '../services/user';
import { Router } from '@angular/router';

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const userService = inject(UserService);
  const router = inject(Router);

  // Não interceptar requests de auth (evita loop infinito)
  if (req.url.includes('/auth/')) {
    return next(req);
  }

  console.log("teste");

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // se o erro não for 401 (erros de autorização) passa o erro a diante no navegador
      if (err.status !== 401) return throwError(() => err);

      return from(userService.refresh()).pipe(
        switchMap((novoToken) => {
          console.log("reobtendo um access token ...");
          const retried = req.clone({ setHeaders: { Authorization: `Bearer ${novoToken}` } });
          return next(retried); // etapa 5: retry automático
        }),
        catchError(() => {
          userService.logout(); // etapa 6: falha
          router.navigate(['/auth/login']);
          return throwError(() => err);
        })
      );
    })
  );
};

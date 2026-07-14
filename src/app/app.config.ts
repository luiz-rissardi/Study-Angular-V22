import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNgxSkeletonLoader } from 'ngx-skeleton-loader';
import { delayInterceptor } from './interceptors/delay-interceptor';
import { authInterceptorInterceptor } from './interceptors/auth-interceptor-interceptor';
import { refreshInterceptor } from './interceptors/refresh-interceptor';
import { idempotencyKeyInterceptor } from './interceptors/idempotency-key-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    provideHttpClient(withInterceptors([delayInterceptor,authInterceptorInterceptor,refreshInterceptor,idempotencyKeyInterceptor])),
    provideNgxSkeletonLoader({
      theme: {
        extendsFromRoot: true,
        height: '30px',
      },
    })
  ]
};

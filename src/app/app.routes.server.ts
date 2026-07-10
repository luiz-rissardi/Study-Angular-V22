import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home',
    renderMode: RenderMode.Server
  },
  {
    path: 'form',
    renderMode: RenderMode.Server
  },
  {
    path: 'auth/login',
    renderMode: RenderMode.Server
  },
  {
    path: 'user/change',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  },
];

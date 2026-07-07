import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import cors from "cors";
import { randomUUID } from 'node:crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const angularApp = new AngularNodeAppEngine({
  allowedHosts: ['localhost', 'localhost:4000', 'your-production-domain.com']
});;

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 */

interface UserModel {
  userName: string;
  email: string;
  age: number | null;
  userType: string;
  id: string;
}

const db = new Map();

app.get("/api/user/:userId", (request, response) => {
  const { userId } = request.params || null;
  const user = db.get(userId);

  if (!user) {
    response.status(400).send("userId is not be null");
  } else {
    response.status(200).send(user);
  }
  response.end();
})

app.post("/api/user", (request, response) => {
  const user: UserModel = request.body;
  if (!user) {
    response.send({
      isSuccess: false,
      message: "user data not exist"
    })
  }
  user.id = randomUUID();
  db.set(user.id, user);
  
  response.send({
    userId: user.id,
    isSuccess: true,
  });
  response.end();
})

app.get('/api/findUser/:name', (req, res) => {
  const userName = req.params.name;
  const userAge = 27;

  if (userName === "Luiz") {
    res.status(200).send({
      isSuccess: true,
      userAge
    })
  } else {
    res.status(200).send({
      message: "idade de usuário inválido"
    })
  }

  res.end();
});


app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

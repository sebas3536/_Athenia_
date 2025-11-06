import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, {
  Request,
  Response as ExpressResponse,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const serverDistFolder: string = dirname(fileURLToPath(import.meta.url));
const browserDistFolder: string = join(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use('*', (req: Request, res: ExpressResponse, next: NextFunction): void => {
  angularApp
    .handle(req)
    .then((response: any): void => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        next();
      }
    })
    .catch((err: Error) => next(err));
});

const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: ExpressResponse,
  next: NextFunction,
): void => {
  console.error('Error del servidor SSR:', err.message);
  res.status(500).send('Error interno del servidor');
};

app.use(errorHandler);

if (isMainModule(import.meta.url)) {
  const port: number = Number(process.env['PORT']) || 4000;
  app.listen(port, (): void => {
    console.log(`Servidor Node Express escuchando en http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);

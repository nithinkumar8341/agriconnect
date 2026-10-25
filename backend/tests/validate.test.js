import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { createErrorHandler } from '../src/middleware/errorHandler.js';
import { validate } from '../src/middleware/validate.js';

function appWithValidation() {
  const app = express();
  app.use(express.json());
  app.post(
    '/products/:id',
    validate({
      params: z.object({ id: z.string().length(4) }),
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
      body: z.object({ quantity: z.number().positive() }),
    }),
    (req, res) => res.json({ params: req.params, query: req.query, body: req.body }),
  );
  app.use(createErrorHandler({ isProduction: true }));
  return app;
}

describe('validate middleware', () => {
  it('replaces each part with parsed data: coerced, defaulted and stripped', async () => {
    const res = await request(appWithValidation())
      .post('/products/abcd?page=3')
      .send({ quantity: 5, isAdmin: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ params: { id: 'abcd' }, query: { page: 3 }, body: { quantity: 5 } });
  });

  it('applies defaults when a part is omitted', async () => {
    const res = await request(appWithValidation()).post('/products/abcd').send({ quantity: 1 });

    expect(res.body.query).toEqual({ page: 1 });
  });

  it('reports every invalid field across parts, prefixed with the part name', async () => {
    const res = await request(appWithValidation())
      .post('/products/toolong?page=0')
      .send({ quantity: -2 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d) => d.field)).toEqual([
      'params.id',
      'query.page',
      'body.quantity',
    ]);
  });
});

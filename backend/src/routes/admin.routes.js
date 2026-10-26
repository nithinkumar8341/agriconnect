import { Router } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  listFraudFlags,
  listOrders,
  listUsers,
  resolveFraudFlag,
  setUserStatus,
} from '../services/admin.service.js';
import { listReturns, resolveReturn } from '../services/return.service.js';

const objectId = z.string().regex(/^[0-9a-f]{24}$/, 'is not a valid id');
const idParams = z.object({ id: objectId });
const paging = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

// Admin only. Every change an admin makes is written to the audit log by the service.
export function createAdminRouter({ requireAuth }) {
  const router = Router();
  router.use(requireAuth, requireRole('admin'));

  router.get(
    '/users',
    validate({
      query: z.object({
        role: z.enum(['farmer', 'buyer', 'agent', 'admin']).optional(),
        q: z.string().max(15).optional(),
        ...paging,
      }),
    }),
    async (req, res) => res.json(await listUsers(req.query)),
  );
  router.post(
    '/users/:id/status',
    validate({
      params: idParams,
      body: z.object({
        status: z.enum(['active', 'suspended']),
        reason: z.string().trim().max(300).optional(),
      }),
    }),
    async (req, res) =>
      res.json(await setUserStatus(req.user, req.params.id, req.body, { requestId: req.id })),
  );
  router.get(
    '/orders',
    validate({ query: z.object({ status: z.string().max(30).optional(), ...paging }) }),
    async (req, res) => res.json(await listOrders(req.query)),
  );
  router.get(
    '/fraud-flags',
    validate({
      query: z.object({ status: z.enum(['open', 'resolved', 'dismissed']).optional(), ...paging }),
    }),
    async (req, res) => res.json(await listFraudFlags(req.query)),
  );
  router.post(
    '/fraud-flags/:id/resolve',
    validate({
      params: idParams,
      body: z.object({
        status: z.enum(['resolved', 'dismissed']),
        note: z.string().trim().max(500).optional(),
      }),
    }),
    async (req, res) =>
      res.json(await resolveFraudFlag(req.user, req.params.id, req.body, { requestId: req.id })),
  );
  router.get(
    '/returns',
    validate({ query: z.object({ status: z.enum(['open', 'resolved']).optional(), ...paging }) }),
    async (req, res) => res.json(await listReturns(req.query)),
  );
  router.post(
    '/returns/:id/resolve',
    validate({
      params: idParams,
      body: z.object({
        decision: z.enum(['approve', 'reject']),
        note: z.string().trim().max(500).optional(),
      }),
    }),
    async (req, res) =>
      res.json(await resolveReturn(req.user, req.params.id, req.body, { requestId: req.id })),
  );
  return router;
}

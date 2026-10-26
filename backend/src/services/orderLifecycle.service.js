import mongoose from 'mongoose';
import { Order } from '../models/Order.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { actorFromUser, recordAudit } from './audit.service.js';
import { createDeliveryOtp, DELIVERY_OTP_MAX_ATTEMPTS } from './deliveryOtp.js';
import { notify } from './notification.service.js';
import { ORDER_ACTIONS } from './orderStateMachine.js';
import {
  buyerContext,
  buyerDisplayName,
  restoreStock,
  toBuyerOrder,
  toFarmerOrder,
} from './orders.service.js';
import { refundOrder, settleDeliveredOrder } from './payment.service.js';
import { findReturnForOrder, returnWindowOpen, toReturnView } from './return.service.js';
import { hasReview } from './review.service.js';
import { orderSmsMessage } from './sms/templates.js';

const notFound = () => new AppError(404, 'NOT_FOUND', 'Not found');
const OTP_FIELDS = '+deliveryOtpHash +deliveryOtpAttempts +deliveryOtpSalt';
const ownerField = (role) => (role === 'farmer' ? 'farmerId' : 'buyerId');

// Order status changes for both roles. Every change is one transaction: a conditional status
// update (so two actions can never both win), stock restored where the rules say so, a status
// history entry, an audit entry and an in-app notification for the other party. Key events also
// send the buyer an SMS in their language, after the change is committed.
export function createOrderLifecycle({ config, smsProvider, logger }) {
  const otp = createDeliveryOtp(config.auth.otpHmacSecret);

  async function loadOwn(user, id, { withOtp = false } = {}) {
    if (!['farmer', 'buyer'].includes(user.role)) throw notFound();
    const query = Order.findOne({ _id: id, [ownerField(user.role)]: user._id });
    const order = await (withOtp ? query.select(OTP_FIELDS) : query).lean();
    if (!order) throw notFound();
    return order;
  }

  async function viewFor(user, order) {
    if (user.role === 'farmer') {
      const buyer = await User.findById(order.buyerId).select('phone').lean();
      return toFarmerOrder(
        {
          ...order,
          deliveryOtpLocked: (order.deliveryOtpAttempts ?? 0) >= DELIVERY_OTP_MAX_ATTEMPTS,
        },
        { buyerPhone: buyer?.phone },
      );
    }
    const context = await buyerContext(order);
    const deliveryCode = order.deliveryOtpSalt
      ? otp.codeFor(order._id.toString(), order.deliveryOtpSalt)
      : null;
    const view = toBuyerOrder(order, { ...context, deliveryCode });
    view.canReview = order.status === 'delivered' && !(await hasReview(order._id));
    const existingReturn = await findReturnForOrder(order._id);
    view.returnRequest = toReturnView(existingReturn) ?? null;
    view.canReturn = !existingReturn && (await returnWindowOpen(order));
    return view;
  }

  async function getOrder(user, id) {
    return viewFor(user, await loadOwn(user, id, { withOtp: true }));
  }

  // Wrong codes are counted; after the limit the farmer can only mark the delivery as failed.
  async function checkDeliveryCode(order, code) {
    if ((order.deliveryOtpAttempts ?? 0) >= DELIVERY_OTP_MAX_ATTEMPTS) {
      throw new AppError(429, 'DELIVERY_OTP_LOCKED', 'Too many wrong codes for this order');
    }
    if (otp.verify(order._id.toString(), code, order.deliveryOtpHash)) return;
    const updated = await Order.findOneAndUpdate(
      { _id: order._id },
      { $inc: { deliveryOtpAttempts: 1 } },
      { returnDocument: 'after', projection: { deliveryOtpAttempts: 1 } },
    ).lean();
    throw new AppError(400, 'DELIVERY_OTP_WRONG', 'That code is not right', {
      attemptsLeft: Math.max(0, DELIVERY_OTP_MAX_ATTEMPTS - updated.deliveryOtpAttempts),
    });
  }

  async function sendBuyerSms(order) {
    try {
      const [buyer, { farmerProfile }] = await Promise.all([
        User.findById(order.buyerId).select('phone language').lean(),
        buyerContext(order),
      ]);
      const view = toBuyerOrder(order, {});
      const message = orderSmsMessage(order.status, buyer.language, {
        farmer: farmerProfile.name.trim().split(/\s+/)[0],
        date: view.delivery.date.split('-').reverse().slice(0, 2).join('/'),
        code: otp.codeFor(order._id.toString(), order.deliveryOtpSalt),
      });
      if (message) await smsProvider.send({ to: buyer.phone, message });
    } catch (err) {
      // The status change is already saved; a failed SMS must not undo it.
      logger.warn({ err, orderId: order._id.toString() }, 'order SMS failed');
    }
  }

  async function transition(user, id, action, { reason, code, requestId } = {}) {
    const rule = ORDER_ACTIONS[action];
    if (!rule || rule.by !== user.role) throw new AppError(403, 'FORBIDDEN', 'Not allowed');
    if (rule.needsReason && !reason) {
      throw new AppError(400, 'REASON_REQUIRED', 'Please give a reason');
    }
    const current = await loadOwn(user, id, { withOtp: true });
    if (!rule.from.includes(current.status)) {
      throw new AppError(409, 'INVALID_STATUS_CHANGE', 'This order can no longer be changed', {
        status: current.status,
      });
    }
    // A UPI order is only real once paid; the farmer should not pack produce before that.
    if (
      action === 'accept' &&
      current.paymentMethod === 'upi' &&
      current.paymentStatus !== 'held'
    ) {
      throw new AppError(409, 'PAYMENT_PENDING', 'The buyer has not paid yet');
    }
    if (action === 'deliver') await checkDeliveryCode(current, code);

    const now = new Date();
    const set = { status: rule.to };
    if (action === 'accept') {
      const issued = otp.issue(current._id.toString());
      Object.assign(set, {
        deliveryOtpSalt: issued.salt,
        deliveryOtpHash: issued.hash,
        deliveryOtpAttempts: 0,
      });
    }
    if (action === 'deliver') {
      set.deliveredAt = now;
      // Cash on delivery is collected at handover (CLAUDE.md); held UPI money is released.
      if (current.paymentMethod === 'cod' || current.paymentStatus === 'held') {
        set.paymentStatus = 'paid';
      }
    }

    const order = await mongoose.connection.transaction(async (session) => {
      const updated = await Order.findOneAndUpdate(
        { _id: current._id, status: { $in: rule.from } },
        {
          $set: set,
          $push: { statusHistory: { status: rule.to, at: now, byUserId: user._id, reason } },
        },
        { session, returnDocument: 'after' },
      )
        .select(OTP_FIELDS)
        .lean();
      // Someone else changed it between our read and this update (for example cancel vs accept).
      if (!updated) {
        throw new AppError(
          409,
          'INVALID_STATUS_CHANGE',
          'This order just changed. Please refresh.',
        );
      }
      if (rule.restock) await restoreStock(updated, session);
      if (rule.restock && updated.paymentStatus === 'held') {
        await refundOrder(updated, { reason: reason ?? rule.to, session });
        updated.paymentStatus = 'refunded';
      }
      if (rule.to === 'delivered') await settleDeliveredOrder(updated, session);
      await recordAudit(
        {
          actor: actorFromUser(user),
          action: `order.${rule.to}`,
          entityType: 'Order',
          entityId: updated._id,
          before: { status: current.status },
          after: { status: rule.to },
          reason,
          requestId,
        },
        { session },
      );
      const toFarmer = user.role === 'buyer';
      await notify(
        {
          userId: toFarmer ? updated.farmerId : updated.buyerId,
          templateKey: `order.${rule.to}`,
          params: {
            orderId: updated._id.toString(),
            name: toFarmer
              ? await buyerDisplayName(updated)
              : (await buyerContext(updated)).farmerProfile.name.trim().split(/\s+/)[0],
            ...(reason && { reason }),
          },
          link: toFarmer ? `/farmer/orders/${updated._id}` : `/buyer/orders/${updated._id}`,
        },
        { session },
      );
      return updated;
    });

    if (['accepted', 'out_for_delivery', 'delivered'].includes(order.status)) {
      await sendBuyerSms(order);
    }
    return viewFor(user, order);
  }

  return { getOrder, transition };
}

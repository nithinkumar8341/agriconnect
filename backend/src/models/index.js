import { AppConfig } from './AppConfig.js';
import { AuditLog } from './AuditLog.js';
import { BuyerProfile } from './BuyerProfile.js';
import { Complaint } from './Complaint.js';
import { Crop } from './Crop.js';
import { FarmerProfile } from './FarmerProfile.js';
import { FraudFlag } from './FraudFlag.js';
import { LedgerEntry } from './LedgerEntry.js';
import { MediaAsset } from './MediaAsset.js';
import { Notification } from './Notification.js';
import { Order } from './Order.js';
import { OtpRequest } from './OtpRequest.js';
import { Payment } from './Payment.js';
import { PriceReference } from './PriceReference.js';
import { Product } from './Product.js';
import { ReturnRequest } from './ReturnRequest.js';
import { Review } from './Review.js';
import { Session } from './Session.js';
import { User } from './User.js';

export const ALL_MODELS = [
  AppConfig,
  AuditLog,
  BuyerProfile,
  Complaint,
  Crop,
  FarmerProfile,
  FraudFlag,
  LedgerEntry,
  MediaAsset,
  Notification,
  Order,
  OtpRequest,
  Payment,
  PriceReference,
  Product,
  ReturnRequest,
  Review,
  Session,
  User,
];

// Builds every declared index and drops ones no longer declared, so the database matches the code.
export async function syncAllIndexes() {
  for (const model of ALL_MODELS) {
    await model.syncIndexes();
  }
}

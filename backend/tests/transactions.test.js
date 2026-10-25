import mongoose from 'mongoose';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

// Proves the test database supports transactions, so checkout rollback can be tested in Prompt 10.
describe('MongoDB transactions in the test database', () => {
  const Stock = mongoose.model('TxStock', new mongoose.Schema({ name: String, qty: Number }));

  beforeAll(async () => {
    await connectTestDb('transactions-test');
    await Stock.createCollection();
  });

  afterAll(async () => {
    await dropTestDbAndDisconnect();
  });

  beforeEach(async () => {
    await Stock.deleteMany({});
    await Stock.create({ name: 'tomato', qty: 10 });
  });

  it('commits all writes when the transaction succeeds', async () => {
    await mongoose.connection.transaction(async (session) => {
      await Stock.updateOne({ name: 'tomato' }, { $inc: { qty: -3 } }, { session });
      await Stock.create([{ name: 'onion', qty: 5 }], { session });
    });

    expect((await Stock.findOne({ name: 'tomato' })).qty).toBe(7);
    expect(await Stock.countDocuments({ name: 'onion' })).toBe(1);
  });

  it('rolls back every write when the transaction throws', async () => {
    await expect(
      mongoose.connection.transaction(async (session) => {
        await Stock.updateOne({ name: 'tomato' }, { $inc: { qty: -3 } }, { session });
        await Stock.create([{ name: 'onion', qty: 5 }], { session });
        throw new Error('third item out of stock');
      }),
    ).rejects.toThrow('third item out of stock');

    expect((await Stock.findOne({ name: 'tomato' })).qty).toBe(10);
    expect(await Stock.countDocuments({ name: 'onion' })).toBe(0);
  });
});

import { DISTRICTS } from '../data/districts.js';
import { User } from '../models/User.js';
import { getOwnProfile, saveBuyerProfile, saveFarmerProfile } from '../services/profile.service.js';

export async function getMyProfile(req, res) {
  res.json({ role: req.user.role, profile: await getOwnProfile(req.user) });
}

export async function putFarmerProfile(req, res) {
  res.json({ profile: await saveFarmerProfile(req.user, req.body) });
}

export async function putBuyerProfile(req, res) {
  res.json({ profile: await saveBuyerProfile(req.user, req.body) });
}

export async function updateMe(req, res) {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { language: req.body.language },
    { returnDocument: 'after', runValidators: true },
  );
  res.json({ user: user.toPublic() });
}

export function listDistricts(req, res) {
  const states = req.query.state ? [req.query.state] : Object.keys(DISTRICTS);
  // Static reference data: let browsers and the service worker reuse it for a day.
  res.set('Cache-Control', 'public, max-age=86400');
  res.json({
    states: states.map((state) => ({ state, districts: DISTRICTS[state] })),
  });
}

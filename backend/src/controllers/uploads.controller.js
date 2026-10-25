import { toPublicAsset } from '../services/media.service.js';

export function createUploadsController(mediaService) {
  return {
    async uploadPhoto(req, res) {
      const asset = await mediaService.uploadPhoto(req.user, {
        buffer: req.file.buffer,
        capturedAt: req.body.capturedAt,
      });
      res.status(201).json({ asset: toPublicAsset(asset) });
    },

    async deletePhoto(req, res) {
      await mediaService.deletePhoto(req.user, req.params.id);
      res.status(204).end();
    },
  };
}

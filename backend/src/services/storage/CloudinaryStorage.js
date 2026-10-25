import { v2 as cloudinary } from 'cloudinary';

// Production storage. Uploads are signed server-side with the API secret, which never reaches the
// browser. The image is already processed (metadata stripped, resized), so it is stored as-is.
export class CloudinaryStorage {
  constructor({ cloudName, apiKey, apiSecret }) {
    this.provider = 'cloudinary';
    this.client = cloudinary;
    this.client.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  put({ key, buffer }) {
    const publicId = key.replace(/\.[a-z]+$/, '');
    return new Promise((resolve, reject) => {
      const stream = this.client.uploader.upload_stream(
        { public_id: publicId, resource_type: 'image', overwrite: false },
        (error, result) => (error ? reject(error) : resolve({ url: result.secure_url })),
      );
      stream.end(buffer);
    });
  }

  async remove(key) {
    await this.client.uploader.destroy(key.replace(/\.[a-z]+$/, ''), { resource_type: 'image' });
  }
}

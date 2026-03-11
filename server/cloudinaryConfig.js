const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: "volunteer_pulse_profiles",
      allowed_formats: ["jpg", "png", "jpeg"],
      transformation: [
        { width: 500, height: 500, crop: "thumb", gravity: "face" },
      ],
      // 👇 FIX: We REMOVED the forced public_id.
      // Cloudinary will now generate a completely unique filename for every upload, bypassing all caches!
    };
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };

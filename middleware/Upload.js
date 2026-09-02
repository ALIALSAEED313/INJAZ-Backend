const multer = require("multer");
const ImageKit = require("imagekit");
const path = require("path");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const chatUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = new Set([
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ]);
    callback(allowedTypes.has(file.mimetype) ? null : new Error("Unsupported file type"), allowedTypes.has(file.mimetype));
  },
});

const DELIVERY_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
]);
const DELIVERY_ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".zip",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
]);

const deliveryUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed =
      DELIVERY_ALLOWED_TYPES.has(file.mimetype) &&
      DELIVERY_ALLOWED_EXTENSIONS.has(extension);
    callback(
      allowed ? null : new Error("Unsupported delivery file type"),
      allowed,
    );
  },
});

const uploadToImageKit = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files.length) {
      return next();
    }

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-");
        const response = await imagekit.upload({
          file: file.buffer,
          fileName: `injaz-${Date.now()}-${safeName}`,
          folder: req.baseUrl?.includes("/profile")
            ? "/injaz_avatars"
            : req.baseUrl?.includes("/chat")
              ? "/injaz_chat"
              : req.baseUrl?.includes("/orders")
                ? "/injaz_deliveries"
              : "/injaz_services",
        });

        return {
          ...file,
          url: response.url,
          fileId: response.fileId,
        };
      }),
    );

    if (req.file) {
      req.file.url = uploadedFiles[0].url;
      req.file.fileId = uploadedFiles[0].fileId;
    }

    if (req.files) {
      req.files = uploadedFiles;
    }

    next();
  } catch (error) {
    console.error("ImageKit Upload Error:", error);
    return res.status(500).json({
      message: "Error uploading image",
      error: error.message,
    });
  }
};

module.exports = {
  upload,
  chatUpload,
  deliveryUpload,
  uploadToImageKit,
};

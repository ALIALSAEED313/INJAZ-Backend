const multer = require("multer");
const ImageKit = require("imagekit");

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

const uploadToImageKit = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);

    if (!files.length) {
      return next();
    }

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const response = await imagekit.upload({
          file: file.buffer,
          fileName: `injaz-${Date.now()}-${file.originalname}`,
          folder: req.baseUrl?.includes("/profile")
            ? "/injaz_avatars"
            : req.baseUrl?.includes("/chat")
              ? "/injaz_chat"
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
  uploadToImageKit,
};

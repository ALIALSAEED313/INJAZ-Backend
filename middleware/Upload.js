const multer = require('multer');
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

const uploadToImageKit = async (req, res, next) => {
    try {
        if (!req.file) {
            return next(); 
        }

        const response = await imagekit.upload({
            file: req.file.buffer, 
            fileName: `injaz-${Date.now()}-${req.file.originalname}`, 
            folder: '/injaz_avatars', 
        });

        
        req.file.url = response.url;
        req.file.fileId = response.fileId; 

        next();
    } catch (error) {
        console.error("ImageKit Upload Error:", error);
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
};

module.exports = {
    upload,
    uploadToImageKit
};
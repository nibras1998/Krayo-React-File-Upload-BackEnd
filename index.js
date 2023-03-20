const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const mime = require('mime');

const app = express();
app.use(cors());
app.use(express.json())
const port = process.env.PORT || 5000;

const upload = (userId) => {
    const userDirectory = `./uploads/${userId}`;
    if (!fs.existsSync(userDirectory)){
        fs.mkdirSync(userDirectory);
    }
    
    const storage = multer.diskStorage({
        destination: userDirectory,
        filename: function (req, file, cb) {
            const timestamp = Date.now();
            const originalName = file.originalname;
            const extension = path.extname(originalName);
            const filename = `${originalName}-${timestamp}${extension}`;
            cb(null, filename);
        }
    });

    return multer({
        storage: storage,
        limits: { fileSize: Infinity },
    }).single('file');
}




app.post('/api/upload/:userId', (req, res) => {
    const userId = req.params.userId;
    const uploader = upload(userId);
    uploader(req, res, (err) => {
        if (err) {
            res.status(400).json({ message: err.message });
        } else {
            res.status(200).json({ message: 'File uploaded successfully' });
        }
    });
});




app.get('/api/files/:userId', (req, res) => {
    const userId = req.params.userId;
    const userDirectory = `./uploads/${userId}`;
    fs.readdir(userDirectory, (err, files) => {
        if (err) {
            res.status(500).json({ message: err.message, cause:"No files to show" });
        } else {
            const fileNames = files.map((file) => ({ name: file, type: mime.lookup(file) }));
            res.status(200).json({ files: fileNames });
        }
    });
});




app.get('/api/files/:userId/:filename', (req, res) => {
    const userId = req.params.userId;
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', userId, filename);
    res.sendFile(filepath);
});



app.listen(port, () => console.log(`Server running on port ${port}`));
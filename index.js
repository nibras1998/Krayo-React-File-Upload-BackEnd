express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors')
const mime = require('mime');
const CLIENT_ID = "ClientID"
const axios = require('axios');

async function verifyToken(token) {
//To check the token is valid or not
    try {
        const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
        const { data } = response;
        if (data.aud !== CLIENT_ID) {
            throw new Error('Invalid client ID');
        }
        return data;
    } catch (error) {
        return null

    }
}

const app = express();
app.use(cors());
app.use(express.json())
const port = process.env.PORT || 5000;





const upload = (userId) => {
    const userDirectory = `./uploads/${userId}`;
    if (!fs.existsSync(userDirectory)) {
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


app.post('/api/upload/:userId', async (req, res) => {
    const userId = req.params.userId;
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
        
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const accessToken = authorizationHeader.split(' ')[1];
    const verifier = await verifyToken(accessToken);
    
    if (!verifier || verifier.sub!==userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const uploader = upload(userId);
    uploader(req, res, (err) => {
        if (err) {
            res.status(400).json({ message: err.message });
        } else {
            res.status(200).json({ message: 'File uploaded successfully' });
        }
    });
});


app.get('/api/files/:userId', async (req, res) => {
    const userId = req.params.userId;
    const authorizationHeader = req.headers.authorization;
    
    if (!authorizationHeader) {

        return res.status(401).json({ message: 'Unauthorized' });
    }

    const accessToken = authorizationHeader.split(' ')[1];

    const verifier = await verifyToken(accessToken);
    
    if (!verifier || verifier.sub!==userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }


    const userDirectory = `./uploads/${userId}`;
    fs.readdir(userDirectory, (err, files) => {
        if (err) {
            res.status(500).json({ message: err.message, cause: "No files to show" });
        } else {
            const fileNames = files.map((file) => ({ name: file, type: mime.lookup(file) }));
            res.status(200).json({ files: fileNames });
        }
    });
});


app.get('/api/files/:userId/:filename', async (req, res) => {
    const userId = req.params.userId;
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', userId, filename);
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
        
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const accessToken = authorizationHeader.split(' ')[1];

    const verifier = await verifyToken(accessToken);
    
    if (!verifier || verifier.sub!==userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    res.sendFile(filepath);
});

app.get('/api/files/display/:userId/:filename/:accessToken', async (req, res) => {
    const userId = req.params.userId;
    const accessToken = req.params.accessToken
    const filename = req.params.filename;
    const filepath = path.join(__dirname, 'uploads', userId, filename);

    if (!accessToken) {

        return res.status(401).json({ message: 'Unauthorized' });
    }


    const verifier = await verifyToken(accessToken);

    if (!verifier || verifier.sub!==userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    res.sendFile(filepath);
});

app.listen(port, () => console.log(`Server running on port ${port}`));

const express = require('express');
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const cors = require('cors');
const dotenv = require('dotenv');

// Basic Configuration
dotenv.config();
const app = express();
const db = process.env.MONGO_URI;
const shortID = process.env.SHORT_ID;
const myUrl = process.env.MY_URL;
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('/public'));
app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// === CONNECT TO DATABASE === \\
(async () => await mongoose.connect(db, { useNewUrlParser: true }))();

// === SCHEMA & MODEL === \\
const Short = mongoose.model(
  'Short',
  new mongoose.Schema({
    short: { type: Number, default: 0 }
  })
);

const Url = mongoose.model(
  'Url',
  new mongoose.Schema({
    urlInput: String,
    urlOutput: String,
    urlShort: String
  })
);

let currentShort;

Short.findById(shortID, (req, res) => {
  currentShort = res.short;
});

// === REQUEST NEW SHORTENING === \\
app.post('/api/shorturl/new', async (req, res) => {
  const urlInput = req.body.url;

  if (validUrl.isUri(urlInput)) {
    let url = await Url.findOne({ urlInput });

    if (!url) {
      // Create new short URL
      currentShort++;
      const urlOutput = `${myUrl}/${currentShort}`;

      await Short.findByIdAndUpdate(
        shortID,
        { $set: { short: currentShort } },
        { new: true }
      );

      url = new Url({
        urlInput,
        urlOutput,
        urlShort: currentShort
      });

      const urlRespond = {
        original_url: urlInput,
        short_url: currentShort
      };

      await url.save();
      res.json(urlRespond);
    } else {
      // Prevent duplicate
      res.json(url);
    }
  } else {
    return res.status(401).json('Invalid URL');
  }
});

// === OPEN SHORTENED AND REDIRECT === \\
app.get('/:short', async (req, res) => {
  const url = await Url.findOne({ urlShort: req.params.short });

  if (url) {
    return res.redirect(url.urlInput);
  } else {
    return res.status(404).json('URL does not exist...');
  }
});

// === LISTEN === \\
app.listen(port, function() {
  console.log(`Node.js listening on port ${port}`);
});

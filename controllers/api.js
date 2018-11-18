const { promisify } = require('util');
const request = require('request');
const mongoose = require('mongoose');
const FormData = require('form-data');
const fs = require('fs');

var clothingSchema = new mongoose.Schema({
  img: { data: Buffer, contentType: String },
  originalname: String,
  path: String,
  colors: { type: String, text: true },
  styles: { type: String, text: true },
  garments: { type: String, text: true }
});

var ClothingModel = mongoose.model('Clothing', clothingSchema)


function searchPhoto(photo, resHandle) {
  let formdata = {
   filename: fs.createReadStream(photo.path),
   access_key: process.env.ACCESS_KEY,
   secret_key: process.env.SECRET_KEY
 }

 request.post({ url: process.env.API_URL, formData: formdata }, (err, res, body) => {
   parseResults(JSON.parse(res.body), photo, resHandle)
 })
};

function parseResults(data, photo, resHandle) {
  // remove the temp search file
  fs.unlinkSync(photo.path);

  var colorArr = []
  data.person.colors.forEach(function(element) {
    colorArr.push(element.colorGeneralCategory)
  });
  var colorArr = [...new Set(colorArr)]

  var styleArr = []
  data.person.styles.forEach(function(element) {
    styleArr.push(element.styleName)
  });
  var styleArr = [...new Set(styleArr)]

  var garmentArr = []
  data.person.garments.forEach(function(element) {
    garmentArr.push(element.typeName)
  });
  var garmentArr = [...new Set(garmentArr)]
  console.log(colorArr)
  console.log(styleArr)
  console.log(garmentArr)

  var searchStr = colorArr.join(' ') + ' ' + styleArr.join(' ') + ' ' + garmentArr.join(' ')
  ClothingModel.find({ $text: { $search: searchStr } }, function(err, docs) {
    console.log(docs);
    resHandle.render('api/search', {
      title: 'Image Search',
      docs: docs.slice(0, 4) //only return top 4
    });
  });
};


function uploadPhoto(photo) {
  let formdata = {
   filename: fs.createReadStream(photo.path),
   access_key: process.env.ACCESS_KEY,
   secret_key: process.env.SECRET_KEY
 };

 request.post({ url: process.env.API_URL, formData: formdata }, (err, res, body) => {
   uploadGarment(JSON.parse(res.body), photo)
 })
};

function uploadGarment(data, photo) {
  console.log(data)

  var colorArr = []
  data.person.colors.forEach(function(element) {
    colorArr.push(element.colorGeneralCategory)
  });
  var colorArr = [...new Set(colorArr)]

  var styleArr = []
  data.person.styles.forEach(function(element) {
    styleArr.push(element.styleName)
  });
  var styleArr = [...new Set(styleArr)]

  var garmentArr = []
  data.person.garments.forEach(function(element) {
    garmentArr.push(element.typeName)
  });
  var garmentArr = [...new Set(garmentArr)]

  let msg = new ClothingModel({
    img: photo.file,
    originalname: photo.originalname,
    path: photo.path.replace('public/', ''),
    colors: colorArr,
    styles: styleArr,
    garments: garmentArr
  });
  msg.save()
     .then(doc => {
       console.log('Successfully added the following garment to the db.')
       console.log(doc)
     })
     .catch(err => {
       console.error(err)
     })
};

function showDatabase(resHandle) {
  ClothingModel.find(function(err, docs) {
    // console.log(docs);
    resHandle.render('api/database', {
      title: 'Image Search',
      docs
    });
  });
};

var docs = [{originalname: '', path: '', colors: '', styles: '', garments:''}];
exports.getFileUpload = (req, res) => {
  res.render('api/search', {
    title: 'Image Search',
    docs
  });
};

exports.postFileUpload = (req, res, next) => {
  console.log(req.file);
  req.flash('success', { msg: 'File was uploaded successfully. Please wait shortly for the top 4 matches.' });
  searchPhoto(req.file, res)
};

exports.getAddGarment = (req, res) => {
  res.render('api/upload', {
    title: 'Upload Garment'
  });
};

exports.postAddGarment = (req, res, next) => {
  console.log(req.file);
  uploadPhoto(req.file);

  req.user.score +=1;
  const user = req.user.save((err) => {
                if (!err) {
                    req.flash('success', { msg: 'File was uploaded successfully to the database. You have earned 1 points!' });
                    res.redirect('/api/upload');
                }
            });
};


exports.getDatabaseEntries = (req, res) => {
  showDatabase(res);
};

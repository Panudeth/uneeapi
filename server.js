var express = require('express')
var multer = require('multer')
var path = require('path')
var fs = require('fs')
var sharp = require('sharp')
var cors = require('cors')

var admin = require('firebase-admin')
var privateKeys = require('./assets/routeemp-firebase-adminsdk-ni4so-7e695ec9c8.json')
var corsTool = cors({ origin: true })

sharp.cache({ files: 0 })

admin.initializeApp({
  credential: admin.credential.cert(privateKeys),
  databaseURL: 'https://routeemp.firebaseio.com'
})

var app = express()

app.use(cors())

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images')
  },
  filename: (req, file, cb) => {
    cb(null, `image_${Date.now()}.JPEG`)
  }
})

// var HOST = process.env.HOST || 'http://localhost:3031'
var linkLocal = 'http://128.199.218.28:3031/images/'
// var linkLocal = 'http://localhost:3031/images/'
var imageFolder = 'images'

var uploadFile = multer({
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  dest: 'images/',
  storage
})

app.get('/test', (req, res) => {
  res.send('success')
})

app.get('/images/:images/', (req, res) => {
  try {
    console.log('params', req.params)
    const { images } = req.params

    const filePath = path.join(__dirname, `${imageFolder}`, images)
    // const filePath = `${HOST}/images/${images}`
    console.log('filePath', filePath)
    res.sendFile(filePath)
  } catch (error) {
    res.status(500).send(error)
  }
})

app.post('/fileUpload', uploadFile.array('file', 5), async (req, res, next) => {
  const token = req.headers.authorization

  // image array from multer
  const fileArray = Array.from(req.files)
  try {
    const verify = await admin.auth().verifyIdToken(token)

    if (verify !== undefined) {
      // resize image
      fileArray.forEach(image => {
        sharp(image.path, {
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
          .resize({ width: 500 })
          .jpeg({ quality: 90 })
          .toBuffer((err, buffer) => {
            // write file replace old full size image
            fs.writeFile(image.path, buffer, e => {
              console.log('Error', e)
            })
          })
      })

      const pathImg = fileArray.map(each => ({
        imgPath: `${linkLocal}${each.filename}`,
        fileName: each.filename
      }))

      return res.send(pathImg)
    } else {
      console.log('else')
      return res.status(500).send("can't verify token")
    }
  } catch (error) {
    console.log('Error 555', error.message)
    fileArray.forEach(each => {
      // delete image when wrong token
      fs.unlinkSync(each.path)
    })
    return res.status(500).send(error)
  }
})

app.listen(3031, () => {
  console.log('App running on port 3031')
})

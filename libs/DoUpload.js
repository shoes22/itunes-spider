const AWS = require('aws-sdk');
const fs = require('fs');
const Promise = require('bluebird');

// Configure client for use with Spaces
const result_url = process.env.do_space_url;
const spacesEndpoint = new AWS.Endpoint(process.env.do_space_endpoint);
let accessKeyId = process.env.do_space_id;
let secretAccessKey = process.env.do_space_secret;
let bucketName = process.env.do_space_bucket_name;
let doSpaceSubfolder = process.env.do_space_subfolder;
let do_ACL = process.env.do_space_acl;
const s3 = new AWS.S3({
  endpoint: spacesEndpoint,
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey
});


const getParamsForUpload = (filePath, filenName, contentType) => {
  const doFileName = `${doSpaceSubfolder}/${filenName}`;
  const data = fs.readFileSync(filePath);
  
  return new Promise((resolve, reject) => {
    if(data) {
      const base64data = Buffer.from(data, 'binary');
      resolve({
        Body: base64data,
        Bucket: bucketName,
        Key: doFileName,
        ACL: do_ACL,
        ContentType: contentType
      })
    } else {
      reject(`Cannot load ${filePath}`)
    }
  })  
}

const upload = (filePath, filenName, contentType) => {
  return getParamsForUpload(filePath, filenName, contentType)
  .then((params) => {
    return s3.putObject(params).promise()
  })
  .then(() => {
    // remove files from uploads directory
    fs.unlinkSync(filePath);
    return null;
  })
  .catch((err) => {
    return err;
  })
}

module.exports = {
  upload
}

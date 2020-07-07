import GitHub from 'github-api'
import axios from 'axios'
import {adminConfig} from '~/utils/config'

let parseString = require('xml2js').parseString


// This retrieved meta from the github cache
export async function getMetaEntries() {
  let result = {}
  let response = await axios.get('https://raw.githubusercontent.com/jimmyangel/geoportal-data/master/meta.json')
  return response.data
}

export async function getFileSize(fileName) {
  let response = await axios.head('https://geoportalp.s3-us-west-2.amazonaws.com/files/' + fileName)
  return response.headers['content-length']
}

export function getListOfFiles() {
  return new Promise((resolve, reject) => {
    axios.get('https://geoportalp.s3-us-west-2.amazonaws.com/?list-type=2&prefix=files').then(response => {
      parseString(response.data, (err, result) => {
        resolve(
          result.ListBucketResult.Contents.map(item => {
            return {name: item.Key[0].replace('files/', ''), size: item.Size[0], date: item.LastModified[0]}
          }).filter(el => el.name != '')
        )
      })
    })
  })
}

// This retrieves live meta from github repo
export async function getMetaFromRepo(token) {
  let github = new GitHub({token: token})

  let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getContents('master', 'meta.json', true)
  return response.data.collection
}

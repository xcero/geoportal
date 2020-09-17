import GitHub from 'github-api'
import axios from 'axios'
import {Base64} from 'js-base64'
import {adminConfig, dataConfig} from '~/utils/config'
import {makeColorTableParameter} from '~/utils/misc'

let parseString = require('xml2js').parseString


// This retrieves meta from the github cache
export async function getMetaEntries() {
  let response = await axios.get(dataConfig.metaBaseUrl + dataConfig.metaFileName)
  return response
}

// This gets the size of a file
export async function getFileSize(fileName) {
  let response = await axios.head(dataConfig.filesBaseUrl + dataConfig.filesDirectory + '/' + fileName)
  return response.headers['content-length']
}

// This gets the list of stored files
export function getListOfFiles() {
  return new Promise((resolve, reject) => {
    axios.get(dataConfig.filesBaseUrl + '?list-type=2&prefix=' + dataConfig.filesDirectory).then(response => {
      parseString(response.data, (err, result) => {
        if (result.ListBucketResult.Contents) {
          resolve(
            result.ListBucketResult.Contents.map(item => {
              return {name: item.Key[0].replace('files/', ''), size: item.Size[0], date: item.LastModified[0]}
            }).filter(el => el.name != '')
          )
        } else {
          resolve([])
        }
      })
    })
  })
}

// This retrieves live meta from github repo
export async function getMetaFromRepo(token, file) {
  let github = new GitHub({token: token})

  let response
  let result = {file: file}

  try {
    response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getContents('master', dataConfig.metaDirectory + '/' + file + '.json')
  } catch (err) {
    if (err.response.status != 404) {
      throw err
    }
  }
  if (response !== undefined) {
    result = JSON.parse(Base64.decode(response.data.content))
    // Need to unpack tileInfo back to object
    result.tileInfo = JSON.parse(result.tileInfo)
  }
  return result
}

export async function getMetaListFromRepo(token) {
  let github = new GitHub({token: token})

  let response
  let result = []

  try {
    response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getContents('master', dataConfig.metaDirectory)
  } catch (err) {
    if (err.response.status != 404) {
      throw err
    }
  }
  if (response !== undefined) result = response.data.map(item => {
    return {file: item.name.substr(0, item.name.lastIndexOf('.'))}
  })
  return result
}

// This gets the sha of the meta file
export async function getMetaSha(token) {
  let github = new GitHub({token: token})

  let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getTree('master')
  return (response.data.tree.find(item => item.path === dataConfig.metaFileName)).sha
}

// This saves meta to the github repo
export async function saveMetaFromRepo(token, meta) {
  let github = new GitHub({token: token})

  // Need to package tileInfo as a string
  meta.tileInfo = JSON.stringify(meta.tileInfo)

  let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).
    writeFile('master', dataConfig.metaDirectory + '/' + meta.file + '.json', JSON.stringify(meta, null, 2), 'Updated meta', {encode: true})
  return response
}

export async function deleteMetaListFromRepo(token, fileList) {
  let github = new GitHub({token: token})

  let responses = []
  console.log('delete file list from repo', fileList)
  for (const file of fileList) {
    let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).deleteFile('master', dataConfig.metaDirectory + '/' + file + '.json')
    responses.push(response)
  }

  return responses
}

export async function getPresignedUrl(token, name, type) {
  let response = await axios.get('/.netlify/functions/get-presigned-url?token=' + token + '&name=' + name + '&type=' + type)
  return response
}

export async function uploadFileToS3(url, formData, uploadProgress) {
  let response = await axios({
    method: 'post',
    url: url,
    data: formData,
    onUploadProgress: uploadProgress
  })
  return response
}

export async function deleteFiles(token, files) {
  let response = await axios.get('/.netlify/functions/delete-files?token=' + token + '&files=' + encodeURIComponent(files))
  return response
}

export async function deleteObjects(token, objects) {
  let response = await axios.get('/.netlify/functions/delete-objects?token=' + token + '&objects=' + encodeURIComponent(objects))
  return response
}

export async function submitJob(token, job) {
  let funcUrl = '/.netlify/functions/submit-job?token=' + token + '&file=' + job.file + '&type=' + job.tileInfo.type
  if (job.tileInfo.type === 'raster') {
    funcUrl += '&ctable=' + makeColorTableParameter(job.tileInfo.colorTable)
    funcUrl += '&exact=' + ((job.tileInfo.gradient) ? 'gradient' : 'exact')
  }
  let response = await axios.get(funcUrl)
  return response
}

export async function getSurveyTemplate() {
  let response = await axios.get(dataConfig.metaBaseUrl + dataConfig.surveyTemplateName)
  return response.data
}

export async function getSurveyTemplateFromRepo(token) {
  let github = new GitHub({token: token})

  let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getContents('master', dataConfig.surveyTemplateName)
  return JSON.parse(Base64.decode(response.data.content))
}

export async function sendSurvey(survey, version) {
  let response = await axios.put('/.netlify/functions/send-survey?version=' + version, survey)
  return response
}

export async function getFAQFromRepo(token) {
  let github = new GitHub({token: token})

  try {
    let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getContents('master', dataConfig.faqFileName)
    return JSON.parse(Base64.decode(response.data.content)).questions
  } catch(err) {
    throw err
  }
}

async function getNewsItem(key) {
  let response = await axios.get(dataConfig.filesBaseUrl + key)
  return response.data
}

export function getListOfNewsItems() {
  return new Promise((resolve, reject) => {
    axios.get(dataConfig.filesBaseUrl + '?list-type=2&prefix=' + dataConfig.newsDirectory + '/&delimiter=/').then(response => {
      parseString(response.data, (err, result) => {
        if (result.ListBucketResult.Contents) {
          let p = result.ListBucketResult.Contents.map((item) => {
            return getNewsItem(item.Key[0])
          })
          Promise.all(p).then((values) => {
            resolve(values)
          })
        } else {
          resolve([])
        }
      })
    })
  })
}

export async function saveNewsItem(token, newsItem) {
  let response = await axios.put('/.netlify/functions/save-news-item?token=' + token, newsItem)
  return response
}

export async function saveSurveyTemplate(token, surveyTemplate) {
  let github = new GitHub({token: token})

  let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).
    writeFile('master', dataConfig.surveyTemplateName, JSON.stringify(surveyTemplate, null, 2), 'Updated survey template', {encode: true})
  return response
}

export async function saveFAQ(token, FAQ) {
  let github = new GitHub({token: token})

  let response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).
    writeFile('master', dataConfig.faqFileName, JSON.stringify({id: 'faq', questions: FAQ}, null, 2), 'Updated FAQ', {encode: true})
  return response
}

export async function getAboutFromRepo(token) {

  let github = new GitHub({token: token})

  let response
  let result = {}

  dataConfig.aboutLocItems.forEach(async item => {
    result[item.fieldName] = ''
    try {
      response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).getContents('master', dataConfig.aboutDirName + item.filePath)
    } catch (err) {
      if (err.response.status != 404) {
        throw err
      }
    }
    if (response !== undefined) result[item.fieldName] = Base64.decode(response.data.content)

    // Yank frontmatter
    let idx = result[item.fieldName].substr(4).indexOf('---\n')
    idx = (idx === -1) ? 0 : idx + 8
    result[item.fieldName] = result[item.fieldName].substr(idx)
  })
  return result
}

export async function saveAbout(token, about) {
  let github = new GitHub({token: token})

  let response

  for (const idx in dataConfig.aboutLocItems) {
    // Prepend frontmatter
    about[dataConfig.aboutLocItems[idx].fieldName] = dataConfig.aboutLocItems[idx].frontMatter + about[dataConfig.aboutLocItems[idx].fieldName]

    try {
      response = await github.getRepo(adminConfig.githubInfo.owner, adminConfig.githubInfo.repo).
        writeFile('master', dataConfig.aboutDirName + dataConfig.aboutLocItems[idx].filePath, about[dataConfig.aboutLocItems[idx].fieldName], 'Updated About', {encode: true})
    } catch (err) {
      throw err
    }
  }
  return
}

export async function publishSite() {
  let response = await axios.post(dataConfig.deployHookUrl, 'publish')
  return response
}

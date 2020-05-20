import axios from 'axios'

export function getStateToken() {
  // Generate and return a UUIDv4 (from StackOverflow How to create GUID / UUID?)
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  )
}

/* export function getUserInfo(token) {
  let github = new GitHub({token: token})

  return new Promise(function (resolve, reject) {
    github.getUser().getProfile().then((profile) => {
      resolve({name: profile.data.name, login: profile.data.login})
    })
  })
} */

export async function getUserInfo(token) {
  return await axios.get('https://geoportalp.auth.us-west-2.amazoncognito.com/oauth2/userInfo', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
}

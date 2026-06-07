import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'
import { getFunctions } from 'firebase/functions'

const defaultAuthDomain = 'zoo-in.firebaseapp.com'
const sameTabRedirectDomains = new Set(['zoo-in.web.app', 'zoo-in.firebaseapp.com'])
const currentHostname = window.location.hostname

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: sameTabRedirectDomains.has(currentHostname)
    ? window.location.host
    : defaultAuthDomain,
  databaseURL: 'https://zoo-in-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'zoo-in',
  storageBucket: 'zoo-in.firebasestorage.app',
  messagingSenderId: '379497990494',
  appId: '1:379497990494:web:0e1aae1555988fa309e7cf',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app)
export const storage = getStorage(app)
export const functions = getFunctions(app, 'asia-southeast1')

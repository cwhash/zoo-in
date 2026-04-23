// ===================== Firebase 設定 =====================
const firebaseConfig = {
  apiKey: "__ZOOIN_FIREBASE_KEY__",
  authDomain: "zoo-in.firebaseapp.com",
  databaseURL: "https://zoo-in-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "zoo-in",
  storageBucket: "zoo-in.firebasestorage.app",
  messagingSenderId: "379497990494",
  appId: "1:379497990494:web:0e1aae1555988fa309e7cf"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

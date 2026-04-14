// ===================== Firebase 設定 =====================
const firebaseConfig = {
  apiKey: "__LIFEGRID_APIKEY__",
  authDomain: "life-grid-446c4.firebaseapp.com",
  databaseURL: "https://life-grid-446c4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "life-grid-446c4",
  storageBucket: "life-grid-446c4.firebasestorage.app",
  messagingSenderId: "905154276293",
  appId: "1:905154276293:web:c603cbac014d5305c379ac"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

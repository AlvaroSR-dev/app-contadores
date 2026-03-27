// 🔥 Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDOEwEWt-ff_RfAeHb8dmvlBLyAD3O4s6E",
  authDomain: "app-contador-ad8bf.firebaseapp.com",
  projectId: "app-contador-ad8bf",
  storageBucket: "app-contador-ad8bf.firebasestorage.app",
  messagingSenderId: "622484552011",
  appId: "1:622484552011:web:bd4543c4e7b2837c6c10ce"
};

// 🔧 INIT
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentPartyId = null;

// 🔐 PROVIDERS
const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

// 🚀 LOGIN (REDIRECT)
window.loginGoogle = async () => {
  await signInWithRedirect(auth, googleProvider);
};

window.loginApple = async () => {
  try {
    await signInWithRedirect(auth, appleProvider);
  } catch (error) {
    console.error(error);
    alert("Apple login not configured yet.");
  }
};

// 🚪 LOGOUT
window.logout = () => signOut(auth);

// 🔁 HANDLE REDIRECT RESULT
getRedirectResult(auth)
  .then((result) => {
    if (result) {
      console.log("✅ Redirect login success:", result.user);
    }
  })
  .catch((error) => {
    console.error("❌ Redirect error:", error);
  });

// 🔄 AUTH STATE
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    // 💾 Save user in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      name: user.displayName,
      photo: user.photoURL
    }, { merge: true });

    // UI update
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";

    document.getElementById("user-info").innerHTML = `
      <img src="${user.photoURL}" width="40" class="rounded-circle me-2">
      <strong>${user.displayName}</strong>
    `;

    loadParties();

  } else {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
  }
});

// 🎉 CREATE PARTY
window.createParty = async () => {
  const title = document.getElementById("party-title").value;
  const joinCode = Math.random().toString(36).substring(2, 8);

  await addDoc(collection(db, "parties"), {
    title,
    joinCode,
    members: [currentUser.uid]
  });

  loadParties();
};

// 🤝 JOIN PARTY
window.joinParty = async () => {
  const code = document.getElementById("join-code").value;

  const q = query(collection(db, "parties"), where("joinCode", "==", code));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    alert("Invalid code");
    return;
  }

  snapshot.forEach(async (docSnap) => {
    const ref = doc(db, "parties", docSnap.id);
    await updateDoc(ref, {
      members: arrayUnion(currentUser.uid)
    });
  });

  loadParties();
};

// 📋 LOAD PARTIES
async function loadParties() {
  const container = document.getElementById("party-list");
  container.innerHTML = "";

  const snapshot = await getDocs(collection(db, "parties"));

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    if (data.members.includes(currentUser.uid)) {
      container.innerHTML += `
        <div class="col-md-3">
          <div class="card p-3 mb-2 card-hover"
            onclick="openParty('${docSnap.id}', '${data.title}')">
            <h5>${data.title}</h5>
            <small>Code: ${data.joinCode}</small>
          </div>
        </div>
      `;
    }
  });
}

// 📂 OPEN PARTY
window.openParty = (partyId, title) => {
  currentPartyId = partyId;
  document.getElementById("party-section").style.display = "block";
  document.getElementById("party-name").innerText = title;

  listenCounters();
};

// ➕ ADD COUNTER
window.addCounter = async () => {
  const title = document.getElementById("counter-title").value;
  const emoji = document.getElementById("counter-emoji").value;

  if (!title || !emoji) {
    alert("Fill all fields");
    return;
  }

  await addDoc(collection(db, "parties", currentPartyId, "counters"), {
    title,
    emoji,
    count: 0,
    createdBy: currentUser.uid
  });
};

// 🔄 REALTIME COUNTERS
function listenCounters() {
  const container = document.getElementById("counters");

  onSnapshot(collection(db, "parties", currentPartyId, "counters"), (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach(docSnap => {
      const c = docSnap.data();

      container.innerHTML += `
        <div class="col-md-3">
          <div class="card text-center p-3 card-hover"
            onclick="increment('${docSnap.id}', ${c.count})">
            <div class="emoji">${c.emoji}</div>
            <h5>${c.title}</h5>
            <h3>${c.count}</h3>
          </div>
        </div>
      `;
    });
  });
}

// 🔼 INCREMENT
window.increment = async (id, count) => {
  const ref = doc(db, "parties", currentPartyId, "counters", id);
  await updateDoc(ref, {
    count: count + 1
  });
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyDOEwEWt-ff_RfAeHb8dmvlBLyAD3O4s6E",
  authDomain: "app-contador-ad8bf.firebaseapp.com",
  projectId: "app-contador-ad8bf",
  storageBucket: "app-contador-ad8bf.firebasestorage.app",
  messagingSenderId: "622484552011",
  appId: "1:622484552011:web:bd4543c4e7b2837c6c10ce"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentPartyId = null;

// AUTH
window.login = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  await signInWithEmailAndPassword(auth, email, password);
};

window.register = async () => {
  const email = emailInput.value;
  const password = passwordInput.value;
  await createUserWithEmailAndPassword(auth, email, password);
};

window.logout = () => signOut(auth);

// AUTH STATE
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("auth-section").style.display = "none";
    document.getElementById("app-section").style.display = "block";
    loadParties();
  } else {
    document.getElementById("auth-section").style.display = "block";
    document.getElementById("app-section").style.display = "none";
  }
});

// CREATE PARTY
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

// JOIN PARTY
window.joinParty = async () => {
  const code = document.getElementById("join-code").value;

  const q = query(collection(db, "parties"), where("joinCode", "==", code));
  const snapshot = await getDocs(q);

  snapshot.forEach(async (docSnap) => {
    const ref = doc(db, "parties", docSnap.id);
    await updateDoc(ref, {
      members: arrayUnion(currentUser.uid)
    });
  });

  loadParties();
};

// LOAD PARTIES
async function loadParties() {
  const partyList = document.getElementById("party-list");
  partyList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "parties"));

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    if (data.members.includes(currentUser.uid)) {
      partyList.innerHTML += `
        <div class="col-md-3">
          <div class="card p-3 mb-2" onclick="openParty('${docSnap.id}', '${data.title}')">
            <h5>${data.title}</h5>
            <small>Code: ${data.joinCode}</small>
          </div>
        </div>
      `;
    }
  });
}

// OPEN PARTY
window.openParty = (partyId, title) => {
  currentPartyId = partyId;
  document.getElementById("party-section").style.display = "block";
  document.getElementById("party-name").innerText = title;
  listenCounters();
};

// ADD COUNTER
window.addCounter = async () => {
  const title = document.getElementById("counter-title").value;
  const emoji = document.getElementById("counter-emoji").value;

  await addDoc(collection(db, "parties", currentPartyId, "counters"), {
    title,
    emoji,
    count: 0,
    createdBy: currentUser.uid
  });
};

// LISTEN COUNTERS (REALTIME)
function listenCounters() {
  const container = document.getElementById("counters");

  onSnapshot(collection(db, "parties", currentPartyId, "counters"), (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach(docSnap => {
      const c = docSnap.data();

      container.innerHTML += `
        <div class="col-md-3">
          <div class="card text-center p-3 counter-card"
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

// INCREMENT
window.increment = async (id, count) => {
  const ref = doc(db, "parties", currentPartyId, "counters", id);
  await updateDoc(ref, { count: count + 1 });
};

import { useState, useEffect } from "react";
import {
  getFirestore, collection, doc, setDoc, onSnapshot, getDoc, getDocs
} from "firebase/firestore";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import SignInPage from './components/SignInPage.jsx';

// Define the types within the file for a single-file React app.
/**
 * @typedef {Object} Subject
 * @property {string} name
 * @property {string[]} teachers
 * @property {number} credits
 */
/**
 * @typedef {Object} ClassDef
 * @property {string} name
 * @property {Subject[]} subjects
 * @property {string[]} students
 */
/**
 * @typedef {Object} Teacher
 * @property {string} id
 * @property {string} name
 * @property {number} weeklyRequiredHours
 * @property {number} hoursLeft
 * @property {number} skipsUsed
 * @property {string} [expertise]
 */
/**
 * @typedef {string[][]} Timetable
 */
/**
 * @typedef {Object} TimetableSlot
 * @property {string} subjectName
 * @property {string} className
 * @property {string} status // 'confirmed', 'declined', 'sub_request', 'free', 'break'
 * @property {string} teacherId // The original teacher for the slot
 */

const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : null);
const app = firebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Add the Tailwind CSS script for styling
const tailwindScript = document.createElement('script');
tailwindScript.src = "https://cdn.tailwindcss.com";
document.head.appendChild(tailwindScript);

export default function App() {
  const [collegeId, setCollegeId] = useState("");
  const [role, setRole] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [workingDays, setWorkingDays] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [breakSlots, setBreakSlots] = useState([]);
  const [generatedTimetables, setGeneratedTimetables] = useState({});

  // Subject management state
  const [selectedClass, setSelectedClass] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCredits, setNewSubjectCredits] = useState(1);
  const [newSubjectTeachers, setNewSubjectTeachers] = useState([]);

  // Auth and Firestore state
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // New state for tracking library loading and uploads
  const [isLibrariesLoaded, setIsLibrariesLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Teacher-specific state
  const [teacherTimetable, setTeacherTimetable] = useState([]);

  // Modal state
  const [message, setMessage] = useState({ text: "", type: "info" });

  // Load external library scripts and handle auth
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    };

    // PDF FIX 1: Add the jspdf-autotable library to be loaded.
    Promise.all([
      loadScript("https://unpkg.com/xlsx/dist/xlsx.full.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"),
      loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"),
      loadScript("https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js")
    ])
    .then(() => setIsLibrariesLoaded(true))
    .catch(err => {
      console.error("Failed to load libraries:", err);
      showMessage("Failed to load external libraries. Please try refreshing the page.", "error");
    });

    if (!auth) return;

    // Auth logic to correctly use the custom token
    const authenticate = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase auth error:", error);
        showMessage("Failed to authenticate. Please try again.", "error");
      }
    };
    authenticate();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [auth]);

  // All listeners now point to the public collection.
  useEffect(() => {
    if (isAuthReady && userId && db) {
      const classesCol = collection(db, "artifacts", appId, "public", "data", "classes");
      const unsubscribeClasses = onSnapshot(classesCol, (snapshot) => {
        const classList = snapshot.docs.map((doc) => doc.data());
        setClasses(classList);
      });

      const teachersCol = collection(db, "artifacts", appId, "public", "data", "teachers");
      const unsubscribeTeachers = onSnapshot(teachersCol, (snapshot) => {
        const teacherList = snapshot.docs.map((doc) => doc.data());
        setTeachers(teacherList);
      });

      const timetablesCol = collection(db, "artifacts", appId, "public", "data", "timetables");
      const unsubscribeTimetables = onSnapshot(timetablesCol, (snapshot) => {
        const timetableMap = {};
        snapshot.docs.forEach((doc) => {
          // Parse the JSON string back into a nested array
          timetableMap[doc.id] = JSON.parse(doc.data().timetable);
        });
        setGeneratedTimetables(timetableMap);
      });

      return () => {
        unsubscribeClasses();
        unsubscribeTeachers();
        unsubscribeTimetables();
      };
    }
  }, [isAuthReady, userId, db]);

  // Consolidate the teacher's timetable when generatedTimetables or collegeId changes
  useEffect(() => {
      if (role === "teacher" && collegeId) {
          const teacherId = collegeId;
          const teacherTimetable = Array.from({ length: workingDays }, () =>
              Array.from({ length: hoursPerDay }, () => null)
          );

          Object.keys(generatedTimetables).forEach(className => {
              const classTimetable = generatedTimetables[className];
              classTimetable.forEach((daySlots, dayIndex) => {
                  daySlots.forEach((slot, periodIndex) => {
                      if (slot && slot.teacherId === teacherId) {
                          teacherTimetable[dayIndex][periodIndex] = {
                              subjectName: slot.subjectName,
                              className: className,
                              status: slot.status,
                              teacherId: slot.teacherId,
                          };
                      }
                  });
              });
          });
          setTeacherTimetable(teacherTimetable);
      }
  }, [generatedTimetables, collegeId, role, workingDays, hoursPerDay]);

  const handleLogin = () => {
    if (collegeId.startsWith("S-")) {
      setRole("student");
    } else if (collegeId.startsWith("T-")) {
      setRole("teacher");
    } else if (collegeId.startsWith("A-")) {
      setRole("admin");
    } else {
      showMessage("Invalid College ID format.", "error");
    }
  };

  const backToLogin = () => {
    setRole(null);
    setCollegeId("");
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleTeacherCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      showMessage("No file selected.", "error");
      return;
    }
    if (!db) {
      showMessage("Database not ready. Please try again.", "error");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("File data is empty.");
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        const newTeachers = json.map((row) => {
          if (!row.ID || !row.Name || !row.WorkingHours) {
            throw new Error(`Missing required fields (ID, Name, WorkingHours) in row: ${JSON.stringify(row)}`);
          }
          return {
            id: String(row.ID),
            name: String(row.Name),
            weeklyRequiredHours: Number(row.WorkingHours),
            hoursLeft: Number(row.WorkingHours),
            skipsUsed: 0,
            expertise: row.Expertise ? String(row.Expertise) : "",
          };
        });

        // Use a more explicit path for clarity and robustness
        const teachersPublicRef = collection(db, "artifacts", appId, "public", "data", "teachers");
        const uploadPromises = newTeachers.map((teacher) => {
          const teacherDocRef = doc(teachersPublicRef, teacher.id);
          return setDoc(teacherDocRef, teacher);
        });
        await Promise.all(uploadPromises);

        setTeachers(newTeachers);

        showMessage("Teachers uploaded successfully!", "success");
      } catch (error) {
        console.error("Error uploading teachers:", error);
        showMessage(`Failed to upload teachers. Check the console for details: ${error.message}`, "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleStudentCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!db) {
      showMessage("Database not ready. Please try again.", "error");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("File data is empty.");
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        const classesMap = {};
        json.forEach((row) => {
          const className = String(row.ClassName);
          if (!classesMap[className]) {
            classesMap[className] = { name: className, subjects: [], students: [] };
          }
          classesMap[className].students.push(String(row.StudentID));
        });

        const classesPublicRef = collection(db, "artifacts", appId, "public", "data", "classes");
        const uploadPromises = Object.keys(classesMap).map(clsName => {
            const classDocRef = doc(classesPublicRef, clsName);
            // Use { merge: true } to avoid overwriting existing subjects
            return setDoc(classDocRef, classesMap[clsName], { merge: true });
        });
        await Promise.all(uploadPromises);
        showMessage("Students uploaded successfully!", "success");
      } catch (error) {
        console.error("Error uploading students:", error);
        showMessage(`Failed to upload students. Check the console for details: ${error.message}`, "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSubjectAdd = async () => {
    if (!selectedClass || !newSubjectName || newSubjectCredits <= 0 || newSubjectTeachers.length === 0) {
      showMessage("Please fill all subject fields correctly.", "error");
      return;
    }
    if (!db) {
      showMessage("Database not ready. Please try again.", "error");
      return;
    }
    const classToUpdate = classes.find(cls => cls.name === selectedClass);
    if (!classToUpdate) {
      showMessage("Selected class not found.", "error");
      return;
    }
    const updatedSubjects = [...classToUpdate.subjects, {
      name: newSubjectName,
      credits: Number(newSubjectCredits),
      teachers: newSubjectTeachers
    }];

    const classRef = doc(db, "artifacts", appId, "public", "data", "classes", selectedClass);
    await setDoc(classRef, { subjects: updatedSubjects }, { merge: true });
    showMessage("Subject added successfully!", "success");
    setNewSubjectName("");
    setNewSubjectCredits(1);
    setNewSubjectTeachers([]);
  };

  const generateTimetable = async () => {
    if (classes.length === 0 || teachers.length === 0) {
      showMessage("Please upload teacher and student data first.", "error");
      return;
    }
    if (!db) {
      showMessage("Database not ready. Please try again.", "error");
      return;
    }

    const classesWithoutSubjects = classes.filter(cls => !cls.subjects || cls.subjects.length === 0);
    if (classesWithoutSubjects.length > 0) {
      const classNames = classesWithoutSubjects.map(c => c.name).join(", ");
      showMessage(`Classes ${classNames} have no subjects assigned. Please assign subjects before generating the timetable.`, "error");
      return;
    }

    const teachersData = [...teachers];
    const classesData = [...classes];
    const timetablesToSave = {};
    const totalSlots = workingDays * hoursPerDay;

    const teacherSlots = {};
    const teacherHoursLeft = {};
    teachersData.forEach((t) => {
      teacherSlots[t.id] = Array(workingDays).fill(0).map(() => Array(hoursPerDay).fill(false));
      teacherHoursLeft[t.id] = t.weeklyRequiredHours;
    });

    for (const cls of classesData) {
      const classSubjects = [...cls.subjects];
      const totalSubjectCredits = classSubjects.reduce((sum, sub) => sum + sub.credits, 0);
      const subjectSlots = totalSlots - Math.round(totalSlots * 0.20) - breakSlots.length; // 20% free + breaks

      // Create a pool of all required periods based on credits
      let periodPool = [];
      classSubjects.forEach(sub => {
        const numPeriods = totalSubjectCredits > 0 ? Math.round((sub.credits / totalSubjectCredits) * subjectSlots) : 0;
        for (let i = 0; i < numPeriods; i++) {
          periodPool.push({
            subjectName: sub.name,
            teachers: sub.teachers,
            isHigherCredit: sub.credits > 2 // Heuristic for 'higher credit'
          });
        }
      });
      // Add free periods and break periods to fill the remaining slots
      const freePeriodsNeeded = totalSlots - periodPool.length - breakSlots.length;
      for (let i = 0; i < freePeriodsNeeded; i++) {
        periodPool.push({
          subjectName: "Free",
          teachers: [],
          isHigherCredit: false
        });
      }

      // Shuffle the period pool for randomness
      periodPool.sort(() => Math.random() - 0.5);

      const table = Array(workingDays).fill(0).map(() => Array(hoursPerDay).fill(null));

      for (let day = 0; day < workingDays; day++) {
        const dailySubjectCount = {};
        for (let period = 0; period < hoursPerDay; period++) {
          // Check for and handle break slots
          if (breakSlots.includes(period + 1)) { // Match 1-based period numbers
            table[day][period] = { subjectName: "Break", className: "", status: "break", teacherId: "" };
            continue;
          }

          let assigned = false;
          let tempPeriodPool = [...periodPool];

          // Sort pool to prioritize a lower-credit subject after a high-credit one
          const lastPeriod = period > 0 ? table[day][period - 1] : null;
          if (lastPeriod && lastPeriod.isHigherCredit) {
            tempPeriodPool.sort((a, b) => (a.isHigherCredit === b.isHigherCredit) ? 0 : a.isHigherCredit ? 1 : -1);
          } else {
            // Otherwise, shuffle
            tempPeriodPool.sort(() => Math.random() - 0.5);
          }

          for (let i = 0; i < tempPeriodPool.length; i++) {
            const slotToAssign = tempPeriodPool[i];

            if (slotToAssign.subjectName !== "Free" && dailySubjectCount[slotToAssign.subjectName] >= 2) {
              continue;
            }

            const prevSlot = period > 0 ? table[day][period - 1] : null;
            const prevPrevSlot = period > 1 ? table[day][period - 2] : null;
            if (prevSlot && prevPrevSlot && prevSlot.subjectName === slotToAssign.subjectName && prevPrevSlot.subjectName === slotToAssign.subjectName) {
              continue;
            }

            let teacherId = null;
            if (slotToAssign.subjectName !== "Free") {
              const availableTeacher = slotToAssign.teachers.find((tid) => teacherSlots[tid] && !teacherSlots[tid][day][period] && teacherHoursLeft[tid] > 0);
              if (availableTeacher) {
                teacherId = availableTeacher;
              } else {
                continue;
              }
            }

            table[day][period] = {
              subjectName: slotToAssign.subjectName,
              className: cls.name,
              status: slotToAssign.subjectName === "Free" ? "free" : "confirmed",
              teacherId: teacherId,
              isHigherCredit: slotToAssign.isHigherCredit
            };
            
            dailySubjectCount[slotToAssign.subjectName] = (dailySubjectCount[slotToAssign.subjectName] || 0) + 1;

            if (teacherId) {
              teacherSlots[teacherId][day][period] = true;
              teacherHoursLeft[teacherId]--;
            }

            const assignedIndex = periodPool.findIndex(p => p.subjectName === slotToAssign.subjectName && p.teachers.join(',') === slotToAssign.teachers.join(','));
            if (assignedIndex > -1) {
              periodPool.splice(assignedIndex, 1);
            }
            assigned = true;
            break;
          }

          if (!assigned) {
            table[day][period] = { subjectName: "Free", className: cls.name, status: "free", teacherId: "" };
          }
        }
      }
      timetablesToSave[cls.name] = table;
    }

    try {
      const writePromises = [];
      for (const clsName in timetablesToSave) {
        const timetableRef = doc(db, "artifacts", appId, "public", "data", "timetables", clsName);
        writePromises.push(setDoc(timetableRef, { timetable: JSON.stringify(timetablesToSave[clsName]) }));
      }

      for (const t of teachersData) {
        const teacherRef = doc(db, "artifacts", appId, "public", "data", "teachers", t.id);
        writePromises.push(setDoc(teacherRef, { hoursLeft: teacherHoursLeft[t.id] }, { merge: true }));
      }
      await Promise.all(writePromises);
      showMessage("Timetable generated and saved successfully!", "success");
    } catch (error) {
      console.error("Error generating/saving timetable:", error);
      showMessage("Failed to generate and save timetable. Check console for details.", "error");
    }
  };

  const handleSlotToggle = async (dayIndex, periodIndex, slot) => {
    // Simplified and corrected logic for substitution
    if (!db) return;
    const className = slot.className;
    const subjectName = slot.subjectName;
    const timetableRef = doc(db, "artifacts", appId, "public", "data", "timetables", className);

    const classTimetableDoc = await getDoc(timetableRef);
    if (!classTimetableDoc.exists()) return;
    const classTimetable = JSON.parse(classTimetableDoc.data().timetable);
    const updatedTimetable = classTimetable.map(day => [...day]);
    
    if (slot.status === "confirmed") {
      const currentTeacherId = collegeId;
      const classDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "classes", className));
      if (!classDoc.exists()) return;

      const subjectData = classDoc.data().subjects.find(s => s.name === subjectName);
      const potentialSubstitutes = subjectData.teachers.filter(tid => tid !== currentTeacherId);
      let replacementFound = false;

      if (potentialSubstitutes.length > 0) {
        const allTimetablesSnapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "timetables"));
        
        for (const subId of potentialSubstitutes) {
            let isSubBusy = false;
            allTimetablesSnapshot.forEach(doc => {
                const timetable = JSON.parse(doc.data().timetable);
                const slotToCheck = timetable[dayIndex][periodIndex];
                if (slotToCheck && slotToCheck.teacherId === subId) {
                    isSubBusy = true;
                }
            });

            if (!isSubBusy) {
                updatedTimetable[dayIndex][periodIndex] = { ...slot, status: "sub_request", teacherId: subId };
                await setDoc(timetableRef, { timetable: JSON.stringify(updatedTimetable) });
                showMessage(`Substitution request sent to Teacher ${subId}!`, "info");
                replacementFound = true;
                break; // Exit loop once a sub is found
            }
        }
      }

      if (!replacementFound) {
        updatedTimetable[dayIndex][periodIndex] = { subjectName: "Free", className: "", status: "free", teacherId: "" };
        await setDoc(timetableRef, { timetable: JSON.stringify(updatedTimetable) });
        showMessage("No substitute available. Slot converted to a Free Period.", "info");
      }
    } else if (slot.status === "sub_request") {
        updatedTimetable[dayIndex][periodIndex] = { ...slot, status: "confirmed" };
        await setDoc(timetableRef, { timetable: JSON.stringify(updatedTimetable) });
        showMessage("Class accepted! Your timetable has been updated.", "success");
    }
  };

  const downloadTimetable = (clsName, format) => {
    const table = generatedTimetables[clsName];
    if (!table) {
      showMessage("No timetable available for download.", "error");
      return;
    }
    const headerRow = ["Day/Period", ...Array.from({ length: hoursPerDay }, (_, i) => `Period ${i + 1}`)];
    // PDF FIX 2: Ensure null cells are handled gracefully when preparing data.
    const bodyRows = table.map((row, dayIdx) => [`Day ${dayIdx + 1}`, ...row.map(cell => cell ? cell.subjectName : 'N/A')]);

    if (format === "xlsx") {
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
      const wb = XLSX.utils.book_new();
��     XLSX.utils.book_append_sheet(wb, ws, clsName);
      XLSX.writeFile(wb, `${clsName}_timetable.xlsx`);
    } else if (format === "pdf") {
      // PDF FIX 3: Correctly instantiate jsPDF and use the autoTable plugin.
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.text(`Timetable for ${clsName}`, 14, 15);
      doc.autoTable({
        head: [headerRow],
        body: bodyRows,
        startY: 20,
      });
      doc.save(`${clsName}_timetable.pdf`);
    } else if (format === "txt") {
      const text = [headerRow, ...bodyRows].map((row) => row.join("\t")).join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      window.saveAs(blob, `${clsName}_timetable.txt`);
    }
    showMessage(`Timetable downloaded as ${format.toUpperCase()}!`, "success");
  };

  if (!isAuthReady || !isLibrariesLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-900 text-white font-sans p-5">
        <div className="text-xl font-semibold animate-pulse">Loading App...</div>
        <div className="text-sm mt-2">Connecting to Firebase and loading libraries...</div>
      </div>
    );
  }

  const allClassesHaveSubjects = classes.length > 0 && classes.every(cls => cls.subjects && cls.subjects.length > 0);
  const isGenerateEnabled = classes.length > 0 && teachers.length > 0 && allClassesHaveSubjects;
  const isSubjectManagementEnabled = teachers.length > 0;

  return (
    // CHANGE THIS LINE
    <div className="grid place-items-center min-h-screen w-full bg-neutral-900 text-white font-sans p-5">
      <div className="text-xs text-neutral-500 mb-4">User ID: {userId || 'Authenticating...'}</div>
      {message.text && (
      // LAYOUT FIX 1: Use a template literal with a space for conditional classes.
        <div className={`fixed top-5 z-50 px-6 py-3 rounded-lg shadow-xl text-white transition-all duration-300 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      {!role && (
        <div className="w-full max-w-sm bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700">
          <h1 className="text-2xl font-bold mb-4 text-center">College Login</h1>
          <input
            className="w-full p-3 mb-4 rounded-lg bg-neutral-700 text-white border border-neutral-600 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter College ID (S-, T-, A-)"
            value={collegeId}
            onChange={(e) => setCollegeId(e.target.value)}
          />
          <button
            className="w-full py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      )}

      {role === "admin" && (
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Time and Class Configuration</h2>
            <button
              className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              onClick={backToLogin}
            >
              Logout
            </button>
          </div>

          {/* Data Status Section */}
          <div className="bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
            <h3 className="text-lg font-semibold mb-3">Data Status</h3>
            <p className="text-sm">Loaded Classes: {classes.length}</p>
            <p className="text-sm">Loaded Teachers: {teachers.length}</p>
            <p className="text-sm mt-2">
              All classes have subjects assigned: {" "}
              {/* LAYOUT FIX 2: Use a template literal with a space for conditional classes. */}
              <span className={`font-bold ${allClassesHaveSubjects ? 'text-green-400' : 'text-red-400'}`}>
                {allClassesHaveSubjects ? 'Yes' : 'No'}
              </span>
            </p>
          </div>

          {/* Upload Data Section */}
          <div className="bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
            <h3 className="text-lg font-semibold mb-3">Upload Data</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Upload Teachers CSV</label>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleTeacherCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Upload Students CSV</label>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleStudentCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
            </div>
            {isUploading && (
              <p className="text-sm text-blue-400 mt-2 text-center">Uploading data, please wait...</p>
            )}
          </div>

          {/* Subject Management Section */}
          {/* LAYOUT FIX 3: Use a template literal with a space for conditional classes. */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 transition-all duration-300 ${!isSubjectManagementEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <h3 className="text-lg font-semibold mb-3">Subject Management</h3>
            {!isSubjectManagementEnabled && (
              <p className="text-center text-red-400 mb-4">Please upload teacher data first to manage subjects.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Select Class</label>
                  <select
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                  >
                    <option value="">-- Select a Class --</option>
                    {classes.map((cls) => (
                      <option key={cls.name} value={cls.name}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subject Name</label>
                  <input
                    type="text"
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 placeholder:text-neutral-400"
                    placeholder="e.g., Data Structures"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credits</label>
                  <input
                    type="number"
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                    value={newSubjectCredits}
                    onChange={(e) => setNewSubjectCredits(Number(e.target.value))}
                  	min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Assign Teachers</label>
                  <select
                    multiple
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                    value={newSubjectTeachers}
                    onChange={(e) => {
                      const selectedTeachers = Array.from(e.target.selectedOptions, option => option.value);
                      setNewSubjectTeachers(selectedTeachers);
                    }}
                  >
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} ({teacher.id})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-400 mt-1">Hold Ctrl/Cmd to select multiple.</p>
                </div>
                <button
                  className="w-full py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors mt-2"
                  onClick={handleSubjectAdd}
                >
                  Add Subject
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <h4 className="font-semibold">Subjects per Class</h4>
                {classes.map(cls => (
                  <div key={cls.name} className="bg-neutral-700 p-4 rounded-lg">
                    <h5 className="font-medium text-neutral-200">{cls.name} ({cls.subjects?.length || 0} subjects)</h5>
                    <ul className="list-disc list-inside mt-2 text-sm text-neutral-400">
                      {cls.subjects?.map((sub, idx) => (
                        <li key={idx}>{sub.name} ({sub.credits} credits) assigned to {sub.teachers.join(', ')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timetable Settings Section */}
          <div className="bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
            <h3 className="text-lg font-semibold mb-3">Timetable Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <label className="text-sm font-medium">Working Days:</label>
                <input type="number" value={workingDays} onChange={e => setWorkingDays(Number(e.target.value))} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <label className="text-sm font-medium">Hours Per Day:</label>
                <input type="number" value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">Break Slots (e.g. 3,5):</label>
                <input type="text" placeholder="e.g. 3,5" onChange={e => setBreakSlots(e.target.value.split(",").map(s => Number(s.trim())).filter(Boolean))} className="w-full sm:w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          {/* LAYOUT FIX 4: Use a template literal with a space for conditional classes. */}
          <button
            className={`w-full py-3 rounded-lg font-semibold transition-colors ${isGenerateEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-neutral-600 cursor-not-allowed'}`}
            onClick={generateTimetable}
            disabled={!isGenerateEnabled}
          >
            Generate Timetable
          </button>
        </div>
      )}

      {role === "teacher" && (
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Teacher Portal</h1>
          <button
            className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors mb-6"
            onClick={backToLogin}
          >
            Logout
          </button>
          <div className="bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Timetable</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-700 text-sm">
                <thead className="bg-neutral-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Day/Period</th>
                    {Array.from({ length: hoursPerDay }, (_, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                        Period {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700">
                  {teacherTimetable.map((row, dayIdx) => (
                    <tr key={dayIdx}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-200">Day {dayIdx + 1}</td>
                      {row.map((cell, periodIdx) => (
                        <td key={periodIdx} className="px-6 py-4 whitespace-nowrap">
                          {cell ? (
                              <button
                                  className={`px-4 py-2 rounded-lg text-xs font-semibold w-full text-center transition-colors
                                      ${cell.status === 'confirmed' ? 'bg-green-700 hover:bg-green-800 text-white' :
                                      cell.status === 'sub_request' ? 'bg-yellow-600 hover:bg-yellow-700 text-neutral-900' :
                                      'bg-neutral-600 text-neutral-200 cursor-default'}`}
                                  onClick={() => handleSlotToggle(dayIdx, periodIdx, cell)}
                              >
                                  {cell.status === 'confirmed' && (
                                      <p>{cell.subjectName} <br/> ({cell.className})</p>
                                  )}
                                  {cell.status === 'sub_request' && (
                                      <p>SUB REQ: {cell.subjectName} <br/> ({cell.className})</p>
                                  )}
                              </button>
                          ) : (
                              <div className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-700 text-white text-center">Free</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {role === "student" && (
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Student Portal</h1>
          <button
            className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors mb-6"
            onClick={backToLogin}
          >
            Logout
          </button>
          {Object.keys(generatedTimetables).map((clsName) => (
            <div key={clsName} className="bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
              <h2 className="text-xl font-bold mb-4">Timetable for {clsName}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-700 text-sm">
                  <thead className="bg-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Day/Period</th>
                      {Array.from({ length: hoursPerDay }, (_, i) => (
                        <th key={i} className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                          Period {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
        ��         <tbody className="divide-y divide-neutral-700">
                    {generatedTimetables[clsName].map((row, dayIdx) => (
                      <tr key={dayIdx}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-neutral-200">Day {dayIdx + 1}</td>
                        {row.map((cell, periodIdx) => (
                          <td key={periodIdx} className="px-6 py-4 whitespace-nowrap">
                          {/* LAYOUT FIX 5: Use a template literal with a space for conditional classes. */}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cell && cell.status === 'free' ? 'bg-red-700 text-white' : 'bg-neutral-600 text-neutral-200'}`}>
                              {cell ? cell.subjectName : 'N/A'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => downloadTimetable(clsName, "xlsx")}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Download as XLSX
                </button>
                <button
                  onClick={() => downloadTimetable(clsName, "pdf")}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Download as PDF
                </button>
                <button
                  onClick={() => downloadTimetable(clsName, "txt")}
                  className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Download as TXT
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

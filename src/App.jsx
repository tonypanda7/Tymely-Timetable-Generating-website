import { useState, useEffect, useRef, useMemo } from "react";
import {
  initializeFirestore, collection, doc, setDoc, onSnapshot, getDoc, deleteDoc, getDocs, persistentLocalCache, persistentMultipleTabManager
} from "firebase/firestore";
import {
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken,
} from "firebase/auth";
import { initializeApp } from "firebase/app";
import SignInPage from './components/SignInPage.jsx';
import Dashboard from './components/Dashboard.jsx';
import AdminUploadPage from './components/AdminUploadPage.jsx';
import CourseManagementPage from './components/CourseManagementPage.jsx';
import AdminTeacherTimetablePage from './components/AdminTeacherTimetablePage.jsx';
import AdminStudentTimetablePage from './components/AdminStudentTimetablePage.jsx';
import AdminCancellationRequestsPage from './components/AdminCancellationRequestsPage.jsx';
import AdminSimulationPage from './components/AdminSimulationPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import { geneticGenerateTimetables } from './utils/geneticTimetable.js';
import { acGenerateTimetables } from './utils/antColonyTimetable.js';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

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

const firebaseConfigStr = typeof window !== 'undefined' && window.__firebase_config ? window.__firebase_config : null;
let parsedConfig = null;
try {
  parsedConfig = firebaseConfigStr ? JSON.parse(firebaseConfigStr) : null;
} catch (e) {
  console.error('Invalid firebase config JSON:', e);
  parsedConfig = null;
}
const app = parsedConfig ? initializeApp(parsedConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? (typeof window !== 'undefined'
  ? (window.__firestore_instance || (window.__firestore_instance = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false
    })))
  : initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false
    })
) : null;
const appId = typeof window !== 'undefined' && window.__app_id ? window.__app_id : 'default-app-id';

// Helper to safely parse timetable data that may be stored as a JSON string or as an object/array already.
function parseTimetableData(raw) {
  if (!raw) return [];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse timetable JSON, returning empty timetable instead.', e);
      return [];
    }
  }
  if (Array.isArray(raw)) return raw;
  // If it's an object that resembles a timetable mapping, attempt to return as-is
  return Array.isArray(raw) ? raw : [];
}

// Normalize IDs/names for robust comparisons (trim + lowercase)
function normalizeId(val) {
  return String(val || '').trim().toLowerCase();
}

const WEEKDAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const getWeekdayLabel = (idx) => {
  const i = Number.isFinite(Number(idx)) ? Number(idx) : 0;
  return WEEKDAY_LABELS[((i % 7) + 7) % 7];
};

function resolveElectiveSubjectForTeacher({ classesList, className, originalName, status, teacherId }) {
  try {
    const classDef = (classesList || []).find(c => c && c.name === className);
    if (!classDef) return status === 'elective' ? 'Elective' : originalName;
    const subjectsList = Array.isArray(classDef.subjects) ? classDef.subjects : [];
    const groups = subjectsList.filter(s => s && s.courseType === 'elective');
    const prioritized = groups.sort((a) => (String(a.name) === String(originalName) ? -1 : 0));
    for (const g of prioritized) {
      const options = Array.isArray(g.electiveOptionsDetailed) ? g.electiveOptionsDetailed : [];
      const match = options.find(o => Array.isArray(o.teachers) && o.teachers.includes(teacherId));
      if (match && match.name) return `${match.name} (Elective)`;
    }
    return status === 'elective' ? 'Elective' : originalName;
  } catch {
    return status === 'elective' ? 'Elective' : originalName;
  }
}


export default function App() {
  const [collegeId, setCollegeId] = useState("");
  const [role, setRole] = useState(null);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Admin timetable settings (UI controls) and persisted settings
  const [workingDays, setWorkingDays] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(5);
  const [breakSlots, setBreakSlots] = useState([]); // zero-based indices preferred
  const [classStartTime, setClassStartTime] = useState("09:00");
  const [classDuration, setClassDuration] = useState(60);
  const [freePeriodPercentage, setFreePeriodPercentage] = useState(20);
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("17:00");
  const [timetableSettings, setTimetableSettings] = useState(null);
  const [electiveSlots, setElectiveSlots] = useState([]);

  const [generatedTimetables, setGeneratedTimetables] = useState({});
  const [simulationScenarios, setSimulationScenarios] = useState({});
  const [activeScenario, setActiveScenario] = useState(null);
  const [simulationName, setSimulationName] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [scenarioType, setScenarioType] = useState('more_free');
  const [scenarioParams, setScenarioParams] = useState({ deltaPercent: 0.2, teacherId: '', absenceDays: 5, electiveFrom: 0, electiveTo: 4, enrollmentIncrease: 100 });

  // Subject management state
  const [selectedClass, setSelectedClass] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCredits, setNewSubjectCredits] = useState(1);
  const [newSubjectTeachers, setNewSubjectTeachers] = useState([]);
  const [newSubjectCourseType, setNewSubjectCourseType] = useState('major');
  const [newSubjectIsLab, setNewSubjectIsLab] = useState('theory');
  const [newSubjectCourseStyle, setNewSubjectCourseStyle] = useState('hard_theory');
  const [newSubjectSem, setNewSubjectSem] = useState(1);
  const [electiveCount, setElectiveCount] = useState(1);
  const [electiveDetails, setElectiveDetails] = useState([{ name: '', isLab: 'theory', style: 'hard_theory', teachers: [] }]);
  const [electiveStudentChooseCount, setElectiveStudentChooseCount] = useState(1);

  // Auth and Firestore state
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [studentName, setStudentName] = useState('');

  // Libraries and uploads
  const [isLibrariesLoaded, setIsLibrariesLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  // Datasets counts for admin visibility
  const [classroomsCount, setClassroomsCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  // Teacher and student state
  const [teacherTimetable, setTeacherTimetable] = useState([]);
  const [studentClass, setStudentClass] = useState(null);

  // Notifications and approvals
  const [cancellations, setCancellations] = useState([]);
  const [teacherOffers, setTeacherOffers] = useState([]);
  const [acceptedSubstitutions, setAcceptedSubstitutions] = useState([]);

  // Programs, Courses, Ratings
  const [programs, setPrograms] = useState({});
  const [courses, setCourses] = useState({});
  const [courseRatings, setCourseRatings] = useState({});

  // Student elective selections per group: { [groupName]: selectedOption }
  const [studentElectivesSelectedMap, setStudentElectivesSelectedMap] = useState({});

  // Hours left
  const [weeklyHoursLeft, setWeeklyHoursLeft] = useState(0);
  const [monthlyHoursLeft, setMonthlyHoursLeft] = useState(0);

  // Admin toggle: bypass hoursLeft check for substitution acceptance
  const [bypassHoursCheck, setBypassHoursCheck] = useState(false);

  // UI state
  const [message, setMessage] = useState({ text: "", type: "info" });
  const [currentView, setCurrentView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('status');
  const [showAdminCreateModal, setShowAdminCreateModal] = useState(false);
  const [pendingAdminId, setPendingAdminId] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [useSidebarLayout, setUseSidebarLayout] = useState(false);

  // Guards
  const isGeneratingRef = useRef(false);

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

    setIsLibrariesLoaded(true);

    if (!auth) return;

    const authenticate = async () => {
      try {
        if (!auth) {
          console.warn('Firebase auth not initialized. Skipping authentication.');
          showMessage('Firebase not configured. Running in offline/demo mode.', 'info');
          setIsAuthReady(true);
          return;
        }
        if (typeof window !== 'undefined' && window.__initial_auth_token) {
          await signInWithCustomToken(auth, window.__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase auth error:", error);
        showMessage("Failed to authenticate. Please try again.", "error");
      }
    };
    authenticate();

    let unsubscribe = () => {};
    if (auth) {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) setUserId(user.uid);
        setIsAuthReady(true);
      });
    } else {
      setIsAuthReady(true);
    }
    return () => { try { unsubscribe(); } catch {} };
  }, [auth]);

  // Ensure Tailwind is loaded on client-side only
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('tailwind-cdn')) return;
    const script = document.createElement('script');
    script.id = 'tailwind-cdn';
    script.src = 'https://cdn.tailwindcss.com';
    script.defer = true;
    script.onload = () => console.log('Tailwind loaded');
    script.onerror = () => console.warn('Failed to load Tailwind CDN');
    document.head.appendChild(script);
  }, []);

  // Listeners for classes, teachers, timetables + settings
  useEffect(() => {
    if (isAuthReady && userId && db) {
      const onErr = (name) => (err) => { console.error(`Firestore listener error (${name}):`, err); showMessage(`Firestore listener error (${name}). Check connection.`, 'error'); };

      const classesCol = collection(db, "artifacts", appId, "public", "data", "classes");
      const unsubscribeClasses = onSnapshot(classesCol, (snapshot) => {
        const classList = snapshot.docs.map((d) => {
          const data = d.data() || {};
          const name = data.name || d.id;
          return { id: d.id, name, ...data };
        });
        setClasses(classList);
      }, onErr('classes'));

      const teachersCol = collection(db, "artifacts", appId, "public", "data", "teachers");
      const unsubscribeTeachers = onSnapshot(teachersCol, (snapshot) => {
        const teacherList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTeachers(teacherList);
      }, onErr('teachers'));

      const timetablesCol = collection(db, "artifacts", appId, "public", "data", "timetables");
      const unsubscribeTimetables = onSnapshot(timetablesCol, (snapshot) => {
        const timetableMap = {};
        let settings = null;
        snapshot.docs.forEach((d) => {
          if (d.id === 'settings') {
            settings = d.data();
          } else {
            timetableMap[d.id] = parseTimetableData(d.data().timetable);
          }
        });

        if (settings) {
          setTimetableSettings(settings);
          setWorkingDays(settings.workingDays ?? 5);
          setHoursPerDay(settings.hoursPerDay ?? 5);
          setBreakSlots(Array.isArray(settings.breakSlots) ? settings.breakSlots : []);
          setElectiveSlots(Array.isArray(settings.electiveSlots) ? settings.electiveSlots : []);
          setClassStartTime(settings.classStartTime ?? "09:00");
          setClassDuration(settings.classDuration ?? 60);
          setDayStartTime(settings.dayStartTime ?? settings.classStartTime ?? "09:00");
          setDayEndTime(settings.dayEndTime ?? "17:00");
          setFreePeriodPercentage(settings.freePeriodPercentage ?? 20);
          setBypassHoursCheck(Boolean(settings.bypassHoursCheck));
        }
        setGeneratedTimetables(timetableMap);
      }, onErr('timetables'));

      const classroomsCol = collection(db, "artifacts", appId, "public", "data", "classrooms");
      const unsubscribeClassrooms = onSnapshot(classroomsCol, (snapshot) => setClassroomsCount(snapshot.size), onErr('classrooms'));

      const coursesCol = collection(db, "artifacts", appId, "public", "data", "courses");
      const unsubscribeCourses = onSnapshot(coursesCol, (snapshot) => {
        setCoursesCount(snapshot.size);
        const map = {};
        snapshot.docs.forEach((d) => { map[d.id] = d.data(); });
        setCourses(map);
      }, onErr('courses'));

      const feedbackCol = collection(db, "artifacts", appId, "public", "data", "feedback");
      const unsubscribeFeedback = onSnapshot(feedbackCol, (snapshot) => {
        setFeedbackCount(snapshot.size);
        const agg = {};
        const cnt = {};
        snapshot.docs.forEach((d) => {
          const f = d.data();
          const key = f.courseId || f.courseName;
          if (!key) return;
          if (f.courseRating == null) return;
          agg[key] = (agg[key] || 0) + Number(f.courseRating);
          cnt[key] = (cnt[key] || 0) + 1;
        });
        const avg = {};
        Object.keys(agg).forEach(k => { avg[k] = agg[k] / cnt[k]; });
        setCourseRatings(avg);
      }, onErr('feedback'));

      const cancellationsCol = collection(db, "artifacts", appId, "public", "data", "cancellations");
      const unsubscribeCancellations = onSnapshot(cancellationsCol, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCancellations(items);
      }, onErr('cancellations'));

      const programsCol = collection(db, "artifacts", appId, "public", "data", "programs");
      const unsubscribePrograms = onSnapshot(programsCol, (snapshot) => {
        const map = {};
        snapshot.docs.forEach((d) => { map[d.id] = d.data(); });
        setPrograms(map);
      }, onErr('programs'));

      const notificationsCol = collection(db, "artifacts", appId, "public", "data", "notifications");
      const unsubscribeNotifications = onSnapshot(notificationsCol, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTeacherOffers(items.filter(n => (n.type === 'substitution_offer' && n.candidateId === collegeId && n.status === 'pending') || (n.type === 'cancellation_approved' && n.candidateId === collegeId)));
        setAcceptedSubstitutions(items.filter(n => n.type === 'substitution_offer' && n.status === 'accepted'));
      }, onErr('notifications'));

      // Student electives listener
      const studentElectivesDoc = doc(db, "artifacts", appId, "public", "data", "studentElectives", userId);
      const unsubscribeStudentElectives = onSnapshot(studentElectivesDoc, (snap) => {
        const data = snap.exists() ? snap.data() : null;
        const sel = data?.selectedMap && typeof data.selectedMap === 'object' ? data.selectedMap : {};
        setStudentElectivesSelectedMap(sel);
      }, onErr('studentElectives'));

      return () => {
        try { unsubscribeClasses(); } catch {}
        try { unsubscribeTeachers(); } catch {}
        try { unsubscribeTimetables(); } catch {}
        try { unsubscribeClassrooms(); } catch {}
        try { unsubscribeCourses(); } catch {}
        try { unsubscribeFeedback(); } catch {}
        try { unsubscribeCancellations(); } catch {}
        try { unsubscribePrograms(); } catch {}
        try { unsubscribeNotifications(); } catch {}
        try { unsubscribeStudentElectives(); } catch {}
      };
    }
  }, [isAuthReady, userId, db, collegeId]);

  // Global online/offline notifier
  useEffect(() => {
    const onOnline = () => { showMessage('Network reconnected.', 'success'); };
    const onOffline = () => { showMessage('You are offline. Firestore may be unavailable.', 'error'); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Build teacher timetable using current settings
  useEffect(() => {
    if (role === 'teacher' && collegeId && (timetableSettings || (workingDays && hoursPerDay))) {
      const teacherId = collegeId;
      const days = workingDays;
      const hours = hoursPerDay;
      const breaks = breakSlots || [];

      const base = Array.from({ length: days }, () => Array.from({ length: hours }, () => null));

      // Mark breaks
      for (let d = 0; d < days; d++) {
        breaks.forEach((p) => {
          if (p >= 0 && p < hours) {
            base[d][p] = { subjectName: 'Break', className: '', status: 'break', teacherId: '' };
          }
        });
      }

      // Also mark computed lunch slots (from calculateTimeSlots) as non-assignable Lunch
      try {
        const headerSlots = Array.isArray(calculateTimeSlots()) ? calculateTimeSlots() : [];
        const lunchIndices = headerSlots.map((s, i) => /\(LUNCH\)/i.test(String(s || '')) ? i : -1).filter(i => i >= 0);
        for (let d = 0; d < days; d++) {
          lunchIndices.forEach((li) => {
            if (li >= 0 && li < hours) base[d][li] = { subjectName: 'Lunch', className: '', status: 'break', teacherId: '' };
          });
        }
      } catch (e) {
        // ignore
      }

      // Fill assigned slots
      Object.keys(generatedTimetables).forEach((className) => {
        const table = generatedTimetables[className];
        if (!Array.isArray(table)) return;
        table.forEach((daySlots, dayIdx) => {
          daySlots.forEach((slot, periodIdx) => {
            if (periodIdx < hours && dayIdx < days) {
              // Skip assigning to break/lunch slots
              if (base[dayIdx] && base[dayIdx][periodIdx] && base[dayIdx][periodIdx].status === 'break') return;

              if (slot && slot.teacherId === teacherId) {
                const displayName = resolveElectiveSubjectForTeacher({ classesList: classes, className, originalName: slot.subjectName, status: slot.status, teacherId });
                base[dayIdx][periodIdx] = {
                  subjectName: displayName,
                  className,
                  status: slot.status,
                  teacherId: slot.teacherId,
                };
              } else if (slot && slot.status === 'elective' && !base[dayIdx][periodIdx]) {
                const displayName = resolveElectiveSubjectForTeacher({ classesList: classes, className, originalName: slot.subjectName, status: slot.status, teacherId });
                if (displayName && /\(Elective\)$/i.test(displayName)) {
                  base[dayIdx][periodIdx] = {
                    subjectName: displayName,
                    className,
                    status: 'elective',
                    teacherId: teacherId,
                  };
                }
              }
            }
          });
        });
      });

      // Fill remaining as Free
      for (let d = 0; d < days; d++) {
        for (let p = 0; p < hours; p++) {
          if (!base[d][p]) base[d][p] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
        }
      }
      setTeacherTimetable(base);
    }
  }, [generatedTimetables, collegeId, role, timetableSettings, workingDays, hoursPerDay, breakSlots]);

  const handleLogin = async (inputId, inputRole) => {
    const id = (inputId || collegeId || '').trim();
    if (!id) { showMessage("Enter your ID.", "error"); return; }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

    let r = inputRole;
    if (!r) {
      if (id.startsWith('S-')) r = 'student';
      else if (id.startsWith('T-')) r = 'teacher';
      else if (id.startsWith('A-')) r = 'admin';
      else { showMessage('Invalid ID format. Use S-/T-/A- prefix.', 'error'); return; }
    }

    try {
      if (r === 'teacher') {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'teachers', id));
        if (!snap.exists()) { showMessage('Teacher not found.', 'error'); return; }
      } else if (r === 'student') {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id));
        if (!snap.exists()) { showMessage('Student not found.', 'error'); return; }
        // store the student's display name for dashboard header
        try { setStudentName((snap.data && snap.data().name) || snap?.data?.name || 'Student'); } catch (e) { setStudentName('Student'); }
      } else if (r === 'admin') {
        const adminDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'admins', id);
        const snap = await getDoc(adminDocRef);
        if (!snap.exists()) {
          setPendingAdminId(id);
          setShowAdminCreateModal(true);
          return;
        }
      }

      setCollegeId(id);
      setRole(r);

      if (r === 'student') {
        const cls = classes.find(c => Array.isArray(c.students) && c.students.includes(id));
        if (cls) setStudentClass(cls.name);
      }

      // Set default view based on role
      if (r === 'admin') {
        setCurrentView('admin-upload');
      } else {
        setCurrentView('dashboard');
      }
    } catch (e) {
      console.error(e);
      showMessage('Login failed. Try again.', 'error');
    }
  };

  const createAdminNow = async () => {
    try {
      if (!db || !pendingAdminId) { setShowAdminCreateModal(false); return; }
      const adminDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'admins', pendingAdminId);
      await setDoc(adminDocRef, { id: pendingAdminId }, { merge: true });
      setShowAdminCreateModal(false);
      setCollegeId(pendingAdminId);
      setRole('admin');
      setCurrentView('dashboard');
    } catch (e) {
      console.error(e);
      showMessage('Failed to create admin. Try again.', 'error');
    }
  };

  const cancelCreateAdmin = () => {
    setShowAdminCreateModal(false);
    setPendingAdminId('');
    showMessage('Admin access denied.', 'error');
  };

  const backToLogin = () => {
    setRole(null);
    setCollegeId("");
    setStudentClass(null);
    setStudentName('');
    setCurrentView('dashboard');
  };

  const handleNavigation = (view) => setCurrentView(view);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
  };

  const handleTeacherCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { showMessage("No file selected.", "error"); return; }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

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

        const get = (row, keys) => { for (const k of keys) if (row[k] !== undefined) return row[k]; return undefined; };

        const newTeachers = json.map((row) => {
          const id = String(get(row, ['TeacherID', 'ID', 'Id', 'teacher id']));
          const name = get(row, ['Name', 'TeacherName', 'FullName']) ? String(get(row, ['Name', 'TeacherName', 'FullName'])) : '';
          const hours = Number(get(row, ['WorkingHours', 'NumberOfWorkingHours', 'Hours', 'working hours']));
          if (!id || !Number.isFinite(hours)) {
            throw new Error(`Missing required fields (TeacherID, WorkingHours) in row: ${JSON.stringify(row)}`);
          }
          const pref1 = get(row, ['FirstPreference', 'First Preference', 'Expertise', 'Specialization']);
          const pref2 = get(row, ['SecondPreference', 'Second Preference']);
          return {
            id: id,
            name: name,
            weeklyRequiredHours: hours,
            hoursLeft: hours,
            skipsUsed: 0,
            expertise: pref1 ? String(pref1) : '',
            preferences: [pref1 ? String(pref1) : '', pref2 ? String(pref2) : ''].filter(Boolean),
          };
        });

        const teachersPublicRef = collection(db, "artifacts", appId, "public", "data", "teachers");
        // Upload new/updated teachers
        const uploadPromises = newTeachers.map((teacher) => {
          const teacherDocRef = doc(teachersPublicRef, teacher.id);
          return setDoc(teacherDocRef, teacher, { merge: true });
        });
        await Promise.all(uploadPromises);

        // Delete teachers not present in this upload
        const existingTeachersSnap = await getDocs(teachersPublicRef);
        const latestTeacherIds = new Set(newTeachers.map(t => String(t.id)));
        const deletions = [];
        existingTeachersSnap.forEach((d) => {
          if (!latestTeacherIds.has(d.id)) {
            deletions.push(deleteDoc(doc(teachersPublicRef, d.id)));
          }
        });
        if (deletions.length) await Promise.all(deletions);

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
    if (!file) { showMessage("No file selected.", "error"); return; }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

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

        const get = (row, keys) => { for (const k of keys) if (row[k] !== undefined) return row[k]; return undefined; };
        const sanitizeId = (s) => String(s).replace(/\//g, '_').replace(/\s+/g, '-');
        const existingClassIndex = classes.reduce((acc, cls) => {
          if (!cls) return acc;
          const nameKey = cls.name || cls.id;
          if (nameKey) acc[nameKey] = cls;
          if (cls.id) acc[cls.id] = cls;
          return acc;
        }, {});
        const classesMap = {};

        const studentsPublicRef = collection(db, "artifacts", appId, "public", "data", "students");
        const classPublicRef = collection(db, "artifacts", appId, "public", "data", "classes");

        const uploads = [];
        const latestStudentIds = new Set();
        json.forEach((row) => {
          const studentId = String(get(row, ['StudentID', 'ID', 'student id']));
          const studentName = get(row, ['Name', 'StudentName']) ? String(get(row, ['Name', 'StudentName'])) : '';
          const program = get(row, ['Program', 'Major', 'Discipline']) ? String(get(row, ['Program', 'Major', 'Discipline'])) : '';
          const semester = Number(get(row, ['Semester', 'Sem'])) || 1;
          const section = get(row, ['Section', 'ClassSection']) ? String(get(row, ['Section', 'ClassSection'])) : 'A';
          const classKey = `${program || 'Program'}-SEM${semester}-${section}`;
          const classId = sanitizeId(classKey);

          if (!classKey || !studentId) {
            throw new Error(`Missing class or student identifier in row: ${JSON.stringify(row)}`);
          }

          if (!classesMap[classKey]) {
            const existing = existingClassIndex[classKey] || existingClassIndex[classId] || {};
            classesMap[classKey] = {
              id: existing.id || classId,
              name: classKey,
              program,
              semester,
              section,
              subjects: Array.isArray(existing.subjects) ? existing.subjects : [],
              students: Array.isArray(existing.students) ? [...existing.students] : [],
            };
          }
          classesMap[classKey].students.push(studentId);

          const parseList = (v) => (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : []);
          const studentDoc = {
            id: studentId,
            name: studentName,
            program,
            semester,
            section,
            minorCourses: parseList(get(row, ['MinorCourses', 'Minor'])),
            skillBasedCourses: parseList(get(row, ['SkillBasedCourses', 'Skill-Based'])),
            abilityEnhancementCourses: parseList(get(row, ['AbilityEnhancementCourses', 'AEC'])),
            valueAddedCourses: parseList(get(row, ['ValueAddedCourses', 'VAC'])),
          };
          const sid = sanitizeId(studentId);
          latestStudentIds.add(sid);
          uploads.push(setDoc(doc(studentsPublicRef, sid), studentDoc, { merge: true }));
        });

        // Upload classes
        Object.keys(classesMap).forEach((clsName) => {
          const cls = classesMap[clsName];
          cls.students = Array.from(new Set(cls.students));
          uploads.push(setDoc(doc(classPublicRef, cls.id), cls, { merge: true }));
        });

        // Remove classes not present in current dataset
        const currentIds = new Set(Object.keys(classesMap).map((n) => sanitizeId(n)));
        const existing = await getDocs(classPublicRef);
        existing.forEach((d) => {
          if (!currentIds.has(d.id)) {
            uploads.push(deleteDoc(doc(classPublicRef, d.id)));
            // also remove any existing timetable for that class
            const ttRef = doc(db, "artifacts", appId, "public", "data", "timetables", d.id);
            uploads.push(deleteDoc(ttRef));
          }
        });

        // Remove students not present in current dataset
        const existingStudents = await getDocs(studentsPublicRef);
        existingStudents.forEach((d) => {
          if (!latestStudentIds.has(d.id)) {
            uploads.push(deleteDoc(doc(studentsPublicRef, d.id)));
          }
        });

        await Promise.all(uploads);
        setClasses(Object.values(classesMap));

        // Auto-populate subjects for all classes using existing Courses dataset
        try {
          await autoPopulateSubjectsFromCourses();
          showMessage("Students uploaded. Classes synced and subjects auto-assigned.", "success");
        } catch (e) {
          console.error(e);
          showMessage("Students uploaded. Failed to auto-assign subjects.", "error");
        }
      } catch (error) {
        console.error("Error uploading students:", error);
        showMessage(`Failed to upload students. Check the console for details: ${error.message}`, "error");
      } finally {
        setIsUploading(false);
      }
    };
  reader.readAsBinaryString(file);
  };

  // Auto-populate class subjects from Courses dataset (by Program + Semester) and assign teachers heuristically
  const autoPopulateSubjectsFromCourses = async () => {
    if (!db) throw new Error("Database not ready.");
    const sanitizeId = (s) => String(s).replace(/\//g, '_').replace(/\s+/g, '-');

    const coursesRef = collection(db, "artifacts", appId, "public", "data", "courses");
    const classesRef = collection(db, "artifacts", appId, "public", "data", "classes");
    const teachersRef = collection(db, "artifacts", appId, "public", "data", "teachers");

    const [coursesSnap, classesSnap, teachersSnap] = await Promise.all([
      getDocs(coursesRef),
      getDocs(classesRef),
      getDocs(teachersRef),
    ]);

    const coursesList = coursesSnap.docs.map(d => d.data());
    const teachersList = teachersSnap.docs.map(d => d.data());

    const pickTeachersForCourse = (courseName) => {
      const name = String(courseName || '').toLowerCase();
      const matched = teachersList.filter(t => {
        const prefs = Array.isArray(t.preferences) ? t.preferences : [];
        const prefHit = prefs.some(p => String(p || '').toLowerCase().includes(name));
        const expertiseHit = String(t.expertise || '').toLowerCase().includes(name);
        return prefHit || expertiseHit;
      }).map(t => t.id);
      if (matched.length > 0) return matched;
      // Fallback: allow any teacher (generator will balance by hours)
      return teachersList.map(t => t.id);
    };

    const updates = [];
    const updatedClasses = [];
    for (const clsDoc of classesSnap.docs) {
      const clsData = clsDoc.data() || {};
      const classId = clsDoc.id;
      const className = clsData.name || classId;
      const program = String(clsData.program || '');
      const sem = Number(clsData.semester ?? clsData.sem ?? 1);

      const relevant = coursesList.filter(c => String(c.program || '') === program && Number(c.semester || 0) === sem);
      const electivesList = relevant.filter(c => /elective/i.test(String(c.category || '')));
      const normalList = relevant.filter(c => !/elective/i.test(String(c.category || '')));

      const subjects = normalList.map(c => ({
        name: c.name,
        credits: Number(c.credits || 0),
        teachers: pickTeachersForCourse(c.name),
        courseType: /skill/i.test(String(c.category || '')) ? 'skill_based' : 'major',
        isLab: !!c.isLab,
        delivery: c.isLab ? 'lab' : 'theory',
        style: c.style || 'hard_theory',
        sem: Number(c.semester || 1),
      }));

      if (electivesList.length > 0) {
        const details = electivesList.map(e => ({
          name: e.name,
          isLab: !!e.isLab,
          style: e.style || 'hard_theory',
          teachers: pickTeachersForCourse(e.name),
          credits: Number(e.credits || 0),
        }));

        const group = {
          name: `${program} Electives (Sem ${sem})`,
          credits: details.reduce((s, d) => s + Number(d.credits || 0), 0),
          teachers: [],
          courseType: 'elective',
          isLab: false,
          delivery: 'theory',
          style: 'group',
          sem,
          electiveOptionsDetailed: details,
          electiveChooseCount: 1,
        };
        subjects.push(group);
      }

      updates.push(setDoc(doc(classesRef, classId), { subjects }, { merge: true }));
      updatedClasses.push({ ...clsData, id: classId, name: className, subjects });
    }

    await Promise.all(updates);
    if (updatedClasses.length > 0) setClasses(updatedClasses);
  };

  const handleSubjectAdd = async () => {
    const semNum = Number(newSubjectSem);
    const isValidSem = Number.isFinite(semNum) && semNum >= 1 && semNum <= 8;
    const isElective = newSubjectCourseType === 'elective';
    if (!selectedClass || newSubjectCredits <= 0 || !newSubjectCourseType || !isValidSem || (!isElective && newSubjectTeachers.length === 0) || (!isElective && !newSubjectName)) {
      showMessage("Fill all fields.", "error");
      return;
    }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

    const classToUpdate = classes.find(cls => cls.name === selectedClass);
    if (!classToUpdate) { showMessage("Selected class not found.", "error"); return; }

    let updatedSubjects = [...(classToUpdate.subjects || [])];

    if (isElective) {
      const count = Math.max(1, Number(electiveCount) || 1);
      const chooseCnt = Math.max(1, Math.min(Number(electiveStudentChooseCount) || 1, count));
      if (!Number.isFinite(chooseCnt) || chooseCnt < 1 || chooseCnt > count) {
        showMessage('Students Choose Count must be between 1 and Number of Electives.', 'error');
        return;
      }
      const details = electiveDetails.slice(0, count).map((d) => ({
        name: String(d?.name || '').trim(),
        isLab: String(d?.isLab || 'theory') === 'lab',
        delivery: d?.isLab || 'theory',
        style: d?.style || 'hard_theory',
        teachers: Array.isArray(d?.teachers) ? d.teachers : [],
        credits: Number(newSubjectCredits),
        sem: semNum,
      }));
      if (details.some(d => !d.name || d.teachers.length === 0)) {
        showMessage('Fill each elective: name and at least one teacher.', 'error');
        return;
      }
      const group = {
        name: `${selectedClass} Electives (Sem ${semNum})`,
        credits: Number(newSubjectCredits),
        teachers: [],
        courseType: 'elective',
        isLab: false,
        delivery: 'theory',
        style: 'group',
        sem: semNum,
        electiveOptionsDetailed: details,
        electiveChooseCount: chooseCnt,
      };
      updatedSubjects = [...updatedSubjects, group];
    } else {
      updatedSubjects = [...updatedSubjects, {
        name: newSubjectName,
        credits: Number(newSubjectCredits),
        teachers: newSubjectTeachers,
        courseType: newSubjectCourseType,
        isLab: String(newSubjectIsLab) === 'lab',
        delivery: newSubjectIsLab,
        style: newSubjectCourseStyle,
        sem: semNum,
      }];
    }

    const classRef = doc(db, "artifacts", appId, "public", "data", "classes", selectedClass);
    await setDoc(classRef, { subjects: updatedSubjects }, { merge: true });
    showMessage("Subject added successfully!", "success");
    setNewSubjectName("");
    setNewSubjectCredits(1);
    setNewSubjectTeachers([]);
    setNewSubjectCourseType('major');
    setNewSubjectIsLab('theory');
    setNewSubjectCourseStyle('hard_theory');
    setNewSubjectSem(1);
    setElectiveCount(1);
    setElectiveStudentChooseCount(1);
    setElectiveDetails([{ name: '', isLab: 'theory', style: 'hard_theory', teachers: [] }]);
  };

  const handleDeleteSubject = async (clsName, subjName) => {
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }
    try {
      const classRef = doc(db, "artifacts", appId, "public", "data", "classes", clsName);
      const classSnap = await getDoc(classRef);
      if (!classSnap.exists()) { showMessage("Class not found.", "error"); return; }
      const data = classSnap.data();
      const current = Array.isArray(data.subjects) ? data.subjects : [];
      const updated = current.filter(s => String(s.name) !== String(subjName));
      await setDoc(classRef, { subjects: updated }, { merge: true });
      showMessage("Subject deleted.", "success");
    } catch (e) {
      console.error(e);
      showMessage("Failed to delete subject.", "error");
    }
  };

  const handleClassroomsCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { showMessage("No file selected.", "error"); return; }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

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
        const get = (row, keys) => { for (const k of keys) if (row[k] !== undefined) return row[k]; return undefined; };
        const sanitizeId = (s) => String(s).replace(/\//g, '_').replace(/\s+/g, '-');

        const classroomsRef = collection(db, "artifacts", appId, "public", "data", "classrooms");
        const uploads = json.map((row) => {
          const id = String(get(row, ['ClassroomID', 'RoomID', 'Room', 'Name', 'ID']));
          const location = get(row, ['Location', 'Building', 'Block']) ? String(get(row, ['Location', 'Building', 'Block'])) : '';
          const capacity = Number(get(row, ['Capacity', 'Seats'])) || 0;
          if (!id) throw new Error(`Missing classroom identifier in row: ${JSON.stringify(row)}`);
          const docData = { id, location, capacity };
          return setDoc(doc(classroomsRef, sanitizeId(id)), docData, { merge: true });
        });
        await Promise.all(uploads);
        showMessage("Classrooms uploaded successfully!", "success");
      } catch (error) {
        console.error("Error uploading classrooms:", error);
        showMessage(`Failed to upload classrooms. ${error.message}`, "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCoursesCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { showMessage("No file selected.", "error"); return; }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

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
        const get = (row, keys) => { for (const k of keys) if (row[k] !== undefined) return row[k]; return undefined; };
        const sanitizeId = (s) => String(s).replace(/\//g, '_').replace(/\s+/g, '-');

        const coursesRef = collection(db, "artifacts", appId, "public", "data", "courses");
        const programsRef = collection(db, "artifacts", appId, "public", "data", "programs");

        const programAggregates = {};
        const uploads = [];
        json.forEach((row) => {
          const program = get(row, ['Program', 'ProgramName']);
          const semester = Number(get(row, ['Semester', 'Sem'])) || 1;
          const courseName = String(get(row, ['CourseName', 'Course']));
          const courseCode = get(row, ['CourseCode', 'Code']) ? String(get(row, ['CourseCode', 'Code'])) : courseName;
          const credits = Number(get(row, ['Credits', 'Credit'])) || 0;
          const category = (get(row, ['Category', 'Type']) || '').toString();
          const isLab = String(get(row, ['IsLab', 'Lab'] || '')).toLowerCase();
          const style = (get(row, ['Style']) || '').toString();
          const numSem = Number(get(row, ['NumSemesters', 'NumberOfSemesters'])) || undefined;
          const minCredits = Number(get(row, ['MinTotalCredits', 'MinimumTotalCredits'])) || undefined;

          if (!program || !courseName) throw new Error(`Missing program or course in row: ${JSON.stringify(row)}`);

          const courseDoc = {
            id: courseCode,
            name: courseName,
            code: courseCode,
            program: String(program),
            semester,
            credits,
            category,
            isLab: isLab === 'yes' || isLab === 'true' || isLab === '1',
            style,
          };
          uploads.push(setDoc(doc(coursesRef, sanitizeId(courseCode)), courseDoc, { merge: true }));

          const pKey = String(program);
          if (!programAggregates[pKey]) {
            programAggregates[pKey] = { program: pKey, numSemesters: numSem, minTotalCredits: minCredits, semesters: {} };
          }
          const catKey = (/major/i.test(category) ? 'Major' : /minor/i.test(category) ? 'Minor' : /skill/i.test(category) ? 'SkillBased' : /ability/i.test(category) ? 'AbilityEnhancement' : /value/i.test(category) ? 'ValueAdded' : 'Other');
          if (!programAggregates[pKey].semesters[semester]) programAggregates[pKey].semesters[semester] = { Major: [], Minor: [], SkillBased: [], AbilityEnhancement: [], ValueAdded: [], Other: [] };
          programAggregates[pKey].semesters[semester][catKey].push(courseCode);
        });

        Object.keys(programAggregates).forEach((prog) => {
          uploads.push(setDoc(doc(programsRef, sanitizeId(prog)), programAggregates[prog], { merge: true }));
        });

        await Promise.all(uploads);

        // After uploading courses, auto-populate subjects for all classes
        try {
          await autoPopulateSubjectsFromCourses();
          showMessage("Courses uploaded and subjects auto-assigned.", "success");
        } catch (e) {
          console.error(e);
          showMessage("Courses uploaded but failed to auto-assign subjects.", "error");
        }
      } catch (error) {
        console.error("Error uploading courses:", error);
        showMessage(`Failed to upload courses. ${error.message}`, "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleFeedbackCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { showMessage("No file selected.", "error"); return; }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

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

        const get = (row, keys) => { for (const k of keys) if (row[k] !== undefined) return row[k]; return undefined; };
        const sanitizeId = (s) => String(s).replace(/\//g, '_').replace(/\s+/g, '-');
        const feedbackRef = collection(db, "artifacts", appId, "public", "data", "feedback");

        const uploads = json.map((row, idx) => {
          const studentId = get(row, ['StudentID', 'ID']);
          const teacherId = get(row, ['TeacherID']);
          const teacherRatingRaw = get(row, ['TeacherRating', 'RatingForTeacher']);
          const courseId = get(row, ['CourseID', 'CourseCode']);
          const courseName = get(row, ['CourseName']);
          const courseRatingRaw = get(row, ['CourseRating', 'RatingForCourse']);

          const teacherRating = teacherRatingRaw === undefined || teacherRatingRaw === null || String(teacherRatingRaw).toLowerCase() === 'nil' ? null : Number(teacherRatingRaw);
          const courseRating = courseRatingRaw === undefined || courseRatingRaw === null || String(courseRatingRaw).toLowerCase() === 'nil' ? null : Number(courseRatingRaw);

          const fid = sanitizeId(`${studentId || 'NA'}-${teacherId || 'NA'}-${courseId || courseName || 'NA'}`);
          const docData = { studentId: studentId || null, teacherId: teacherId || null, teacherRating, courseId: courseId || null, courseName: courseName || null, courseRating };
          return setDoc(doc(feedbackRef, fid), docData, { merge: true });
        });
        await Promise.all(uploads);
        showMessage("Feedback uploaded successfully!", "success");
      } catch (error) {
        console.error("Error uploading feedback:", error);
        showMessage(`Failed to upload feedback. ${error.message}`, "error");
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const deleteAllUploadedData = async () => {
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }
    const proceed = window.confirm("This will delete all uploaded data (teachers, students, classes, classrooms, courses, programs, feedback, timetables, cancellations, notifications, student selections). Continue?");
    if (!proceed) return;
    setIsPurging(true);
    try {
      const base = ["artifacts", appId, "public", "data"];
      const collectionsToDelete = [
        "teachers",
        "students",
        "classes",
        "classrooms",
        "courses",
        "programs",
        "feedback",
        "timetables",
        "cancellations",
        "notifications",
        "studentElectives"
      ];
      await Promise.all(collectionsToDelete.map(async (name) => {
        const ref = collection(db, ...base, name);
        const snap = await getDocs(ref);
        const ops = snap.docs.map((d) => deleteDoc(doc(ref, d.id)));
        if (ops.length) await Promise.all(ops);
      }));
      showMessage("All uploaded data deleted.", "success");
    } catch (e) {
      console.error("Purge error:", e);
      showMessage("Failed to delete all data. Check console.", "error");
    } finally {
      setIsPurging(false);
    }
  };

  const saveSettings = async () => {
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }

    // Validate lunch window and ensure breakSlots do not include lunch index
    try {
      const headerSlots = Array.isArray(calculateTimeSlots()) ? calculateTimeSlots() : [];
      const lunchIndices = headerSlots.map((s, i) => /\(LUNCH\)/i.test(String(s || '')) ? i : -1).filter(i => i >= 0);

      // If lunch indices present, validate their times fall within 12:00 - 13:40 window
      for (const li of lunchIndices) {
        const label = headerSlots[li] || '';
        const m = String(label).match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
        if (m) {
          const toMin = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
          const start = toMin(m[1]);
          const end = toMin(m[2]);
          const earliest = 12 * 60; // 12:00
          const latestEnd = 13 * 60 + 40; // 13:40
          if (start < earliest || end > latestEnd) {
            showMessage(`Computed lunch slot (${label}) must be between 12:00 and 13:40. Adjust class times or duration.`, 'error');
            return;
          }
        } else {
          showMessage('Unable to parse computed lunch slot label. Check timetable slot configuration.', 'error');
          return;
        }
      }

      // Ensure breakSlots does not include lunch indices
      const breaks = Array.isArray(breakSlots) ? breakSlots.slice() : [];
      const intersection = breaks.filter(b => lunchIndices.includes(b));
      if (intersection.length > 0) {
        showMessage(`Break Slots must not include lunch index(es): ${intersection.join(', ')}. Remove them from Break Slots.`, 'error');
        return;
      }
    } catch (err) {
      // ignore validation errors above and proceed to saving; but log
      console.warn('Validation error computing lunch/break slots', err);
    }

    try {
      const settingsRef = doc(db, "artifacts", appId, "public", "data", "timetables", "settings");
      await setDoc(settingsRef, {
        workingDays, hoursPerDay, breakSlots, electiveSlots, classStartTime, classDuration, dayStartTime, dayEndTime, freePeriodPercentage,
        bypassHoursCheck: Boolean(bypassHoursCheck)
      }, { merge: true });
      showMessage("Settings saved.", "success");
    } catch (e) {
      console.error(e);
      showMessage("Failed to save settings.", "error");
    }
  };

  const updateBypassSetting = async (value) => {
    // Persist bypassHoursCheck immediately when toggled from top admin header
    setBypassHoursCheck(Boolean(value));
    if (!db) { showMessage('Database not ready. Toggle will persist after DB connects.', 'warning'); return; }
    try {
      const settingsRef = doc(db, "artifacts", appId, "public", "data", "timetables", "settings");
      await setDoc(settingsRef, { bypassHoursCheck: Boolean(value) }, { merge: true });
      showMessage('Bypass setting saved.', 'success');
    } catch (e) {
      console.error('Failed to update bypass setting', e);
      showMessage('Failed to save bypass setting.', 'error');
    }
  };

  const generateTimetable = async () => {
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    if (classes.length === 0 || teachers.length === 0) {
      showMessage("Please upload teacher and student data first.", "error");
      isGeneratingRef.current = false;
      return;
    }
    if (!db) { showMessage("Database not ready. Please try again.", "error"); isGeneratingRef.current = false; return; }

    const classesWithoutSubjects = classes.filter(cls => !cls.subjects || cls.subjects.length === 0);
    if (classesWithoutSubjects.length > 0) {
      const classNames = classesWithoutSubjects.map(c => c.name).join(", ");
      showMessage(`Classes ${classNames} have no subjects assigned. Please assign subjects before generating the timetable.`, "error");
      isGeneratingRef.current = false;
      return;
    }

    // New validations: subjects without credits (no periods) and too many subjects vs available slots
    const slotsPerDay = Math.max(0, Number(hoursPerDay || 0) - (Array.isArray(breakSlots) ? breakSlots.length : 0) - (Array.isArray(electiveSlots) ? electiveSlots.length : 0));
    const teachingSlotsPerWeek = Math.max(0, Number(workingDays || 0) * slotsPerDay);

    for (const cls of classes) {
      const subjList = Array.isArray(cls.subjects) ? cls.subjects : [];
      const noPeriodSubjects = subjList.filter(s => !s || Number(s.credits || 0) <= 0).map(s => s && s.name ? s.name : 'Unnamed');
      if (noPeriodSubjects.length > 0) {
        showMessage(`Class ${cls.name}: the respective course has no periods -> ${noPeriodSubjects.join(', ')}`, 'error');
        isGeneratingRef.current = false;
        return;
      }
      if (subjList.length > teachingSlotsPerWeek) {
        showMessage(`Class ${cls.name} has too many subjects (${subjList.length}) for available periods (${teachingSlotsPerWeek}).`, 'error');
        isGeneratingRef.current = false;
        return;
      }
    }

    // Ensure lunch periods are treated as break slots for generation
    let computedBreakSlots = Array.isArray(breakSlots) ? breakSlots.slice() : [];
    try {
      const headerSlots = Array.isArray(calculateTimeSlots()) ? calculateTimeSlots() : [];
      const lunchIndices = headerSlots.map((s, i) => /\(LUNCH\)/i.test(String(s || '')) ? i : -1).filter(i => i >= 0);
      computedBreakSlots = Array.from(new Set([...(computedBreakSlots || []), ...lunchIndices]));
    } catch (e) {
      // ignore
    }

    const { timetables: newTimetables, teacherHoursLeft } = acGenerateTimetables({
      classes,
      teachers,
      workingDays,
      hoursPerDay,
      breakSlots: computedBreakSlots || [],
      electivePeriodIndices: electiveSlots || [],
      programs,
      courses,
      courseRatings,
      options: { ants: 40, iterations: 80, evaporation: 0.45, alpha: 1, beta: 3 }
    });

    try {
      const settingsRef = doc(db, "artifacts", appId, "public", "data", "timetables", "settings");
      await setDoc(settingsRef, {
        workingDays, hoursPerDay, breakSlots, electiveSlots, classStartTime, classDuration, dayStartTime, dayEndTime, freePeriodPercentage
      }, { merge: true });

      for (const clsName in newTimetables) {
        const timetableRef = doc(db, "artifacts", appId, "public", "data", "timetables", clsName);
        await setDoc(timetableRef, { timetable: JSON.stringify(newTimetables[clsName]) });
      }

      for (const t of teachers) {
        const teacherRef = doc(db, "artifacts", appId, "public", "data", "teachers", t.id);
        await setDoc(teacherRef, { hoursLeft: teacherHoursLeft[t.id] }, { merge: true });
      }

      showMessage("Timetable generated and saved successfully!", "success");
    } catch (error) {
      console.error("Error generating/saving timetable:", error);
      showMessage("Failed to generate and save timetable. Check console for details.", "error");
    } finally {
      isGeneratingRef.current = false;
    }
  };

  const buildTeacherTimetableFor = (teacherId) => {
    const days = workingDays;
    const hours = hoursPerDay;
    const breaks = breakSlots || [];
    const base = Array.from({ length: days }, () => Array.from({ length: hours }, () => null));

    for (let d = 0; d < days; d++) {
      breaks.forEach((p) => {
        if (p >= 0 && p < hours) {
          base[d][p] = { subjectName: 'Break', className: '', status: 'break', teacherId: '' };
        }
      });
    }

    // Also mark lunch slots in this base so lunch cannot be assigned
    try {
      const headerSlots = Array.isArray(calculateTimeSlots()) ? calculateTimeSlots() : [];
      const lunchIndices = headerSlots.map((s, i) => /\(LUNCH\)/i.test(String(s || '')) ? i : -1).filter(i => i >= 0);
      for (let d = 0; d < days; d++) {
        lunchIndices.forEach((li) => {
          if (li >= 0 && li < hours) base[d][li] = { subjectName: 'Lunch', className: '', status: 'break', teacherId: '' };
        });
      }
    } catch (e) {}

    Object.keys(generatedTimetables).forEach((className) => {
      const table = generatedTimetables[className];
      if (!Array.isArray(table)) return;
      table.forEach((daySlots, dayIdx) => {
        daySlots.forEach((slot, periodIdx) => {
          // Skip if the target slot is already a break/lunch marker
          if (base[dayIdx] && base[dayIdx][periodIdx] && base[dayIdx][periodIdx].status === 'break') return;

          if (slot && slot.teacherId === teacherId) {
            const displayName = resolveElectiveSubjectForTeacher({ classesList: classes, className, originalName: slot.subjectName, status: slot.status, teacherId });
            base[dayIdx][periodIdx] = {
              subjectName: displayName,
              className,
              status: slot.status,
              teacherId: slot.teacherId,
            };
          } else if (slot && slot.status === 'elective' && !base[dayIdx][periodIdx]) {
            const displayName = resolveElectiveSubjectForTeacher({ classesList: classes, className, originalName: slot.subjectName, status: slot.status, teacherId });
            if (displayName && /\(Elective\)$/i.test(displayName)) {
              base[dayIdx][periodIdx] = {
                subjectName: displayName,
                className,
                status: 'elective',
                teacherId: teacherId,
              };
            }
          }
        });
      });
    });

    for (let d = 0; d < days; d++) {
      for (let p = 0; p < hours; p++) {
        if (!base[d][p]) base[d][p] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
      }
    }
    return base;
  };

  const handleSlotToggle = async (dayIndex, periodIndex, slot) => {
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }
    if (!slot) return;
    const className = slot.className;
    const subjectName = slot.subjectName;
    const currentTeacherId = collegeId;

    if (role === 'teacher' && slot.status === 'confirmed' && subjectName !== 'Free') {
      try {
        const cancelRef = doc(db, "artifacts", appId, "public", "data", "cancellations", `${className}_${dayIndex}_${periodIndex}`);
        await setDoc(cancelRef, { className, dayIndex, periodIndex, subjectName, teacherId: currentTeacherId, status: 'pending', createdAt: Date.now() }, { merge: true });
        const notifRef = doc(db, "artifacts", appId, "public", "data", "notifications", `admin_${className}_${dayIndex}_${periodIndex}`);
        await setDoc(notifRef, { type: 'teacher_cancellation_request', status: 'pending', forRole: 'admin', className, dayIndex, periodIndex, subjectName, teacherId: currentTeacherId, createdAt: Date.now() }, { merge: true });
        showMessage('Cancellation request sent to admin.', 'info');
      } catch (e) {
        console.error(e);
        showMessage('Failed to send cancellation request.', 'error');
      }
      return;
    }
  };

  const calculateTimeSlots = () => {
    // Generate a detailed slot list including two 20-min breaks (morning & after lunch) and lunch fixed at 12:00-13:40.
    const settings = timetableSettings || { hoursPerDay, classStartTime, classDuration, breakSlots, dayStartTime };
    const { hoursPerDay: hpd, classStartTime: cst, classDuration: dur, breakSlots: brks, dayStartTime: dst } = settings;
    const hours = Number(hpd || hoursPerDay || 0);
    const classDur = Number(dur || classDuration || 60);
    if (!hours || !classDur) return [];

    const parseTime = (s) => {
      const [hh, mm] = String(s || '09:00').split(':').map(Number);
      return (Number.isFinite(hh) ? hh : 9) * 60 + (Number.isFinite(mm) ? mm : 0);
    };
    const format24 = (mins) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(h)}:${pad(m)}`;
    };

    const startTimeMinutes = parseTime(typeof dst === 'string' && dst ? dst : (typeof cst === 'string' && cst ? cst : '09:00'));
    const lunchWindowStart = 12 * 60; // earliest lunch start 12:00
    const lunchWindowEnd = 13 * 60 + 40; // latest lunch end 13:40
    const lunchMinStart = lunchWindowStart; // 720
    const lunchMaxStart = lunchWindowEnd - 60; // latest start so 60-min lunch fits (760 = 12:40)
    const lunchDuration = 60; // one hour lunch
    const morningBreakDuration = 20;
    const afternoonBreakDuration = 20;

    const slots = [];

    // Respect explicit breaks if provided, otherwise compute sensible defaults
    const explicitBreaks = Array.isArray(brks) && brks.length ? brks.slice() : null;

    // Estimate where lunch should go relative to start
    let estimatedLunchIndex = Math.max(0, Math.round((lunchWindowStart - startTimeMinutes) / classDur));
    estimatedLunchIndex = Math.min(Math.max(1, estimatedLunchIndex), Math.max(1, hours - 2));

    const morningBreakIndexDefault = Math.max(1, Math.floor(estimatedLunchIndex / 2));
    const afternoonBreakIndexDefault = Math.min(hours - 1, estimatedLunchIndex + Math.max(1, Math.floor((hours - estimatedLunchIndex) / 2)));

    // compute estimated lunch start minute and clamp into allowed window
    const estimatedLunchStart = startTimeMinutes + estimatedLunchIndex * classDur;
    const lunchStart = Math.min(Math.max(estimatedLunchStart, lunchMinStart), lunchMaxStart);
    const lunchEnd = lunchStart + lunchDuration;

    let current = startTimeMinutes;
    let placedLunch = false;

    for (let i = 0; i < hours; i++) {
      const isExplicitBreak = explicitBreaks ? explicitBreaks.includes(i) : false;
      const isMorningBreak = !explicitBreaks && i === morningBreakIndexDefault;
      const isAfternoonBreak = !explicitBreaks && i === afternoonBreakIndexDefault;

      // If lunch not yet placed and this slot would overlap lunch window OR we're at the estimated lunch index, place lunch
      const wouldOverlapLunch = (current < lunchStart && (current + classDur) >= lunchStart) || (i === estimatedLunchIndex && !placedLunch);
      if (!placedLunch && wouldOverlapLunch) {
        const start = lunchStart;
        const end = lunchEnd;
        slots.push(`${format24(start)} - ${format24(end)} (LUNCH)`);
        current = end;
        placedLunch = true;
        continue;
      }

      if (isExplicitBreak || isMorningBreak || isAfternoonBreak) {
        slots.push('Break');
        current += morningBreakDuration; // 20
        continue;
      }

      const start = current;
      const end = current + classDur;
      slots.push(`${format24(start)} - ${format24(end)}`);
      current = end;
    }

    // Ensure lunch exists in result; if not, replace middle slot
    if (!slots.some(s => /12:00/.test(s) || /\(LUNCH\)/.test(s))) {
      const mid = Math.floor(slots.length / 2);
      slots[mid] = `${format24(lunchStart)} - ${format24(lunchEnd)} (LUNCH)`;
    }

    return slots;
  };

  // Memoize computed time slots to avoid producing a new array on every render
  const cachedTimeSlots = useMemo(() => calculateTimeSlots(), [timetableSettings, hoursPerDay, classStartTime, classDuration, breakSlots, dayStartTime]);

  const approveCancellation = async (c) => {
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }
    try {
      // 1) Update the class timetable slot to Free
      const tRef = doc(db, "artifacts", appId, "public", "data", "timetables", c.className);
      const tDoc = await getDoc(tRef);
      if (!tDoc.exists()) return;
      const table = parseTimetableData(tDoc.data().timetable);
      if (!table?.[c.dayIndex]?.[c.periodIndex]) return;
      table[c.dayIndex][c.periodIndex] = { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
      await setDoc(tRef, { timetable: JSON.stringify(table), updatedAt: Date.now() }, { merge: true });

      // 2) Build candidate teacher IDs (normalize names -> IDs if needed)
      const normalizeTeacherId = (val) => {
        const s = String(val || '').trim();
        if (!s) return '';
        const byId = teachers.find(t => String(t.id) === s);
        if (byId) return byId.id;
        const byName = teachers.find(t => String(t.name).toLowerCase() === s.toLowerCase());
        return byName ? byName.id : s; // fallback to original
      };

      const classDef = classes.find(cl => cl.name === c.className);
      const subjectDef = classDef?.subjects?.find(s => s.name === c.subjectName);
      const sameCourseTeachersRaw = subjectDef?.teachers || [];
      const classTeachersRaw = Array.from(new Set((classDef?.subjects || []).flatMap(s => s.teachers || [])));
      const allRaw = [...sameCourseTeachersRaw, ...classTeachersRaw].filter(Boolean);
      const normalized = Array.from(new Set(allRaw.map(normalizeTeacherId)));
      const requesterId = normalizeTeacherId(c.teacherId);
      const candidates = normalized.filter(tid => tid && tid !== requesterId);

      // 3) Send substitution offers to available candidates (check latest DB timetables for availability)
      const offersRefBase = collection(db, "artifacts", appId, "public", "data", "notifications");
      // Read latest timetables from Firestore to ensure availability checks are correct
      const timetablesRef = collection(db, "artifacts", appId, "public", "data", "timetables");
      const ttSnap = await getDocs(timetablesRef);
      const ttDocs = ttSnap.docs.map(d => ({ id: d.id, table: parseTimetableData(d.data().timetable) }));

      const offerOps = candidates.map(async (tid) => {
        let busy = false;
        for (const td of ttDocs) {
          const slot2 = td.table?.[c.dayIndex]?.[c.periodIndex];
          if (slot2 && slot2.status !== 'free' && slot2.status !== 'break' && normalizeId(slot2.teacherId) === normalizeId(tid)) { busy = true; break; }
        }
        if (!busy) {
          const nid = `offer_${c.className}_${c.dayIndex}_${c.periodIndex}_${tid}`;
          const requesterName = (teachers.find(t => t.id === requesterId) || {}).name || '';
          await setDoc(doc(offersRefBase, nid), {
            type: 'substitution_offer',
            status: 'pending',
            forRole: 'teacher',
            candidateId: tid,
            requesterId,
            requesterName,
            className: c.className,
            dayIndex: Number(c.dayIndex),
            periodIndex: Number(c.periodIndex),
            subjectName: c.subjectName,
            createdAt: Date.now()
          }, { merge: true });
        }
      });
      await Promise.all(offerOps);

      // Notify requester (approval)
      await setDoc(doc(offersRefBase, `approval_${c.className}_${c.dayIndex}_${c.periodIndex}_${requesterId}`), {
        type: 'cancellation_approved',
        status: 'approved',
        forRole: 'teacher',
        candidateId: requesterId,
        className: c.className,
        dayIndex: Number(c.dayIndex),
        periodIndex: Number(c.periodIndex),
        subjectName: c.subjectName,
        createdAt: Date.now()
      }, { merge: true });

      // 4) Mark cancellation approved
      await setDoc(doc(db, "artifacts", appId, "public", "data", "cancellations", c.id), { status: 'approved', approvedAt: Date.now() }, { merge: true });
      showMessage('Cancellation approved and offers sent.', 'success');
    } catch (e) {
      console.error(e);
      showMessage('Failed to approve.', 'error');
    }
  };

  const rejectCancellation = async (c) => {
    if (!db) return;
    await setDoc(doc(db, "artifacts", appId, "public", "data", "cancellations", c.id), { status: 'rejected', rejectedAt: Date.now() }, { merge: true });
    showMessage('Cancellation rejected.', 'info');
  };

  const acceptOffer = async (offer) => {
    if (!db) { showMessage("Database not ready. Please try again.", "error"); return; }
    if (!collegeId) { showMessage('Not signed in as a teacher.', 'error'); return; }
    try {
      // If bypass is not enabled, check teacher hoursLeft
      if (!bypassHoursCheck) {
        try {
          const teacherDoc = await getDoc(doc(db, "artifacts", appId, "public", "data", "teachers", collegeId));
          const data = teacherDoc.exists() ? (teacherDoc.data() || {}) : (teachers.find(t => t.id === collegeId) || {});
          const left = Number(data.hoursLeft ?? data.weeklyRequiredHours ?? 0);
          if (!Number.isFinite(left) || left <= 0) { showMessage('No hours left to take substitution.', 'error'); return; }
        } catch (readErr) {
          console.warn('Could not verify hoursLeft, aborting accept to be safe.', readErr);
          showMessage('Unable to verify hours left. Try again later.', 'error');
          return;
        }
      }

      const tRef = doc(db, "artifacts", appId, "public", "data", "timetables", offer.className);
      const tDoc = await getDoc(tRef);
      if (!tDoc.exists()) { showMessage('Class timetable not found.', 'error'); return; }
      const table = parseTimetableData(tDoc.data().timetable);
      const currentSlot = table?.[offer.dayIndex]?.[offer.periodIndex];
      if (!currentSlot || String(currentSlot.subjectName || '').toLowerCase() !== 'free') { showMessage('Slot no longer available.', 'error'); return; }

      // Ensure teacher (candidate) is not assigned elsewhere at this slot by checking latest timetables
      const timetablesRef2 = collection(db, "artifacts", appId, "public", "data", "timetables");
      const ttSnap2 = await getDocs(timetablesRef2);
      for (const ddoc of ttSnap2.docs) {
        const otherTable = parseTimetableData(ddoc.data().timetable);
        const s = otherTable?.[offer.dayIndex]?.[offer.periodIndex];
        if (s && s.status !== 'free' && s.status !== 'break' && normalizeId(s.teacherId) === normalizeId(collegeId)) {
          showMessage('You are busy at that time slot and cannot accept substitution.', 'error');
          return;
        }
      }

      // Reserve the slot
      table[offer.dayIndex][offer.periodIndex] = { subjectName: offer.subjectName, className: offer.className, status: 'confirmed', teacherId: collegeId };
      await setDoc(tRef, { timetable: JSON.stringify(table) });

      // If bypass disabled, decrement hoursLeft by 1
      if (!bypassHoursCheck) {
        try {
          const teacherDoc2 = await getDoc(doc(db, "artifacts", appId, "public", "data", "teachers", collegeId));
          const data2 = teacherDoc2.exists() ? (teacherDoc2.data() || {}) : (teachers.find(t => t.id === collegeId) || {});
          const leftNow = Number(data2.hoursLeft ?? data2.weeklyRequiredHours ?? 0);
          const newLeft = Math.max(0, leftNow - 1);
          await setDoc(doc(db, "artifacts", appId, "public", "data", "teachers", collegeId), { hoursLeft: newLeft }, { merge: true });
        } catch (err) {
          console.warn('Failed to decrement hoursLeft, continuing nonetheless.', err);
        }
      }

      // Mark notification accepted
      await setDoc(doc(db, "artifacts", appId, "public", "data", "notifications", offer.id), { status: 'accepted', actedAt: Date.now() }, { merge: true });
      showMessage('Substitution accepted.', 'success');
    } catch (e) {
      console.error(e);
      showMessage('Failed to accept offer.', 'error');
    }
  };

  const declineOffer = async (offer) => {
    if (!db) return;
    await setDoc(doc(db, "artifacts", appId, "public", "data", "notifications", offer.id), { status: 'declined', actedAt: Date.now() }, { merge: true });
    showMessage('Offer declined.', 'info');
  };

  const saveStudentElectives = async (groupName, optionValue) => {
    if (!db || !userId) { showMessage("Not ready.", "error"); return; }
    // Lock once chosen: do not allow overwriting an existing selection for this group
    if (studentElectivesSelectedMap && studentElectivesSelectedMap[groupName]) {
      showMessage("This elective is locked and cannot be changed.", "error");
      return;
    }
    try {
      // Validate against class definition choose count
      const cls = classes.find(c => c.name === studentClass);
      const subj = cls?.subjects?.find(s => s.name === groupName);
      const required = subj ? Number(subj.electiveChooseCount || 1) : 1;
      const selectedArr = Array.isArray(optionValue) ? optionValue.slice() : [optionValue];
      if (selectedArr.length !== required) {
        showMessage(`You must choose exactly ${required} option(s) for ${groupName}.`, "error");
        return;
      }
      const next = { ...(studentElectivesSelectedMap || {}) };
      next[groupName] = required === 1 ? selectedArr[0] : selectedArr;
      setStudentElectivesSelectedMap(next);
      const ref = doc(db, "artifacts", appId, "public", "data", "studentElectives", userId);
      await setDoc(ref, { selectedMap: next, updatedAt: Date.now() }, { merge: true });
      showMessage("Elective saved.", "success");
    } catch (e) {
      console.error(e);
      showMessage("Failed to save elective.", "error");
    }
  };

  const getElectiveGroupsForStudentClass = () => {
    if (!studentClass) return [];
    const cls = classes.find(c => c.name === studentClass);
    if (!cls) return [];
    return (cls.subjects || [])
      .filter(s => s.courseType === 'elective' && ((Array.isArray(s.electiveOptions) && s.electiveOptions.length > 0) || (Array.isArray(s.electiveOptionsDetailed) && s.electiveOptionsDetailed.length > 0)))
      .map(s => {
        const opts = Array.isArray(s.electiveOptionsDetailed) && s.electiveOptionsDetailed.length > 0 ? s.electiveOptionsDetailed.map(o => o.name).filter(Boolean) : (Array.isArray(s.electiveOptions) ? s.electiveOptions : []);
        return { groupName: s.name, options: opts, chooseCount: Number(s.electiveChooseCount || 1) };
      });
  };

  const downloadTimetable = (clsName, format) => {
    const table = generatedTimetables[clsName];
    if (!table || !isLibrariesLoaded) { showMessage("Timetable or libraries not available for download.", "error"); return; }

    const headerRow = ["Day/Period", ...(calculateTimeSlots().length ? calculateTimeSlots() : Array.from({ length: hoursPerDay }, (_, i) => `Period ${i + 1}`))];
    const safe = (cell) => (cell ? cell.subjectName : 'N/A');
    const bodyRows = table.map((row, dayIdx) => [getWeekdayLabel(dayIdx), ...row.map(safe)]);

    if (format === 'xlsx') {
      const ws = XLSX.utils.aoa_to_sheet([headerRow, ...bodyRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, clsName);
      XLSX.writeFile(wb, `${clsName}_timetable.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF();
      doc.setFontSize(10);
      let y = 10;
      const data = [headerRow, ...bodyRows];
      data.forEach((row, rIdx) => {
        row.forEach((cell, cIdx) => {
          doc.text(String(cell), 10 + cIdx * 30, y + rIdx * 10);
        });
      });
      doc.save(`${clsName}_timetable.pdf`);
    } else if (format === 'txt') {
      const text = [headerRow, ...bodyRows].map(r => r.join('\t')).join('\n');
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${clsName}_timetable.txt`);
    }
    showMessage(`Timetable downloaded as ${format.toUpperCase()}!`, 'success');
  };

  const studentNotifications = useMemo(() => {
    const results = [];
    try {
      const fmt = (ts) => new Date(Number(ts || Date.now())).toLocaleString();
      const dayLabel = (i) => getWeekdayLabel(i);
      const periodLabel = (i) => `Period ${Number(i) + 1}`;

      (Array.isArray(cancellations) ? cancellations : []).forEach((c) => {
        if (!studentClass || String(c.className) !== String(studentClass)) return;
        const st = String(c.status || 'pending').toLowerCase();
        const statusText = st === 'approved' ? 'approved' : st === 'rejected' ? 'rejected' : 'requested';
        results.push({
          id: `cancel_${c.id}`,
          title: `Class ${statusText}: ${c.subjectName} on ${dayLabel(c.dayIndex)} (${periodLabel(c.periodIndex)})`,
          timestamp: fmt(c.createdAt),
          read: false,
        });
      });

      (Array.isArray(acceptedSubstitutions) ? acceptedSubstitutions : []).forEach((n) => {
        if (!studentClass || String(n.className) !== String(studentClass)) return;
        const tName = (teachers.find(t => t.id === n.candidateId)?.name) || n.candidateId || 'Teacher';
        results.push({
          id: `sub_${n.id}`,
          title: `Substitution: ${n.subjectName} on ${dayLabel(n.dayIndex)} (${periodLabel(n.periodIndex)}) will be taken by ${tName}`,
          timestamp: fmt(n.actedAt || n.createdAt),
          read: false,
        });
      });
    } catch {}
    return results.sort((a,b)=> String(b.timestamp).localeCompare(String(a.timestamp)));
  }, [studentClass, cancellations, acceptedSubstitutions, teachers]);

  if (!isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen bg-neutral-900 text-white font-sans p-5">
        <div className="text-xl font-semibold animate-pulse">Loading App...</div>
        <div className="text-sm mt-2">Connecting to Firebase...</div>
      </div>
    );
  }


  const allClassesHaveSubjects = classes.length > 0 && classes.every(cls => cls.subjects && cls.subjects.length > 0);
  const isGenerateEnabled = classes.length > 0 && teachers.length > 0 && allClassesHaveSubjects;
  const isSubjectManagementEnabled = teachers.length > 0;
  const activeScenarioObj = activeScenario ? simulationScenarios[activeScenario] : null;

  const runSimulationScenario = async () => {
    if (isSimulating) return;
    if (!simulationName) { showMessage('Enter a scenario name.', 'error'); return; }
    const scenarioId = `sim_${Date.now()}`;
    const paramsSnapshot = { ...scenarioParams };
    setIsSimulating(true);
    try {
      const clsClone = JSON.parse(JSON.stringify(classes || []));
      const tchrClone = JSON.parse(JSON.stringify(teachers || []));
      let wd = workingDays;
      let hp = hoursPerDay;
      let br = Array.isArray(breakSlots) ? breakSlots.slice() : [];

      if (scenarioType === 'more_free') {
        const delta = Number(paramsSnapshot.deltaPercent) || 0.2;
        for (const c of clsClone) {
          if (!Array.isArray(c?.subjects)) continue;
          c.subjects = c.subjects.map((su) => {
            const creditsValue = Number(su?.credits || 1);
            const adjusted = Math.max(0, Math.round(creditsValue * (1 - delta)));
            return { ...su, credits: adjusted };
          });
        }
      } else if (scenarioType === 'teacher_absence') {
        const tid = String(paramsSnapshot.teacherId || '').trim();
        if (tid) {
          for (let i = tchrClone.length - 1; i >= 0; i--) {
            if (tchrClone[i] && String(tchrClone[i].id) === tid) tchrClone.splice(i, 1);
          }
          for (const c of clsClone) {
            if (!Array.isArray(c?.subjects)) continue;
            c.subjects = c.subjects.map((su) => ({
              ...su,
              teachers: Array.isArray(su?.teachers) ? su.teachers.filter((x) => String(x) !== tid) : []
            }));
          }
        }
      } else if (scenarioType === 'elective_shift') {
        br = br.concat([]);
      } else if (scenarioType === 'enrollment_increase') {
        const add = Number(paramsSnapshot.enrollmentIncrease || 0);
        if (add > 0) {
          for (const c of clsClone) {
            const base = Array.isArray(c?.students) ? c.students : [];
            const additions = Array.from({ length: add }, (_, i) => `SIM_STU_${c?.name || 'CLASS'}_${Date.now()}_${i}`);
            c.students = base.concat(additions);
          }
        }
      } else if (scenarioType === 'exam_shift') {
        const extra = Number(paramsSnapshot.deltaPercent || 1);
        if (Number.isInteger(extra) && extra > 0) {
          hp = Number(hp || 0) + extra;
        } else if (extra > 0) {
          for (let k = 0; k < Math.round(extra); k++) {
            br.push(Math.max(0, (hoursPerDay || 5) - 1 - k));
          }
        }
      }

      const opts = { ants: 30, iterations: 60, evaporation: 0.45, alpha: 1, beta: 3 };

      let programsForGen = programs;
      if (scenarioType === 'more_free') {
        const delta = Number(paramsSnapshot.deltaPercent) || 0.2;
        try {
          const pg = JSON.parse(JSON.stringify(programs || {}));
          Object.keys(pg).forEach((key) => {
            const original = Number(pg[key]?.minTotalCredits ?? programs?.[key]?.minTotalCredits ?? 0);
            pg[key].minTotalCredits = Math.max(0, Math.round(original * (1 - delta)));
          });
          programsForGen = pg;
        } catch {
          programsForGen = programs;
        }
      }

      const electiveIndicesForGen = scenarioType === 'elective_shift'
        ? (Array.isArray(electiveSlots)
          ? electiveSlots.map((idx) => (idx === Number(paramsSnapshot.electiveFrom) ? Number(paramsSnapshot.electiveTo) : idx))
          : [])
        : (electiveSlots || []);

      const { timetables: simTimetables } = acGenerateTimetables({
        classes: clsClone,
        teachers: tchrClone,
        workingDays: wd,
        hoursPerDay: hp,
        breakSlots: br || [],
        electivePeriodIndices: electiveIndicesForGen,
        programs: programsForGen,
        courses,
        courseRatings,
        options: opts
      });

      try {
        const breakIdxSet = new Set(Array.isArray(br) ? br : []);
        Object.keys(simTimetables || {}).forEach((className) => {
          const table = simTimetables[className];
          if (!Array.isArray(table)) return;
          table.forEach((row, dayIndex) => {
            row.forEach((cell, periodIndex) => {
              if (breakIdxSet.has(periodIndex)) {
                table[dayIndex][periodIndex] = { subjectName: 'Break', className: '', status: 'break', teacherId: '' };
              }
            });
          });
        });
      } catch (err) {
        console.warn('Failed to enforce break slots on simulation result', err);
      }

      let filteredSimTimetables = null;
      let substitutionsMap = null;
      const absentTid = scenarioType === 'teacher_absence' ? String(paramsSnapshot.teacherId || '').trim() : '';

      if (scenarioType === 'teacher_absence' && absentTid) {
        try {
          const baseline = generatedTimetables || {};
          const affected = new Set();
          const subs = {};

          Object.keys(baseline || {}).forEach((clsName) => {
            const table = baseline[clsName] || [];
            table.forEach((row, dayIndex) => {
              row.forEach((cell, periodIndex) => {
                if (cell && String(cell.teacherId) === absentTid) {
                  affected.add(clsName);
                  const simTable = simTimetables[clsName] || [];
                  const simCell = (simTable[dayIndex] && simTable[dayIndex][periodIndex]) ? simTable[dayIndex][periodIndex] : null;
                  const to = simCell && simCell.teacherId ? simCell.teacherId : (simCell && (simCell.status || '').toLowerCase() === 'free' ? null : null);
                  subs[clsName] = subs[clsName] || [];
                  subs[clsName].push({ dayIndex, periodIndex, from: absentTid, to });
                }
              });
            });
          });

          if (affected.size > 0) {
            filteredSimTimetables = {};
            Array.from(affected).forEach((clsName) => {
              filteredSimTimetables[clsName] = simTimetables[clsName];
            });
            substitutionsMap = subs;
          } else {
            filteredSimTimetables = null;
            substitutionsMap = {};
          }
        } catch (err) {
          console.warn('Error computing teacher absence affected classes', err);
        }
      }

      const computeMetrics = (ttMap) => {
        const metrics = {
          totalFree: 0,
          freeByClass: {},
          teacherAssignments: {},
          teacherConflicts: [],
          studentHoursByClass: {},
          totalStudentHours: 0,
          teacherHoursMinutes: {}
        };

        const days = Number(workingDays || wd || 5);
        const hours = Number(hoursPerDay || hp || 5);

        Object.keys(ttMap || {}).forEach((clsName) => {
          const table = ttMap[clsName] || [];
          let freeCount = 0;
          let assignedCount = 0;

          table.forEach((row) => {
            row.forEach((cell) => {
              if (!cell) return;
              const status = String((cell.status || '').toLowerCase());
              if (status === 'free' || status === 'break') {
                if (status === 'free') freeCount++;
                return;
              }
              assignedCount++;
              const tid = cell.teacherId;
              if (tid) {
                metrics.teacherAssignments[tid] = (metrics.teacherAssignments[tid] || 0) + 1;
              }
            });
          });

          metrics.freeByClass[clsName] = freeCount;
          metrics.totalFree += freeCount;

          const clsDef = classes.find((c) => c.name === clsName);
          const studentCount = Array.isArray(clsDef?.students) ? clsDef.students.length : 0;
          const classStudentHours = assignedCount * (Number(classDuration || 60) / 60) * studentCount;
          metrics.studentHoursByClass[clsName] = classStudentHours;
          metrics.totalStudentHours += classStudentHours;
        });

        for (let dayIndex = 0; dayIndex < days; dayIndex++) {
          for (let periodIndex = 0; periodIndex < hours; periodIndex++) {
            const assignmentMap = {};
            Object.keys(ttMap || {}).forEach((clsName) => {
              const slot = (ttMap[clsName] || [])[dayIndex] ? (ttMap[clsName] || [])[dayIndex][periodIndex] : null;
              if (slot && slot.teacherId) {
                assignmentMap[slot.teacherId] = assignmentMap[slot.teacherId] || [];
                assignmentMap[slot.teacherId].push({ className: clsName, day: dayIndex, period: periodIndex });
              }
            });
            Object.keys(assignmentMap).forEach((tid) => {
              if (assignmentMap[tid].length > 1) {
                metrics.teacherConflicts.push({ teacherId: tid, assignments: assignmentMap[tid] });
              }
            });
          }
        }

        Object.keys(metrics.teacherAssignments).forEach((tid) => {
          const slots = metrics.teacherAssignments[tid] || 0;
          const minutes = slots * Number(classDuration || 60);
          metrics.teacherHoursMinutes[tid] = minutes;
          metrics.teacherHours = metrics.teacherHours || {};
          metrics.teacherHours[tid] = minutes / 60;
        });

        return metrics;
      };

      const baseline = generatedTimetables || {};
      const baselineMetrics = computeMetrics(baseline);
      const simMetrics = computeMetrics(simTimetables);

      setSimulationScenarios((prev) => {
        const next = { ...(prev || {}) };
        next[scenarioId] = {
          id: scenarioId,
          name: simulationName,
          createdAt: Date.now(),
          timetables: filteredSimTimetables || simTimetables,
          fullTimetables: simTimetables,
          substitutions: substitutionsMap || {},
          metrics: simMetrics,
          baselineMetrics,
          scenarioType,
          scenarioParams: paramsSnapshot
        };
        return next;
      });
      setActiveScenario(scenarioId);
      setSimulationName('');
      showMessage('Scenario simulation completed (local only).', 'success');
    } catch (error) {
      console.error(error);
      showMessage('Simulation failed.', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const clearSimulationScenarios = () => {
    setSimulationScenarios({});
    setActiveScenario(null);
    showMessage('All simulations cleared.', 'info');
  };

  const deleteSimulationScenario = (scenarioId) => {
    const existed = Boolean(simulationScenarios && simulationScenarios[scenarioId]);
    if (!existed) return;
    setSimulationScenarios((prev) => {
      if (!prev || !prev[scenarioId]) return prev;
      const next = { ...prev };
      delete next[scenarioId];
      return next;
    });
    if (activeScenario === scenarioId) {
      setActiveScenario(null);
    }
    showMessage('Simulation deleted.', 'info');
  };

  const toggleSimulationSlot = (className, dayIndex, periodIndex) => {
    const scenarioKey = activeScenario;
    if (!scenarioKey) return;
    setSimulationScenarios((prev) => {
      if (!prev || !prev[scenarioKey]) return prev;
      const scenario = prev[scenarioKey];
      const timetables = scenario.timetables || {};
      const classTable = timetables[className];
      if (!Array.isArray(classTable)) return prev;
      const row = classTable[dayIndex];
      if (!Array.isArray(row)) return prev;
      const cell = row[periodIndex];
      if (cell?.status === 'break') return prev;

      const updatedRow = row.map((slot, idx) => {
        if (idx !== periodIndex) return slot;
        const nextSlot = { ...(slot || {}) };
        if (nextSlot.status === 'free') {
          nextSlot.status = 'confirmed';
          nextSlot.subjectName = 'Custom';
          nextSlot.teacherId = '';
        } else {
          nextSlot.status = 'free';
          nextSlot.subjectName = 'Free';
          nextSlot.teacherId = '';
        }
        return nextSlot;
      });

      const updatedClassTable = classTable.map((existingRow, idx) => (idx === dayIndex ? updatedRow : existingRow));
      const updatedTimetables = { ...timetables, [className]: updatedClassTable };

      return {
        ...prev,
        [scenarioKey]: {
          ...scenario,
          timetables: updatedTimetables
        }
      };
    });
  };

  const portalSurfaceClass = role === 'teacher' || role === 'student' ? 'bg-white text-black' : 'bg-neutral-900 text-white';

  return (
    <div className={`grid place-items-center min-h-screen w-full ${portalSurfaceClass} font-sans p-5`}>
      <div className="text-xs" style={{ color: 'rgb(115, 115, 115)', marginBottom: 16 }}>User ID: {userId || 'Authenticating...'}</div>
      {message.text && (
        <div className={`fixed top-5 z-50 px-6 py-3 rounded-lg shadow-xl text-white transition-all duration-300 ${message.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {message.text}
        </div>
      )}

      {!role && <SignInPage onLogin={handleLogin} />}

      {role && currentView === 'admin-upload' && (
        <div className="admin-layout">
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            role={role}
            collegeId={collegeId}
            onLogout={backToLogin}
          />
          <main className="main-content">
            <AdminUploadPage
              // Upload handlers
              timeSlots={cachedTimeSlots}

              handleTeacherCSV={handleTeacherCSV}
              handleStudentCSV={handleStudentCSV}
              handleClassroomsCSV={handleClassroomsCSV}
              handleCoursesCSV={handleCoursesCSV}
              handleFeedbackCSV={handleFeedbackCSV}
              isUploading={isUploading}

              // Timetable settings
              workingDays={workingDays}
              setWorkingDays={setWorkingDays}
              hoursPerDay={hoursPerDay}
              setHoursPerDay={setHoursPerDay}
              breakSlots={breakSlots}
              setBreakSlots={setBreakSlots}
              electiveSlots={electiveSlots}
              setElectiveSlots={setElectiveSlots}
              dayStartTime={dayStartTime}
              setDayStartTime={setDayStartTime}
              dayEndTime={dayEndTime}
              setDayEndTime={setDayEndTime}
              classStartTime={classStartTime}
              setClassStartTime={setClassStartTime}
              classDuration={classDuration}
              setClassDuration={setClassDuration}
              freePeriodPercentage={freePeriodPercentage}
              setFreePeriodPercentage={setFreePeriodPercentage}

              // Actions
              saveSettings={saveSettings}
              generateTimetable={generateTimetable}
              isGenerating={isGeneratingRef.current}
              deleteAllUploadedData={deleteAllUploadedData}
              isPurging={isPurging}
            />
          </main>
          <style>{`
            .admin-layout {
              display: flex;
              min-height: 100vh;
              width: 100vw;
              background: #fff;
            }

            .main-content {
              flex: 1;
              margin-left: 211px;
              min-height: 100vh;
              overflow-x: hidden;
            }

            @media (max-width: 1024px) {
              .main-content {
                margin-left: 0;
              }
            }
          `}</style>
        </div>
      )}

      {role === "admin" && currentView === 'course' && (
        <div className="admin-layout">
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            role={role}
            collegeId={collegeId}
            onLogout={backToLogin}
          />
          <CourseManagementPage
            classes={classes}
            onNavigate={setCurrentView}
            currentView={currentView}
            role={role}
            collegeId={collegeId}
            onDeleteSubject={handleDeleteSubject}
            teachers={teachers}
            onAddSubject={async (className, subjectData) => {
              // Set the form state to match what handleSubjectAdd expects
              setSelectedClass(className);
              setNewSubjectName(subjectData.name);
              setNewSubjectCredits(subjectData.credits);
              setNewSubjectTeachers(subjectData.teachers);
              setNewSubjectCourseType(subjectData.courseType);
              setNewSubjectIsLab(subjectData.delivery);
              setNewSubjectCourseStyle(subjectData.style);
              setNewSubjectSem(subjectData.sem);

              // Call the existing handler
              await handleSubjectAdd();
            }}
          />
          <style>{`
            .admin-layout {
              display: flex;
              min-height: 100vh;
              width: 100vw;
              background: #fff;
            }
          `}</style>
        </div>
      )}

      {role === "admin" && currentView === 'teacher-timetable' && (
        <AdminTeacherTimetablePage
          collegeId={collegeId}
          onNavigate={setCurrentView}
          currentView={currentView}
          role={role}
          teachers={teachers}
          generatedTimetables={generatedTimetables}
          workingDays={workingDays}
          hoursPerDay={hoursPerDay}
          timeSlots={cachedTimeSlots}
          classes={classes}
          courses={courses}
          programs={programs}
        />
      )}

      {role === "admin" && currentView === 'student-timetable' && (
        <AdminStudentTimetablePage
          collegeId={collegeId}
          onNavigate={setCurrentView}
          currentView={currentView}
          role={role}
          classes={classes}
          generatedTimetables={generatedTimetables}
          workingDays={workingDays}
          hoursPerDay={hoursPerDay}
          timeSlots={cachedTimeSlots}
          breakSlots={breakSlots}
          teachers={teachers}
        />
      )}

      {role === "admin" && currentView === 'cancellation-requests' && (
        <div className="admin-layout">
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            role={role}
            collegeId={collegeId}
            variant="dark"
            onLogout={backToLogin}
          />
          <main className="main-content">
            <AdminCancellationRequestsPage
              collegeId={collegeId}
              onNavigate={setCurrentView}
              currentView={currentView}
              role={role}
              cancellations={cancellations}
              approveCancellation={approveCancellation}
              rejectCancellation={rejectCancellation}
            />
          </main>
          <style>{`
            .admin-layout {
              display: flex;
              min-height: 100vh;
              width: 100vw;
              background: #fff;
            }

            .main-content {
              flex: 1;
              margin-left: 211px;
              min-height: 100vh;
              overflow-x: hidden;
            }

            /* Force dark sidebar visuals for Cancellation Requests */
            .sidebar { background: #000 !important; }
            .sidebar .nav-item { color: #fff !important; }
            .sidebar .nav-label, .sidebar .admin-label { color: #fff !important; }
            .sidebar .nav-icon svg path, .sidebar .admin-icon svg path { stroke: #fff !important; fill: #fff !important; }
            .sidebar .nav-icon svg [fill] { fill: #fff !important; }
            .sidebar .nav-icon svg [stroke] { stroke: #fff !important; }

            @media (max-width: 1024px) {
              .main-content {
                margin-left: 0;
              }
            }
          `}</style>
        </div>
      )}

      {role === "admin" && currentView === 'simulation' && (
        <div className="admin-layout">
          <Sidebar
            currentView={currentView}
            onNavigate={setCurrentView}
            role={role}
            collegeId={collegeId}
            onLogout={backToLogin}
          />
          <main className="main-content">
            <AdminSimulationPage
              simulationName={simulationName}
              setSimulationName={setSimulationName}
              scenarioType={scenarioType}
              setScenarioType={setScenarioType}
              scenarioParams={scenarioParams}
              setScenarioParams={setScenarioParams}
              isSimulating={isSimulating}
              onRunSimulation={runSimulationScenario}
              onClearSimulations={clearSimulationScenarios}
              simulationScenarios={simulationScenarios}
              activeScenarioId={activeScenario}
              setActiveScenario={setActiveScenario}
              onDeleteScenario={deleteSimulationScenario}
              onToggleSlot={toggleSimulationSlot}
              activeScenario={activeScenarioObj}
              getWeekdayLabel={getWeekdayLabel}
            />
          </main>
          <style>{`
            .admin-layout {
              display: flex;
              min-height: 100vh;
              width: 100vw;
              background: #fff;
            }

            .main-content {
              flex: 1;
              margin-left: 211px;
              min-height: 100vh;
              overflow-x: hidden;
            }

            @media (max-width: 1024px) {
              .main-content {
                margin-left: 0;
              }
            }
          `}</style>
        </div>
      )}

      {false && (
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Time and Class Configuration</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm">Bypass hoursLeft:</label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bypassHoursCheck} onChange={e => updateBypassSetting(Boolean(e.target.checked))} className="w-4 h-4" />
                  <span className="text-xs">Allow accepting substitutions regardless of hoursLeft</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                onClick={() => setCurrentView('admin-upload')}
              >
                Upload & Settings
              </button>
              <button
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={backToLogin}
              >
                Logout
              </button>
            </div>
          </div>

          <div className="bg-neutral-800 rounded-2xl border border-neutral-700 mb-6">
            <nav className="flex flex-wrap gap-2 p-3">
              <button onClick={() => setAdminTab('status')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'status' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Data Status</button>
              <button onClick={() => setAdminTab('upload')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Upload Data</button>
              <button onClick={() => setAdminTab('cancellations')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'cancellations' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Cancellation Requests</button>
              <button onClick={() => setAdminTab('subjects')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'subjects' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Subject Management</button>
              <button onClick={() => setAdminTab('settings')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'settings' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Timetable Settings</button>
              <button onClick={() => setAdminTab('timetables')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'timetables' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Class Timetables</button>
              <button onClick={() => setAdminTab('teachers')} className={`px-3 py-2 rounded-lg text-sm font-medium ${adminTab === 'teachers' ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'}`}>Teacher Timetables</button>
            </nav>
          </div>

          {/* Data Status */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 ${adminTab === 'status' ? '' : 'hidden'}`}>
            <h3 className="text-lg font-semibold mb-3">Data Status</h3>
            <p className="text-sm">Loaded Classes: {classes.length}</p>
            <p className="text-sm">Loaded Teachers: {teachers.length}</p>
            <p className="text-sm mt-2">
              All classes have subjects assigned: {" "}
              <span className={`font-bold ${allClassesHaveSubjects ? 'text-green-400' : 'text-red-400'}`}>
                {allClassesHaveSubjects ? 'Yes' : 'No'}
              </span>
            </p>
          </div>

          {/* Upload Data */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 ${adminTab === 'upload' ? '' : 'hidden'}`}>
            <h3 className="text-lg font-semibold mb-3">Upload Data</h3>
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-neutral-300">Quick Settings</div>
              <div className="flex items-center gap-3">
                <label className="text-sm">Bypass hoursLeft:</label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bypassHoursCheck} onChange={e => updateBypassSetting(Boolean(e.target.checked))} className="w-4 h-4" />
                  <span className="text-xs text-neutral-300">Allow accepting substitutions regardless of hoursLeft</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Upload Teachers CSV</label>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleTeacherCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Students CSV</label>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleStudentCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Classrooms CSV</label>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleClassroomsCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                <p className="text-xs text-neutral-400 mt-1">Current classrooms: {classroomsCount}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Courses CSV</label>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleCoursesCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                <p className="text-xs text-neutral-400 mt-1">Current courses: {coursesCount}</p>
                {/* Manage Courses */}
                <div className="mt-3 bg-neutral-700 rounded-lg p-3 max-h-48 overflow-auto">
                  <div className="text-sm font-medium mb-2">Manage Courses</div>
                  {Object.keys(courses || {}).length === 0 && (
                    <div className="text-xs text-neutral-300">No courses loaded.</div>
                  )}
                  <ul className="space-y-2">
                    {Object.entries(courses || {}).map(([cid, c]) => (
                      <li key={cid} className="flex items-center justify-between gap-2 text-xs bg-neutral-600 rounded-md px-2 py-2">
                        <span className="truncate">
                          {(c.code || cid)} — {c.name}
                        </span>
                        <button
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white"
                          onClick={async () => {
                            if (!db) { showMessage('DB not ready', 'error'); return; }
                            try {
                              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'courses', cid));
                              showMessage('Course deleted.', 'success');
                            } catch (e) {
                              console.error(e);
                              showMessage('Failed to delete course.', 'error');
                            }
                          }}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Students' Feedback CSV</label>
                <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFeedbackCSV} className="w-full text-sm text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100" />
                <p className="text-xs text-neutral-400 mt-1">Feedback entries: {feedbackCount}</p>
              </div>
            </div>
            <div className="mt-6 border-t border-neutral-700 pt-4">
              <h4 className="text-sm font-semibold mb-2 text-red-400">Danger Zone</h4>
              <p className="text-xs text-neutral-300 mb-3">This removes all uploaded datasets and timetables.</p>
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50" onClick={deleteAllUploadedData} disabled={isPurging || isUploading}>Delete All Uploaded Data</button>
              {isPurging && (
                <p className="text-sm text-red-400 mt-2 text-center">Deleting data, please wait...</p>
              )}
            </div>
            {isUploading && (
              <p className="text-sm text-blue-400 mt-2 text-center">Uploading data, please wait...</p>
            )}
          </div>

          {/* Cancellation Requests */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 ${adminTab === 'cancellations' ? '' : 'hidden'}`}>
            <h3 className="text-lg font-semibold mb-3">Cancellation Requests</h3>
            {cancellations.filter(c => (c.status || 'pending') === 'pending').length === 0 && (
              <div className="text-neutral-300 text-sm">No pending requests.</div>
            )}
            <div className="space-y-3">
              {cancellations.filter(c => (c.status || 'pending') === 'pending').map((c) => (
                <div key={c.id} className="bg-neutral-700 p-4 rounded-lg flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="text-sm text-neutral-200">
                    <div><span className="text-neutral-400">Class:</span> {c.className}</div>
                    <div><span className="text-neutral-400">Subject:</span> {c.subjectName}</div>
                    <div><span className="text-neutral-400">Day/Period:</span> {Number(c.dayIndex) + 1} / {Number(c.periodIndex) + 1}</div>
                    <div><span className="text-neutral-400">Teacher:</span> {c.teacherId}</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700" onClick={() => approveCancellation(c)}>Approve</button>
                    <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700" onClick={() => rejectCancellation(c)}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subject Management */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 transition-all duration-300 ${!isSubjectManagementEnabled ? 'opacity-50 pointer-events-none' : ''} ${adminTab === 'subjects' ? '' : 'hidden'}`}>
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
                  <label className="block text-sm font-medium mb-1">Course Type</label>
                  <select
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                    value={newSubjectCourseType}
                    onChange={(e) => setNewSubjectCourseType(e.target.value)}
                  >
                    <option value="major">Major</option>
                    <option value="skill_based">Skill Based</option>
                    <option value="elective">Elective</option>
                  </select>
                </div>
                {newSubjectCourseType !== 'elective' && (
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
                )}
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
                {newSubjectCourseType === 'elective' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Number of Electives</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                        value={electiveCount}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value) || 1);
                          setElectiveCount(val);
                          setElectiveDetails((prev) => {
                            const next = prev.slice(0, val);
                            while (next.length < val) next.push({ name: '', isLab: 'theory', style: 'hard_theory', teachers: [] });
                            return next;
                          });
                        }}
                      />
                      <p className="text-xs text-neutral-400 mt-1">Set how many elective options are available.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Students Choose Count</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                        value={electiveStudentChooseCount}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value) || 1);
                          setElectiveStudentChooseCount(v);
                        }}
                      />
                      <p className="text-xs text-neutral-400 mt-1">Must be between 1 and Number of Electives.</p>
                    </div>
                    {Array.from({ length: electiveCount }).map((_, idx) => (
                      <div key={idx} className="bg-neutral-700 rounded-lg p-3 space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1">Elective {idx + 1} - Subject Name</label>
                          <input
                            type="text"
                            className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 placeholder:text-neutral-400"
                            placeholder="e.g., ML, Blockchain"
                            value={electiveDetails[idx]?.name || ''}
                            onChange={(e) => {
                              const next = electiveDetails.slice();
                              next[idx] = { ...(next[idx] || { name: '', isLab: 'theory', style: 'hard_theory', teachers: [] }), name: e.target.value };
                              setElectiveDetails(next);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Type</label>
                          <select
                            className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                            value={electiveDetails[idx]?.isLab || 'theory'}
                            onChange={(e) => {
                              const next = electiveDetails.slice();
                              next[idx] = { ...(next[idx] || {}), isLab: e.target.value };
                              setElectiveDetails(next);
                            }}
                          >
                            <option value="theory">Theory</option>
                            <option value="lab">Lab</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Course Style</label>
                          <select
                            className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                            value={electiveDetails[idx]?.style || 'hard_theory'}
                            onChange={(e) => {
                              const next = electiveDetails.slice();
                              next[idx] = { ...(next[idx] || {}), style: e.target.value };
                              setElectiveDetails(next);
                            }}
                          >
                            <option value="hard_theory">Hard Theory</option>
                            <option value="hands_on">Hands On</option>
                            <option value="light">Light</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Assign Teachers</label>
                          <select
                            multiple
                            className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                            value={electiveDetails[idx]?.teachers || []}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value);
                              const next = electiveDetails.slice();
                              next[idx] = { ...(next[idx] || {}), teachers: selected };
                              setElectiveDetails(next);
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
                      </div>
                    ))}
                  </div>
                )}
                {newSubjectCourseType !== 'elective' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Type</label>
                      <select
                        className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                        value={newSubjectIsLab}
                        onChange={(e) => setNewSubjectIsLab(e.target.value)}
                      >
                        <option value="theory">Theory</option>
                        <option value="lab">Lab</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Course Style</label>
                      <select
                        className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                        value={newSubjectCourseStyle}
                        onChange={(e) => setNewSubjectCourseStyle(e.target.value)}
                      >
                        <option value="hard_theory">Hard Theory</option>
                        <option value="hands_on">Hands On</option>
                        <option value="light">Light</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1">Semester (1-8)</label>
                  <input
                    type="number"
                    className="w-full p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600"
                    min="1"
                    max="8"
                    value={newSubjectSem}
                    onChange={(e) => setNewSubjectSem(Number(e.target.value))}
                  />
                </div>
                {newSubjectCourseType !== 'elective' && (
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
                )}
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
                    <ul className="mt-2 space-y-2">
                      {cls.subjects?.map((sub, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-3 text-sm text-neutral-200 bg-neutral-600 rounded-md px-3 py-2">
                          <span className="truncate">{sub.name} ({sub.credits} credits) [{sub.courseType || '-'}, {sub.delivery || (sub.isLab ? 'lab' : 'theory')}, {sub.style || '-'}, Sem {sub.sem ?? '-'}] assigned to {sub.teachers.join(', ')}</span>
                          <button
                            className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs"
                            onClick={() => handleDeleteSubject(cls.name, sub.name)}
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timetable Settings Section */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 ${adminTab === 'settings' ? '' : 'hidden'}`}>
            <h3 className="text-lg font-semibold mb-3">Timetable Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <label className="text-sm font-medium">Working Days:</label>
                <input type="number" value={workingDays} onChange={e => setWorkingDays(Number(e.target.value))} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <label className="text-sm font-medium">Classes Per Day:</label>
                <input type="number" value={Math.max(0, Number(hoursPerDay || 0) - (Array.isArray(breakSlots) ? breakSlots.length : 0))} onChange={e => setHoursPerDay(Number(e.target.value) + (Array.isArray(breakSlots) ? breakSlots.length : 0))} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">Break Slots (comma-separated, 0-based):</label>
                <input type="text" value={(breakSlots || []).join(',')} onChange={e => setBreakSlots(e.target.value.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n)))} className="w-full sm:w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">Start of Day:</label>
                <input type="time" value={dayStartTime} onChange={e => setDayStartTime(e.target.value)} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">End of Day:</label>
                <input type="time" value={dayEndTime} onChange={e => setDayEndTime(e.target.value)} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">Class Duration (min):</label>
                <input type="number" value={classDuration} onChange={e => setClassDuration(Number(e.target.value))} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">Elective Periods (comma-separated, 0-based):</label>
                <input type="text" value={(electiveSlots || []).join(',')} onChange={e => setElectiveSlots(e.target.value.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n)))} className="w-full sm:w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className="text-sm font-medium">Free Period %:</label>
                <input type="number" value={freePeriodPercentage} onChange={e => setFreePeriodPercentage(Number(e.target.value))} className="w-24 p-2 rounded-lg bg-neutral-700 text-white border border-neutral-600 focus:outline-none focus:ring-2 focus:ring-blue-500" min="0" max="100" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-neutral-300 mb-3">Calculated Period Times (24h):</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {calculateTimeSlots().map((s, i) => (
                  <div key={`timeslot-${i}`} className="text-xs px-3 py-1 rounded-full bg-neutral-700 text-neutral-200">{s}</div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={bypassHoursCheck} onChange={e => updateBypassSetting(Boolean(e.target.checked))} className="w-4 h-4" />
                  <span className="text-sm text-neutral-300">Bypass hoursLeft for substitutions</span>
                </label>

                <div className="ml-auto flex gap-3">
                  <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={saveSettings}>Save Settings</button>
                  <button
                    className={`px-4 py-2 rounded-lg font-semibold transition-colors ${isGenerateEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-neutral-600 cursor-not-allowed'}`}
                    onClick={generateTimetable}
                    disabled={!isGenerateEnabled || isGeneratingRef.current}
                  >
                    {isGeneratingRef.current ? 'Generating...' : 'Generate Timetable'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Admin: View All Timetables */}
          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mt-6 ${adminTab === 'timetables' ? '' : 'hidden'}`}>
            <h3 className="text-lg font-semibold mb-4">Class Timetables</h3>
            {classes.length === 0 && (
              <div className="text-neutral-300 text-sm">No classes available.</div>
            )}
            {classes.map((cls) => (
              generatedTimetables[cls.name] && (
                <div key={cls.name} className="mb-8">
                  <h4 className="text-base font-bold mb-2">{cls.name} — Total Credits: {(Array.isArray(cls.subjects) ? cls.subjects.reduce((s,x)=>s + Number(x.credits || 0), 0) : 0)}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-700 text-sm">
                      <thead className="bg-neutral-700">
                        <tr>
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Day/Period</th>
                          {(() => {
                            const rows = (typeof tTable !== 'undefined' && tTable) || ((generatedTimetables && cls && generatedTimetables[cls.name]) || []);
                            const slots = calculateTimeSlots();
                            const headers = [];
                            for (let i = 0; i < slots.length; i++) {
                              headers.push(
                                <th key={`p-${i}`} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                  {slots[i] || `Period ${i + 1}`}
                                </th>
                              );
                            }
                            return headers;
                          })()}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-700">
                        {generatedTimetables[cls.name].map((row, dayIdx) => (
                          <tr key={dayIdx}>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-neutral-200">{getWeekdayLabel(dayIdx)}</td>
                            {(() => {
                              const items = row.map((cell, idx) => ({ cell, idx })).filter(({ cell }) => !(cell && cell.status === 'break'));
                              const lunchAfter = Math.floor(items.length / 2);
                              const cells = [];
                              items.forEach((item, i) => {
                                cells.push(
                                  <td key={item.idx} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.cell && item.cell.status === 'free' ? 'bg-red-700 text-white' : 'bg-neutral-600 text-neutral-200'}`}>
                                      {item.cell ? item.cell.subjectName : 'N/A'}
                                    </span>
                                  </td>
                                );
                                if (i === lunchAfter - 1) {
                                  cells.push(
                                    <td key={`lunch-${dayIdx}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">Lunch</span>
                                    </td>
                                  );
                                }
                              });
                              return cells;
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ))}
          </div>

          <div className={`bg-neutral-800 p-6 rounded-2xl shadow-lg border border-neutral-700 mt-6 ${adminTab === 'teachers' ? '' : 'hidden'}`}>
            <h3 className="text-lg font-semibold mb-4">Teacher Timetables</h3>
            {teachers.length === 0 && (
              <div className="text-neutral-300 text-sm">No teachers available.</div>
            )}
            {teachers.map((t) => {
              const tTable = buildTeacherTimetableFor(t.id);
              return (
                <div key={t.id} className="mb-8">
                  <h4 className="text-base font-bold mb-2">{t.name} ({t.id})</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-700 text-sm">
                      <thead className="bg-neutral-700">
                        <tr>
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Day/Period</th>
                          {(() => {
                            const rows = (typeof tTable !== 'undefined' && tTable) || ((generatedTimetables && cls && generatedTimetables[cls.name]) || []);
                            const slots = calculateTimeSlots();
                            const headers = [];
                            for (let i = 0; i < slots.length; i++) {
                              headers.push(
                                <th key={`p-${i}`} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                  {slots[i] || `Period ${i + 1}`}
                                </th>
                              );
                            }
                            return headers;
                          })()}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-700">
                        {tTable.map((row, dayIdx) => (
                          <tr key={dayIdx}>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-neutral-200">{getWeekdayLabel(dayIdx)}</td>
                            {(() => {
                              const items = row.map((cell, idx) => ({ cell, idx })).filter(({ cell }) => !(cell && cell.status === 'break'));
                              const lunchAfter = Math.floor(items.length / 2);
                              const cells = [];
                              items.forEach((item, i) => {
                                cells.push(
                                  <td key={item.idx} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.cell && item.cell.status === 'free' ? 'bg-red-700 text-white' : 'bg-green-700 text-white'}`}>
                                      {(() => {
                                        const cell = item.cell;
                                        if (!cell) return 'N/A';
                                        if (cell.subjectName === 'Free') return 'Free';
                                        const clsDef = classes.find(c => c.name === cell.className);
                                        const credits = clsDef && Array.isArray(clsDef.subjects) ? clsDef.subjects.reduce((sum, s) => sum + Number(s.credits || 0), 0) : 0;
                                        return `${cell.subjectName} (${cell.className})${credits ? ` [${credits}cr]` : ''}`;
                                      })()}
                                    </span>
                                  </td>
                                );
                                if (i === lunchAfter - 1) {
                                  cells.push(
                                    <td key={`tlunch-${dayIdx}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">Lunch</span>
                                    </td>
                                  );
                                }
                              });
                              return cells;
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(role === "teacher" || role === "student") && (
        <Dashboard
          role={role}
          collegeId={collegeId}
          onLogout={backToLogin}
          onNavigate={handleNavigation}
          currentView={currentView}
          teacherTimetable={teacherTimetable}
          generatedTimetables={generatedTimetables}
          workingDays={workingDays}
          hoursPerDay={hoursPerDay}
          timeSlots={cachedTimeSlots}
          handleSlotToggle={handleSlotToggle}
          downloadTimetable={downloadTimetable}
          studentClass={studentClass}
          studentName={studentName}
          teacherOffers={teacherOffers}
          teacherCancellations={cancellations.filter(c => c && c.teacherId === collegeId)}
          acceptOffer={acceptOffer}
          declineOffer={declineOffer}
          electiveGroups={getElectiveGroupsForStudentClass()}
          selectedElectivesMap={studentElectivesSelectedMap}
          saveStudentElective={saveStudentElectives}
          electiveSlots={electiveSlots}
          classes={classes}
          studentNotifications={studentNotifications}
          teachers={teachers}
        />
      )}

      {showAdminCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-800 text-white rounded-2xl shadow-xl border border-neutral-700 w-11/12 max-w-md p-6">
            <h3 className="text-lg font-semibold mb-2">Create New Admin</h3>
            <p className="text-sm text-neutral-300 mb-4">ID: {pendingAdminId}</p>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded-lg bg-neutral-600 hover:bg-neutral-500" onClick={cancelCreateAdmin}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700" onClick={createAdminNow}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

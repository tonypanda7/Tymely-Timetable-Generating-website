import { useState, useEffect, useMemo } from 'react';
import TeacherDashboard from './TeacherDashboard.jsx';
import TeacherCoursesPage from './TeacherCoursesPage.jsx';
import TeacherNotifications from './TeacherNotifications.jsx';
import StudentTimetable from './StudentTimetable.jsx';
import StudentNotifications from './StudentNotifications.jsx';
import TeacherSchedulePage from './TeacherSchedulePage.jsx';

const Dashboard = ({
  role,
  collegeId,
  onLogout,
  onNavigate,
  currentView = 'dashboard',
  teacherTimetable = [],
  generatedTimetables = {},
  workingDays = 5,
  hoursPerDay = 5,
  handleSlotToggle,
  downloadTimetable,
  studentClass,
  studentName = '',
  teacherOffers = [],
  teacherCancellations = [],
  acceptOffer,
  declineOffer,
  electiveGroups = [],
  selectedElectivesMap = {},
  saveStudentElective,
  timeSlots = [],
  electiveSlots = [],
  classes = [],
  teachers = [],
  studentNotifications = [],
}) => {
  const [selectedWeekDay, setSelectedWeekDay] = useState(0);
  const [currentDate, setCurrentDate] = useState(new Date());
  // Sidebar collapsed state and computed width for student dashboard
  const [studentSidebarCollapsed, setStudentSidebarCollapsed] = useState(false);
  const studentSidebarWidth = studentSidebarCollapsed ? (role === 'student' ? 72 : 88) : (role === 'student' ? 220 : 320);

  const WEEKDAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const FULL_WEEKDAY_LABELS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
  const weekDays = WEEKDAY_LABELS.slice(0, workingDays);
  const weekNumbers = [10, 11, 12, 13, 14];
  const getWeekdayLabel = (idx) => WEEKDAY_LABELS[((Number(idx) % 7) + 7) % 7];

  // Helpers for color assignment and contrast detection
  const SUBJECT_COLOR_PALETTE = ['#155DFC','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#84CC16','#0EA5E9','#DB2777'];
  const hexToRgb = (hex) => {
    if (!hex) return null;
    const h = hex.replace('#','');
    const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };
  const getLuminance = (hex) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return 0;
    const a = [rgb.r, rgb.g, rgb.b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const isLightColor = (hex) => {
    try {
      const lum = getLuminance(hex);
      return lum > 0.5;
    } catch { return false; }
  };
  const getColorForSubject = (name) => {
    if (!name) return SUBJECT_COLOR_PALETTE[0];
    const key = String(name).toLowerCase();
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash << 5) - hash + key.charCodeAt(i);
    const idx = Math.abs(hash) % SUBJECT_COLOR_PALETTE.length;
    return SUBJECT_COLOR_PALETTE[idx];
  };

  const computedTimeSlots = (Array.isArray(timeSlots) && timeSlots.length) ? timeSlots : [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM'
  ];

  // Compute enrolled courses for the current student (mandatory + chosen electives)
  const enrolledCourses = useMemo(() => {
    try {
      if (role !== 'student' || !studentClass || !Array.isArray(classes)) return [];
      const cls = classes.find(c => c && c.name === studentClass);
      const subjectsList = Array.isArray(cls?.subjects) ? cls.subjects : [];

      // Gather mandatory and elective selections from class definition
      const mandatory = subjectsList.filter(s => s && s.courseType !== 'elective').map(s => ({ name: s.name || s, code: s.code || '', color: getColorForSubject(s.name || s) }));
      const electiveGroups = subjectsList.filter(s => s && s.courseType === 'elective');
      const selected = selectedElectivesMap || {};
      const chosen = [];
      electiveGroups.forEach((g) => {
        const opts = Array.isArray(g.electiveOptionsDetailed) && g.electiveOptionsDetailed.length ? g.electiveOptionsDetailed.map(o => o.name) : (Array.isArray(g.electiveOptions) ? g.electiveOptions : []);
        const pick = selected[g.name];
        if (!pick) return;
        if (Array.isArray(pick)) {
          pick.forEach(p => chosen.push({ name: p, code: '', color: getColorForSubject(p) }));
        } else {
          chosen.push({ name: pick, code: '', color: getColorForSubject(pick) });
        }
      });

      // Additionally, extract subjects referenced in the generated timetable for this student's class
      const timetableSubjects = [];
      try {
        const table = Array.isArray(generatedTimetables && generatedTimetables[studentClass]) ? generatedTimetables[studentClass] : [];
        table.forEach((day) => {
          if (!Array.isArray(day)) return;
          day.forEach((cell) => {
            if (!cell) return;
            const name = (cell.subjectName || '').toString().trim();
            if (!name) return;
            const isBreak = cell.status === 'break' || /break/i.test(name);
            const isFree = cell.status === 'free' || /free/i.test(name);
            const isLunch = /lunch/i.test(name);
            if (isBreak || isFree || isLunch) return;
            timetableSubjects.push({ name, code: cell.code || '', color: getColorForSubject(name) });
          });
        });
      } catch (err) {
        // ignore timetable parsing errors
      }

      // Combine class-defined courses, chosen electives and timetable-derived subjects; then dedupe by name
      const combined = [...mandatory, ...chosen, ...timetableSubjects];
      const seen = new Set();
      return combined.filter(c => {
        if (!c || !c.name) return false;
        const k = String(c.name).toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } catch (e) { return []; }
  }, [role, studentClass, classes, selectedElectivesMap, generatedTimetables]);

  // Compute total classes and free periods for the current week
  const { totalClassesThisWeek, freePeriodsThisWeek } = useMemo(() => {
    let total = 0;
    let free = 0;

    const countInTable = (table) => {
      if (!Array.isArray(table)) return;
      const days = Math.min(Number(workingDays || 5), table.length);
      for (let d = 0; d < days; d++) {
        const day = Array.isArray(table[d]) ? table[d] : [];
        const periods = Math.min(Number(hoursPerDay || 5), day.length);
        for (let p = 0; p < periods; p++) {
          const slot = day[p];
          // Treat explicit breaks or lunch as neither class nor free
          const isBreakOrLunch = slot && (slot.status === 'break' || /lunch/i.test(String(slot.subjectName || '')));
          if (isBreakOrLunch) {
            // skip
          } else if (!slot || slot.status === 'free') {
            free++;
          } else {
            total++;
          }
        }
      }
    };

    try {
      if (role === 'teacher' && Array.isArray(teacherTimetable) && teacherTimetable.length) {
        countInTable(teacherTimetable);
      } else if (role === 'student' && studentClass && generatedTimetables && Array.isArray(generatedTimetables[studentClass])) {
        countInTable(generatedTimetables[studentClass]);
      } else {
        // admin/other: aggregate across all class timetables
        Object.keys(generatedTimetables || {}).forEach((cn) => {
          countInTable(generatedTimetables[cn]);
        });
      }
    } catch (e) {
      // fallback: zeroes
    }

    return { totalClassesThisWeek: total, freePeriodsThisWeek: free };
  }, [role, teacherTimetable, generatedTimetables, studentClass, workingDays, hoursPerDay]);

  // Initialize selected weekday to today's weekday (Mon=0,...,Sun=6)
  useEffect(() => {
    const todayIdx = ((new Date().getDay() + 6) % 7);
    setSelectedWeekDay(todayIdx);
    setCurrentDate(new Date());
  }, []);

  const isTodayWeekend = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 || d === 6; // Sunday or Saturday
  }, []);

  // Calendar helpers (Monday-first)
  const calendarData = useMemo(() => {
    const now = currentDate;
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0..6 (Mon-first)

    const prevDays = Array.from({ length: startOffset }, (_, i) => daysInPrev - startOffset + 1 + i);
    const currDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSoFar = prevDays.length + currDays.length;
    const cells = 42; // 6 rows * 7 cols grid
    const nextCount = Math.max(0, cells - totalSoFar);
    const nextDays = Array.from({ length: nextCount }, (_, i) => i + 1);

    const monthTitle = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const todayDate = now.getDate();

    return { prevDays, currDays, nextDays, monthTitle, todayDate, monthIndex: m, year: y };
  }, [currentDate]);

  // Determine day to show in Today's Timetable (default: today)
  const dayToShow = selectedWeekDay;
  const fullDayLabel = FULL_WEEKDAY_LABELS[dayToShow] || 'MONDAY';

  // Build today's timetable row based on role
  const todayRow = useMemo(() => {
    if (role === 'teacher') {
      return Array.isArray(teacherTimetable?.[dayToShow]) ? teacherTimetable[dayToShow] : [];
    }
    if (role === 'student' && studentClass && generatedTimetables && generatedTimetables[studentClass]) {
      return Array.isArray(generatedTimetables[studentClass]?.[dayToShow]) ? generatedTimetables[studentClass][dayToShow] : [];
    }
    return [];
  }, [role, teacherTimetable, generatedTimetables, studentClass, dayToShow]);

  // Map row + slots to display items (normalize labels: Break, Free, Lunch)
  const todayScheduleItems = useMemo(() => {
    const items = [];
    const row = Array.isArray(todayRow) ? todayRow : [];
    const slots = Array.isArray(computedTimeSlots) ? computedTimeSlots : [];
    let p = 0;
    for (let si = 0; si < slots.length; si++) {
      const label = slots[si] || '';
      const cell = row[p];

      // Header explicitly marks lunch: if row cell also represents lunch, consume it; otherwise render header
      if (/\(LUNCH\)/i.test(label)) {
        const start = label.split(' - ')[0] || '';
        const end = label.split(' - ')[1]?.replace(/\(LUNCH\)/i, '').trim() || '';
        if (cell && /lunch/i.test(String(cell.subjectName || ''))) {
          items.push({ subject: 'Lunch', startTime: start, endTime: end, color: '#D97706', isBreak: true });
          p++;
        } else {
          items.push({ subject: 'Lunch', startTime: start, endTime: end, color: '#D97706', isBreak: true });
        }
        continue;
      }

      // Header explicitly marks Break: if row cell is break, consume; else render break header
      if (/^\s*break\s*$/i.test(label)) {
        const start = label.split(' - ')[0] || '';
        const end = label.split(' - ')[1] || '';
        if (cell && (cell.status === 'break' || /break/i.test(String(cell.subjectName || '')))) {
          items.push({ subject: 'Break', startTime: start, endTime: end, color: '#3B82F6', isBreak: true });
          p++;
        } else {
          items.push({ subject: 'Break', startTime: start, endTime: end, color: '#3B82F6', isBreak: true });
        }
        continue;
      }

      // If underlying cell is a break, show Break
      if (cell && (cell.status === 'break' || /break/i.test(String(cell.subjectName || '')))) {
        items.push({ subject: 'Break', startTime: label.split(' - ')[0] || '', endTime: label.split(' - ')[1] || '', color: '#3B82F6', isBreak: true });
        p++;
        continue;
      }

      // If underlying cell is lunch, show Lunch
      if (cell && /lunch/i.test(String(cell.subjectName || ''))) {
        items.push({ subject: 'Lunch', startTime: label.split(' - ')[0] || '', endTime: label.split(' - ')[1] || '', color: '#D97706', isBreak: true });
        p++;
        continue;
      }

      // If underlying cell is explicitly free, show Free
      if (cell && cell.status === 'free') {
        items.push({ subject: 'Free', startTime: label.split(' - ')[0] || '', endTime: label.split(' - ')[1] || '', color: '#E5E7EB', isBreak: false });
        p++;
        continue;
      }

      // Normal teaching slot: show subject name (if present) or Free
      const subject = cell ? (cell.subjectName || 'Free') : 'Free';
      const color = subject && subject !== 'Free' ? getColorForSubject(subject) : '#E5E7EB';
      items.push({ subject, startTime: label.split(' - ')[0] || '', endTime: label.split(' - ')[1] || '', color, isBreak: false });
      p++;
    }
    return items;
  }, [todayRow, computedTimeSlots]);

  if (currentView === 'notification') {
    if (role === 'teacher') {
      return (
        <TeacherNotifications
          teacherOffers={teacherOffers}
          teacherCancellations={teacherCancellations}
          acceptOffer={acceptOffer}
          declineOffer={declineOffer}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />
      );
    }
    if (role === 'student') {
      return (
        <StudentNotifications
          onLogout={onLogout}
          onNavigate={onNavigate}
          currentView={currentView}
          notifications={studentNotifications}
        />
      );
    }
    return (
      <div className="min-h-screen bg-white text-black p-4 md:p-8 w-full">
        <div className="max-w-4xl mx-auto">
          <div className="text-gray-600">No notifications.</div>
        </div>
      </div>
    );
  }

  if (currentView === 'timetable' && role === 'student') {
    return (
      <StudentTimetable
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentView={currentView}
        studentClass={studentClass}
        generatedTimetables={generatedTimetables}
        workingDays={workingDays}
        hoursPerDay={hoursPerDay}
        timeSlots={timeSlots}
        classes={classes}
        teachers={teachers}
        selectedElectivesMap={selectedElectivesMap}
        electiveGroups={electiveGroups}
        saveStudentElective={saveStudentElective}
      />
    );
  }

  if (currentView === 'timetable') {
    // Render original timetable view for both teacher and student
    if (role === 'teacher') {
      return (
        <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-5">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-center">Teacher Timetable</h1>
              <button
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
            <div className="bg-neutral-800 p-4 md:p-6 rounded-2xl shadow-lg border border-neutral-700">
              <h2 className="text-xl font-bold mb-4">Your Timetable</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-700 text-sm">
                  <thead className="bg-neutral-700">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Day/Period</th>
                      {(() => {
                        const rows = (Array.isArray(teacherTimetable) && teacherTimetable.length ? teacherTimetable : ((typeof clsName !== 'undefined' && generatedTimetables && generatedTimetables[clsName]) || [])) || [];
                        const slots = Array.isArray(computedTimeSlots) && computedTimeSlots.length ? computedTimeSlots : (Array.isArray(rows) && rows[0] ? rows[0].map(c => (c && c.status === 'break') ? 'Break' : undefined) : []);
                        const headers = [];
                        for (let i = 0; i < slots.length; i++) {
                          headers.push(
                            <th key={`dp-${i}`} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                              {slots[i] || `Period ${i + 1}`}
                            </th>
                          );
                        }
                        return headers;
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {teacherTimetable.map((row, dayIdx) => (
                      <tr key={dayIdx}>
                        <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-neutral-200">{getWeekdayLabel(dayIdx)}</td>
                        {(() => {
                          const slots = Array.isArray(computedTimeSlots) && computedTimeSlots.length ? computedTimeSlots : calculateTimeSlots();
                          const cells = [];
                          let p = 0; // pointer into row
                          for (let si = 0; si < slots.length; si++) {
                            const slotLabel = slots[si];
                            const cur = row[p];

                            // If this is a break cell in the underlying data, render it (consume one)
                            if (cur && cur.status === 'break') {
                              cells.push(
                                <td key={`break-${dayIdx}-${si}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">{slotLabel || 'Break'}</span>
                                </td>
                              );
                              p++;
                              continue;
                            }

                            // If this slot is marked as lunch in the header, render lunch (no consumption)
                            if (slotLabel && String(slotLabel).toUpperCase().includes('LUNCH')) {
                              cells.push(
                                <td key={`lunch-${dayIdx}-${si}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">Lunch</span>
                                </td>
                              );
                              continue;
                            }

                            // Normal teaching slot: render the current cell from row (if any)
                            cells.push(
                              <td key={`cell-${dayIdx}-${si}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                                <button
                                  className={`px-3 py-2 rounded-lg text-xs font-semibold w-full text-center transition-colors ${cur && cur.status === 'confirmed' ? 'bg-green-700 hover:bg-green-800 text-white' : cur && cur.status === 'sub_request' ? 'bg-yellow-600 hover:bg-yellow-700 text-neutral-900' : 'bg-neutral-600 text-neutral-200 cursor-default'}`}
                                  onClick={() => handleSlotToggle && handleSlotToggle(dayIdx, p, cur)}
                                  disabled={!cur}
                                >
                                  {cur ? (
                                    <p>{cur.subjectName} <br/> ({cur.className})</p>
                                  ) : (
                                    <span>Free</span>
                                  )}
                                </button>
                              </td>
                            );
                            p++;
                          }
                          return cells;
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      // Student view - show only their assigned class timetable
      const visibleClasses = studentClass ? [studentClass] : [];
      return (
        <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-5">
          <div className="w-full max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <button
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl md:text-3xl font-bold text-center">Student Timetable</h1>
              <button
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
            {visibleClasses.length === 0 && (
              <div className="bg-neutral-800 p-4 md:p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6 text-center text-neutral-300">
                No class assigned. Please contact admin.
              </div>
            )}

            {/* Elective selection box */}
            <div className="bg-neutral-800 p-4 md:p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
              <h2 className="text-lg font-semibold mb-3">Choose Your Electives</h2>
              {electiveGroups.length === 0 && (
                <p className="text-sm text-neutral-300">No electives available yet.</p>
              )}
              {electiveGroups.length > 0 && (
                <div className="space-y-4">
                  {electiveGroups.map((g) => {
                    const chooseCount = g.chooseCount || 1;
                    const locked = !!(selectedElectivesMap && selectedElectivesMap[g.groupName]);
                    return (
                      <div key={g.groupName} className="bg-neutral-700 rounded-lg p-3">
                        <div className="text-sm font-medium mb-2">
                          {g.groupName} {chooseCount > 1 ? <span className="ml-2 text-xs text-neutral-300">Choose {chooseCount}</span> : null}
                          {locked ? <span className="ml-2 text-xs text-green-400">Locked</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {g.options.map((opt) => {
                            if (chooseCount === 1) {
                              const selected = selectedElectivesMap[g.groupName] === opt;
                              return (
                                <label key={opt} className={`px-3 py-1 rounded-full text-xs cursor-pointer ${selected ? 'bg-blue-600 text-white' : 'bg-neutral-600 text-neutral-200'} ${locked && !selected ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                  <input
                                    type="radio"
                                    name={`elective-${g.groupName}`}
                                    className="hidden"
                                    checked={selected}
                                    disabled={locked}
                                    onChange={() => {
                                      if (!saveStudentElective || locked) return;
                                      const ok = window.confirm('Please confirm your elective selection. Once chosen, it cannot be changed.');
                                      if (ok) saveStudentElective(g.groupName, opt);
                                    }}
                                  />
                                  {opt}
                                </label>
                              );
                            }

                            // Multiple choices - checkbox
                            const selectedArray = Array.isArray(selectedElectivesMap && selectedElectivesMap[g.groupName]) ? selectedElectivesMap[g.groupName] : [];
                            const checked = selectedArray.includes(opt);
                            return (
                              <label key={opt} className={`px-3 py-1 rounded-full text-xs cursor-pointer ${checked ? 'bg-blue-600 text-white' : 'bg-neutral-600 text-neutral-200'} ${locked && !checked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={(e) => {
                                    if (!saveStudentElective || locked) return;
                                    const curr = Array.isArray(selectedElectivesMap && selectedElectivesMap[g.groupName]) ? [...selectedElectivesMap[g.groupName]] : [];
                                    if (e.target.checked) {
                                      if (curr.length >= chooseCount) { alert(`You can only choose ${chooseCount} options.`); return; }
                                      curr.push(opt);
                                    } else {
                                      const idx = curr.indexOf(opt); if (idx !== -1) curr.splice(idx, 1);
                                    }
                                    const ok = window.confirm('Please confirm your elective selection. Once chosen, it cannot be changed.');
                                    if (ok) saveStudentElective(g.groupName, curr);
                                  }}
                                />
                                {opt}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-xs text-neutral-400">Your chosen option will appear in your timetable as "Name (Elective)".</div>
                </div>
              )}
            </div>

            {visibleClasses.map((clsName) => (
              generatedTimetables[clsName] && (
                <div key={clsName} className="bg-neutral-800 p-4 md:p-6 rounded-2xl shadow-lg border border-neutral-700 mb-6">
                  <h2 className="text-xl font-bold mb-4">Timetable for {clsName}</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-700 text-sm">
                      <thead className="bg-neutral-700">
                        <tr>
                          <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Day/Period</th>
                          {(() => {
                        const rows = (Array.isArray(teacherTimetable) && teacherTimetable.length ? teacherTimetable : ((typeof clsName !== 'undefined' && generatedTimetables && generatedTimetables[clsName]) || [])) || [];
                        const slots = Array.isArray(computedTimeSlots) && computedTimeSlots.length ? computedTimeSlots : (Array.isArray(rows) && rows[0] ? rows[0].map(c => (c && c.status === 'break') ? 'Break' : undefined) : []);
                        const headers = [];
                        for (let i = 0; i < slots.length; i++) {
                          headers.push(
                            <th key={`dp-${i}`} className="px-4 md:px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                              {slots[i] || `Period ${i + 1}`}
                            </th>
                          );
                        }
                        return headers;
                      })()}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-700">
                        {generatedTimetables[clsName].map((row, dayIdx) => (
                          <tr key={dayIdx}>
                            <td className="px-4 md:px-6 py-4 whitespace-nowrap font-medium text-neutral-200">{getWeekdayLabel(dayIdx)}</td>
                            {(() => {
                              const slots = Array.isArray(computedTimeSlots) && computedTimeSlots.length ? computedTimeSlots : calculateTimeSlots();
                              const cells = [];
                              let p = 0;
                              let electiveCounter = 0;
                for (let si = 0; si < slots.length; si++) {
                  const slotLabel = slots[si];
                  const cur = row[p];

                  if (cur && cur.status === 'break') {
                    cells.push(
                      <td key={`break-${dayIdx}-${si}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">{slotLabel || 'Break'}</span>
                      </td>
                    );
                    p++;
                    continue;
                  }

                  if (slotLabel && String(slotLabel).toUpperCase().includes('LUNCH')) {
                    cells.push(
                      <td key={`slunch-${dayIdx}-${si}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">Lunch</span>
                      </td>
                    );
                    continue;
                  }

                  // Determine if this is an elective cell and assign an index for naming (Elective 1, Elective 2)
                  let electiveIndexForSlot = null;
                  if (cur && cur.status === 'elective') {
                    electiveCounter += 1;
                    electiveIndexForSlot = electiveCounter;
                  }

                  cells.push(
                    <td key={`cell-${dayIdx}-${si}`} className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cur && cur.status === 'free' ? 'bg-red-700 text-white' : 'bg-neutral-600 text-neutral-200'}`}>
                        {cur ? ((() => {
                          const selected = selectedElectivesMap || {};
                          const groupNames = Object.keys(selected);
                          const isElectiveCell = cur.status === 'elective' || (cur.subjectName && groupNames.includes(cur.subjectName)) || (/Electives?/i.test(cur.subjectName || ''));
                          if (isElectiveCell) {
                            const picks = groupNames.map((g) => selected[g]).filter(Boolean);
                            if (picks.length > 0) { const flat = [].concat(...picks.map(v => Array.isArray(v) ? v : [v])); return flat.map((n) => `${n} (Elective)`).join(', '); }
                            return electiveIndexForSlot ? `Elective ${electiveIndexForSlot}` : 'Elective';
                          }
                          return cur.subjectName;
                        })()) : 'N/A'}
                      </span>
                    </td>
                  );
                  p++;
                }
                return cells;
                            })()}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadTimetable && downloadTimetable(clsName, "xlsx")}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Download as XLSX
                    </button>
                    <button
                      onClick={() => downloadTimetable && downloadTimetable(clsName, "pdf")}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Download as PDF
                    </button>
                    <button
                      onClick={() => downloadTimetable && downloadTimetable(clsName, "txt")}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      Download as TXT
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      );
    }
  }

  // Check if teacher and on courses view - use TeacherCoursesPage
  if (role === 'teacher' && currentView === 'courses') {
    return (
      <TeacherCoursesPage
        collegeId={collegeId}
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentView={currentView}
        classes={classes}
        teachers={teachers}
      />
    );
  }

  // Check if teacher and on schedule view - use TeacherSchedulePage
  if (role === 'teacher' && currentView === 'schedule') {
    return (
      <TeacherSchedulePage
        collegeId={collegeId}
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentView={currentView}
        teacherTimetable={teacherTimetable}
        generatedTimetables={generatedTimetables}
        workingDays={workingDays}
        hoursPerDay={hoursPerDay}
        handleSlotToggle={handleSlotToggle}
        timeSlots={timeSlots}
        classes={classes}
        teachers={teachers}
        teacherCancellations={teacherCancellations}
      />
    );
  }

  // Check if teacher and on dashboard view - use Figma teacher dashboard
  if (role === 'teacher' && currentView === 'dashboard') {
    return (
      <TeacherDashboard
        collegeId={collegeId}
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentView={currentView}
        teacherTimetable={teacherTimetable}
        generatedTimetables={generatedTimetables}
        workingDays={workingDays}
        hoursPerDay={hoursPerDay}
        handleSlotToggle={handleSlotToggle}
        downloadTimetable={downloadTimetable}
        teacherOffers={teacherOffers}
        acceptOffer={acceptOffer}
        declineOffer={declineOffer}
        timeSlots={timeSlots}
        electiveSlots={electiveSlots}
        classes={classes}
        teachers={teachers}
      />
    );
  }

  // Main dashboard view with original design (for students)
  return (
    <div className="min-h-screen w-full bg-white">
      {/* Sidebar */}
      <aside className="fixed left-0 top-6 bottom-6 flex flex-col shadow-lg overflow-hidden" style={{ background: '#E1F3FF', borderRadius: '0 50px 50px 0', width: `${studentSidebarWidth}px`, zIndex: 40 }}>
        {/* Hamburger Menu */}
        <button
          aria-label="Toggle sidebar"
          onClick={() => setStudentSidebarCollapsed(v => !v)}
          className="absolute top-6 left-2"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 22.6666H28M4 16H28M4 9.33331H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Navigation */}
        <nav className={`${studentSidebarCollapsed ? 'items-center px-0' : 'px-8'} flex flex-col gap-9 mt-40`}>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex ${studentSidebarCollapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
              currentView === 'dashboard' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
            style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 8.00004H4.02559M4.02559 8.00004H27.9745M4.02559 8.00004C4 8.41921 4 8.93592 4 9.6003V22.4003C4 23.8938 4 24.6395 4.29065 25.2099C4.54631 25.7117 4.95396 26.1207 5.45573 26.3763C6.02561 26.6667 6.77201 26.6667 8.26259 26.6667L23.7375 26.6667C25.228 26.6667 25.9733 26.6667 26.5432 26.3763C27.045 26.1207 27.454 25.7117 27.7096 25.2099C28 24.64 28 23.8947 28 22.4041L28 9.59592C28 8.93365 28 8.41829 27.9745 8.00004M4.02559 8.00004C4.05752 7.47695 4.1293 7.10578 4.29065 6.7891C4.54631 6.28734 4.95396 5.87969 5.45573 5.62402C6.02616 5.33337 6.77345 5.33337 8.26693 5.33337H23.7336C25.2271 5.33337 25.9728 5.33337 26.5432 5.62402C27.045 5.87969 27.454 6.28734 27.7096 6.7891C27.871 7.10578 27.9427 7.47695 27.9745 8.00004M27.9745 8.00004H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`${studentSidebarCollapsed ? 'hidden' : ''}`}>Dashboard</span>
          </button>

          <button
            onClick={() => onNavigate(role === 'student' ? 'timetable' : 'schedule')}
            className={`flex items-center gap-4 text-black text-xl font-light transition-all duration-200 hover:translate-x-1 font-poppins ${
              currentView === (role === 'student' ? 'timetable' : 'schedule') ? 'font-medium text-gray-800' : 'hover:font-medium'
            }`}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M22.666 24C22.666 24.7363 23.263 25.3333 23.9993 25.3333C24.7357 25.3333 25.3327 24.7363 25.3327 24C25.3327 23.2636 24.7357 22.6666 23.9993 22.6666C23.263 22.6666 22.666 23.2636 22.666 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 24C14.666 24.7363 15.263 25.3333 15.9993 25.3333C16.7357 25.3333 17.3327 24.7363 17.3327 24C17.3327 23.2636 16.7357 22.6666 15.9993 22.6666C15.263 22.6666 14.666 23.2636 14.666 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 24C6.66602 24.7363 7.26297 25.3333 7.99935 25.3333C8.73573 25.3333 9.33268 24.7363 9.33268 24C9.33268 23.2636 8.73573 22.6666 7.99935 22.6666C7.26297 22.6666 6.66602 23.2636 6.66602 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 16C22.666 16.7363 23.263 17.3333 23.9993 17.3333C24.7357 17.3333 25.3327 16.7363 25.3327 16C25.3327 15.2636 24.7357 14.6666 23.9993 14.6666C23.263 14.6666 22.666 15.2636 22.666 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 16C14.666 16.7363 15.263 17.3333 15.9993 17.3333C16.7357 17.3333 17.3327 16.7363 17.3327 16C17.3327 15.2636 16.7357 14.6666 15.9993 14.6666C15.263 14.6666 14.666 15.2636 14.666 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 16C6.66602 16.7363 7.26297 17.3333 7.99935 17.3333C8.73573 17.3333 9.33268 16.7363 9.33268 16C9.33268 15.2636 8.73573 14.6666 7.99935 14.6666C7.26297 14.6666 6.66602 15.2636 6.66602 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 7.99996C22.666 8.73634 23.263 9.33329 23.9993 9.33329C24.7357 9.33329 25.3327 8.73634 25.3327 7.99996C25.3327 7.26358 24.7357 6.66663 23.9993 6.66663C23.263 6.66663 22.666 7.26358 22.666 7.99996Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 7.99996C14.666 8.73634 15.263 9.33329 15.9993 9.33329C16.7357 9.33329 17.3327 8.73634 17.3327 7.99996C17.3327 7.26358 16.7357 6.66663 15.9993 6.66663C15.263 6.66663 14.666 7.26358 14.666 7.99996Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 7.99996C6.66602 8.73634 7.26297 9.33329 7.99935 9.33329C8.73573 9.33329 9.33268 8.73634 9.33268 7.99996C9.33268 7.26358 8.73573 6.66663 7.99935 6.66663C7.26297 6.66663 6.66602 7.26358 6.66602 7.99996Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`${studentSidebarCollapsed ? 'hidden' : ''}`}>Timetable</span>
          </button>

          <button 
            onClick={() => onNavigate('notification')}
            className={`flex items-center gap-4 text-black text-xl font-light transition-all duration-200 hover:translate-x-1 font-poppins ${
              currentView === 'notification' ? 'font-medium text-gray-800' : 'hover:font-medium'
            }`}
          >
            <svg width="35" height="32" viewBox="0 0 35 32" fill="none">
              <path d="M21.8757 22.6667V24C21.8757 26.2092 19.9169 28 17.5007 28C15.0844 28 13.1257 26.2092 13.1257 24V22.6667M21.8757 22.6667H13.1257M21.8757 22.6667H27.1118C27.6696 22.6667 27.9499 22.6667 28.1758 22.597C28.6073 22.464 28.9449 22.1542 29.0904 21.7598C29.1669 21.5524 29.1669 21.2954 29.1669 20.7813C29.1669 20.5563 29.1666 20.4439 29.1474 20.3366C29.111 20.134 29.025 19.9418 28.894 19.775C28.8247 19.6869 28.7367 19.6064 28.5633 19.4478L27.9952 18.9284C27.812 18.7609 27.709 18.5336 27.709 18.2966V13.3334C27.709 8.17871 23.1386 4.00003 17.5007 4.00004C11.8628 4.00005 7.29232 8.17873 7.29232 13.3334V18.2966C7.29232 18.5336 7.18913 18.7609 7.00585 18.9284L6.43783 19.4478C6.26386 19.6068 6.17675 19.6868 6.10742 19.775C5.9764 19.9419 5.88961 20.134 5.85323 20.3366C5.83398 20.4439 5.83398 20.5564 5.83398 20.7813C5.83398 21.2954 5.83398 21.5524 5.91048 21.7597C6.05602 22.1542 6.39515 22.464 6.82662 22.597C7.05251 22.6667 7.33171 22.6667 7.88959 22.6667H13.1257M26.2777 2.68494C28.2891 4.07069 29.8736 5.90906 30.8771 8.02102M8.72435 2.68494C6.713 4.07069 5.12844 5.90906 4.125 8.02102" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`${studentSidebarCollapsed ? 'hidden' : ''}`}>Notification</span>
          </button>
        </nav>

        {/* User section at bottom */}
        <div className="mt-auto mb-8 px-8">
          <div className="hidden">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20.3499 8.92293L19.9837 8.7192C19.9269 8.68756 19.8989 8.67169 19.8714 8.65524C19.5983 8.49165 19.3682 8.26564 19.2002 7.99523C19.1833 7.96802 19.1674 7.93949 19.1348 7.8831C19.1023 7.82677 19.0858 7.79823 19.0706 7.76998C18.92 7.48866 18.8385 7.17515 18.8336 6.85606C18.8331 6.82398 18.8332 6.79121 18.8343 6.72604L18.8415 6.30078C18.8529 5.62025 18.8587 5.27894 18.763 4.97262C18.6781 4.70053 18.536 4.44993 18.3462 4.23725C18.1317 3.99685 17.8347 3.82534 17.2402 3.48276L16.7464 3.1982C16.1536 2.85658 15.8571 2.68571 15.5423 2.62057C15.2639 2.56294 14.9765 2.56561 14.6991 2.62789C14.3859 2.69819 14.0931 2.87351 13.5079 3.22396L13.5045 3.22555L13.1507 3.43741C13.0948 3.47091 13.0665 3.48779 13.0384 3.50338C12.7601 3.6581 12.4495 3.74365 12.1312 3.75387C12.0992 3.7549 12.0665 3.7549 12.0013 3.7549C11.9365 3.7549 11.9024 3.7549 11.8704 3.75387C11.5515 3.74361 11.2402 3.65759 10.9615 3.50224C10.9334 3.48658 10.9056 3.46956 10.8496 3.4359L10.4935 3.22213C9.90422 2.86836 9.60915 2.69121 9.29427 2.62057C9.0157 2.55807 8.72737 2.55634 8.44791 2.61471C8.13236 2.68062 7.83577 2.85276 7.24258 3.19703L7.23994 3.1982L6.75228 3.48124L6.74688 3.48454C6.15904 3.82572 5.86441 3.99672 5.6517 4.23614C5.46294 4.4486 5.32185 4.69881 5.2374 4.97018C5.14194 5.27691 5.14703 5.61896 5.15853 6.3027L5.16568 6.72736C5.16676 6.79166 5.16864 6.82362 5.16817 6.85525C5.16343 7.17499 5.08086 7.48914 4.92974 7.77096C4.9148 7.79883 4.8987 7.8267 4.86654 7.88237C4.83436 7.93809 4.81877 7.9..."/>
              <path d="M8.00033 12C8.00033 14.2091 9.79119 16 12.0003 16C14.2095 16 16.0003 14.2091 16.0003 12C16.0003 9.79082 14.2095 7.99996 12.0003 7.99996C9.79119 7.99996 8.00033 9.79082 8.00033 12Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`${studentSidebarCollapsed ? 'hidden' : ''}`}>Settings</span>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 text-black text-xl font-light hover:font-medium transition-all duration-200 hover:translate-x-1 font-poppins"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M25.3327 28C25.3327 22.8453 21.154 18.6667 15.9993 18.6667C10.8447 18.6667 6.66602 22.8453 6.66602 28M15.9993 14.6667C13.0538 14.6667 10.666 12.2789 10.666 9.33333C10.666 6.38781 13.0538 4 15.9993 4C18.9449 4 21.3327 6.38781 21.3327 9.33333C21.3327 12.2789 18.9449 14.6667 15.9993 14.6667Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={`${studentSidebarCollapsed ? 'hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </aside>
      
      {/* Main content */}
      <main className="relative bg-white overflow-auto" style={{ marginLeft: `${studentSidebarWidth}px`, minHeight: '100vh' }}>
        {/* Header */}
        <header className={`flex justify-between ${role === 'student' ? 'items-start mb-4' : 'items-center mb-8'}`}>
          <h1 className="text-6xl font-bold text-black font-poppins capitalize" style={{ fontWeight: 500 }}>
            {`Hello ${String(studentName || 'Student')} !`}
          </h1>
          
          {/* Character avatar - hidden for student portal to free up space */}
          {role !== 'student' && (
            <div className="w-80 h-80 relative">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/885bc9d3ced1f9cf0ef1a254af16e38983c42c98?width=544"
                alt="Student Character"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjcyIiBoZWlnaHQ9IjI3MiIgdmlld0JveD0iMCAwIDI3MiAyNzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNzIiIGhlaWdodD0iMjcyIiByeD0iMTM2IiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEzNiIgeT0iMTQ2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlN0dWRlbnQ8L3RleHQ+Cjwvc3ZnPg==';
                }}
              />
            </div>
          )}
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* Left section - Statistics, Week selector and My Course */}
          <div className="col-span-7 space-y-8">
            {/* Statistics Cards */}
            <div className="flex gap-6 mb-8">
              {/* Total Classes Card */}
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex justify-between items-center h-20">
                  <div className="flex flex-col h-full justify-between">
                    <span className="text-sm text-gray-500 font-medium">Total Classes</span>
                    <span className="text-3xl font-medium text-black">{totalClassesThisWeek}</span>
                  </div>
                  <div>
                    <svg width="33" height="32" viewBox="0 0 33 32" fill="none">
                      <path d="M16.25 9.33331V28" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4.24935 24C3.89573 24 3.55659 23.8595 3.30654 23.6095C3.05649 23.3594 2.91602 23.0203 2.91602 22.6667V5.33333C2.91602 4.97971 3.05649 4.64057 3.30654 4.39052C3.55659 4.14048 3.89573 4 4.24935 4H10.916C12.3305 4 13.6871 4.5619 14.6873 5.5621C15.6874 6.56229 16.2493 7.91885 16.2493 9.33333C16.2493 7.91885 16.8113 6.56229 17.8114 5.5621C18.8116 4.5619 20.1682 4 21.5827 4H28.2493C28.603 4 28.9421 4.14048 29.1922 4.39052C29.4422 4.64057 29.5827 4.97971 29.5827 5.33333V22.6667C29.5827 23.0203 29.4422 23.3594 29.1922 23.6095C28.9421 23.8595 28.603 24 28.2493 24H20.2493C19.1885 24 18.1711 24.4214 17.4209 25.1716C16.6708 25.9217 16.2493 26.9391 16.2493 28C16.2493 26.9391 15.8279 25.1716 15.0778 25.1716C14.3276 24.4214 13.3102 24 12.2493 24H4.24935Z" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">This week</div>
              </div>

              {/* Free Hours Card */}
              <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex justify-between items-center h-20">
                  <div className="flex flex-col h-full justify-between">
                    <span className="text-sm text-gray-500 font-medium">Free Hours</span>
                    <span className="text-3xl font-medium text-black">{freePeriodsThisWeek}</span>
                  </div>
                  <div>
                    <svg width="33" height="32" viewBox="0 0 33 32" fill="none">
                      <path d="M13.584 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.916 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21.5833 10.6667C21.937 10.6667 22.2761 10.8072 22.5261 11.0572C22.7762 11.3073 22.9167 11.6464 22.9167 12V22.6667C22.9167 24.0812 22.3548 25.4377 21.3546 26.4379C20.3544 27.4381 18.9978 28 17.5833 28H9.58333C8.16885 28 6.81229 27.4381 5.8121 26.4379C4.8119 25.4377 4.25 24.0812 4.25 22.6667V12C4.25 11.6464 4.39048 11.3073 4.64052 11.0572C4.89057 10.8072 5.22971 10.6667 5.58333 10.6667H24.25C25.6645 10.6667 27.021 11.2286 28.0212 12.2288C29.0214 13.229 29.5833 14.5855 29.5833 16C29.5833 17.4145 29.0214 18.7711 28.0212 19.7713C27.021 20.7715 25.6645 21.3334 24.25 21.3334H22.9167" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.25 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Free periods this week</div>
              </div>
            </div>

            {role !== 'student' && (
            /* Week selector */
            <div className="flex gap-2 mb-8">
              {weekDays.map((day, index) => (
                <button
                  key={day}
                  onClick={() => setSelectedWeekDay(index)}
                  className={`flex flex-col items-center justify-center w-20 h-14 rounded-lg transition-all duration-200 hover:scale-105 font-poppins ${
                    index === selectedWeekDay ? 'bg-blue-200 bg-opacity-60 shadow-md' : 'bg-gray-200 hover:bg-gray-300'
                  }`}
                >
                  <span className="text-sm font-semibold text-black">{weekNumbers[index]}</span>
                  <span className="text-sm font-medium text-black uppercase">{day}</span>
                </button>
              ))}
            </div>
            )}
            
            {/* My Course section */}
            <div>
              <h3 className="text-xl font-light text-black text-center mb-6 font-poppins">My Course</h3>
              <div className="space-y-4">
                {(enrolledCourses && enrolledCourses.length > 0) ? enrolledCourses.map((subject, index) => (
                  <div key={index} className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-6 hover:shadow-xl transition-shadow">
                    <div className="w-32 h-28 bg-gray-200 rounded flex-shrink-0 overflow-hidden flex items-center justify-center" style={{ backgroundColor: '#f3f4f6' }}>
                      <div className="text-sm text-gray-600">{subject.name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-semibold text-black mb-2 capitalize font-poppins">{subject.name}</h4>
                      <p className="text-lg font-medium text-black font-poppins">{subject.code || ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div
                        className="w-20 h-3 rounded-full"
                        style={{ backgroundColor: subject.color }}
                      ></div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center text-gray-500 py-6">No enrolled courses found.</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right section - Calendar and Today's Timetable */}
          <div className="col-span-5 space-y-8">
            {/* Calendar */}
            <div className={`w-full bg-white rounded-lg border border-gray-300 ${role === 'student' ? 'p-4' : 'p-6'} shadow-sm`}>
              <h3 className={`${role === 'student' ? 'text-lg mb-3' : 'text-xl mb-4'} font-bold text-black font-poppins`}>{calendarData.monthTitle}</h3>
              
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className={`text-center ${role === 'student' ? 'text-xs py-1' : 'text-sm py-2'} text-gray-600 font-medium font-poppins`}>
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarData.prevDays.map((date) => (
                  <div key={`prev-${date}`} className={`text-center ${role === 'student' ? 'text-sm py-1' : 'text-base py-2'} text-gray-400 hover:bg-gray-50 rounded cursor-pointer font-poppins`}>
                    {date}
                  </div>
                ))}
                {calendarData.currDays.map((date) => (
                  <div key={`curr-${date}`} className={`text-center ${role === 'student' ? 'text-sm py-1' : 'text-base py-2'} text-black hover:bg-blue-50 rounded cursor-pointer transition-colors font-poppins`}>
                    {date === calendarData.todayDate ? (
                      <span className={`inline-flex ${role === 'student' ? 'w-6 h-6' : 'w-8 h-8'} items-center justify-center rounded-full bg-blue-600 text-white`}>{date}</span>
                    ) : (
                      date
                    )}
                  </div>
                ))}
                {calendarData.nextDays.map((date) => (
                  <div key={`next-${date}`} className={`text-center ${role === 'student' ? 'text-sm py-1' : 'text-base py-2'} text-gray-400 hover:bg-gray-50 rounded cursor-pointer font-poppins`}>
                    {date}
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Timetable */}
            <div className="w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-light text-black font-poppins">Today's Timetable</h3>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg width="12" height="17" viewBox="0 0 12 17" fill="none" />
                </button>
              </div>
              
              {/* Week navigation */}
              <div className="flex gap-2 mb-6">
                {weekDays.map((day, index) => (
                  <button
                    key={day}
                    onClick={() => setSelectedWeekDay(index)}
                    className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 font-poppins ${
                      index === selectedWeekDay ? 'bg-blue-200 bg-opacity-60 shadow-md' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    <span className="text-sm font-semibold text-black">{weekNumbers[index]}</span>
                    <span className="text-xs font-medium text-black uppercase">{day}</span>
                  </button>
                ))}
              </div>

              {/* Timetable widget */}
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-black font-josefin-sans">{fullDayLabel}</span>
                  </div>
                  {isTodayWeekend ? (
                    <div className="text-center text-black font-poppins py-8">today is a holiday</div>
                  ) : (
                    <div className="space-y-2">
                      {todayScheduleItems.map((slot, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-3 rounded-2xl text-sm"
                          style={{
                            backgroundColor: slot.color,
                            color: isLightColor(slot.color) ? '#000' : '#FFF'
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-xs font-poppins">{slot.subject}</div>
                          </div>
                          <div className="text-right">
                            {slot.startTime && <div className="text-xs opacity-90 font-poppins">{slot.startTime}</div>}
                            {slot.endTime && <div className="text-xs opacity-90 font-poppins">{slot.endTime}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

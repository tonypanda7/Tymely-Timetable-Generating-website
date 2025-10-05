import { useState, useMemo } from 'react';
import TeacherSidebar from './TeacherSidebar.jsx';

const TeacherSchedulePage = ({
  collegeId,
  onLogout,
  onNavigate,
  currentView = 'schedule',
  teacherTimetable = [],
  generatedTimetables = {},
  workingDays = 6,
  hoursPerDay = 9,
  handleSlotToggle,
  timeSlots = [],
  classes = [],
  teachers = [],
  teacherCancellations = [],
}) => {

  // Get teacher info
  const currentTeacher = useMemo(() => {
    return teachers.find(t => t.id === collegeId) || { name: 'Rahul', hoursLeft: 0, weeklyRequiredHours: 0 };
  }, [teachers, collegeId]);

  // Derived labels, periods, and stats from actual timetable
  const daysLabels = useMemo(() => {
    return ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].slice(0, Math.min(6, Number(workingDays || 6)));
  }, [workingDays]);

  const defaultTimeSlots = ['9:00-10:00','10:00-11:00','11:00-12:00','12:00-1:00','1:00-2:00','2:00-3:00'];

  const periodCount = useMemo(() => {
    if (Array.isArray(timeSlots) && timeSlots.length) return Math.min(timeSlots.length, Number(hoursPerDay || timeSlots.length));
    if (Number.isFinite(Number(hoursPerDay))) return Number(hoursPerDay);
    if (Array.isArray(teacherTimetable) && teacherTimetable.length) {
      return teacherTimetable.reduce((m, day) => Math.max(m, Array.isArray(day) ? day.length : 0), 0);
    }
    return defaultTimeSlots.length;
  }, [timeSlots, hoursPerDay, teacherTimetable]);

  const renderTimeSlots = useMemo(() => {
    if (Array.isArray(timeSlots) && timeSlots.length) return timeSlots.slice(0, periodCount);
    const slots = [];
    for (let i = 0; i < periodCount; i++) {
      slots.push(defaultTimeSlots[i] || `${9 + i}:00-${10 + i}:00`);
    }
    return slots;
  }, [timeSlots, periodCount]);

  const parseSlotLabel = (label) => {
    const m = String(label || '').match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (!m) return null;
    const toMin = (s) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
    return { start: toMin(m[1]), end: toMin(m[2]) };
  };

  const teacherStats = useMemo(() => {
    let totalClasses = 0;
    let freePeriods = 0;
    let classDurationMinutes = 60;

    for (const lbl of renderTimeSlots) {
      if (/(\(LUNCH\))/i.test(String(lbl)) || /^\s*break\s*$/i.test(String(lbl))) continue;
      const parsed = parseSlotLabel(lbl);
      if (parsed) { classDurationMinutes = Math.max(1, (parsed.end - parsed.start + 24*60) % (24*60)); break; }
    }

    const days = Math.min(Number(workingDays || 0), Array.isArray(teacherTimetable) ? teacherTimetable.length : 0);
    for (let d = 0; d < days; d++) {
      const row = Array.isArray(teacherTimetable[d]) ? teacherTimetable[d] : [];
      const periods = Math.min(periodCount, row.length, renderTimeSlots.length);
      for (let p = 0; p < periods; p++) {
        const lbl = renderTimeSlots[p] || '';
        if (/(\(LUNCH\))/i.test(String(lbl)) || /^\s*break\s*$/i.test(String(lbl))) continue;
        const slot = row[p];
        const subj = String(slot?.subjectName || '');
        const isBreak = slot && (slot.status === 'break' || /break|lunch/i.test(subj));
        if (isBreak) continue;
        if (!slot || slot.status === 'free' || subj === 'Free') {
          freePeriods++;
        } else {
          totalClasses++;
        }
      }
    }

    const weeklyHours = Math.round(((totalClasses * classDurationMinutes) / 60) * 10) / 10;
    const freeHours = Math.round(((freePeriods * classDurationMinutes) / 60));
    return { totalClasses, freePeriods, weeklyHours, freeHours };
  }, [teacherTimetable, renderTimeSlots, periodCount, workingDays]);

  const classesCompleted = useMemo(() => {
    const now = new Date();
    const todayIdx = ((now.getDay() + 6) % 7);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let completed = 0;
    let total = 0;

    const days = Math.min(Number(workingDays || 0), Array.isArray(teacherTimetable) ? teacherTimetable.length : 0);
    for (let d = 0; d < days; d++) {
      const row = Array.isArray(teacherTimetable[d]) ? teacherTimetable[d] : [];
      const periods = Math.min(periodCount, row.length, renderTimeSlots.length);
      for (let p = 0; p < periods; p++) {
        const lbl = renderTimeSlots[p] || '';
        if (/(\(LUNCH\))/i.test(String(lbl)) || /^\s*break\s*$/i.test(String(lbl))) continue;
        const slot = row[p];
        const subj = String(slot?.subjectName || '');
        const isBreak = slot && (slot.status === 'break' || /break|lunch/i.test(subj));
        if (isBreak) continue;
        const isFree = !slot || slot.status === 'free' || subj === 'Free';
        if (isFree) continue;

        total++;
        const parsed = parseSlotLabel(lbl);
        if (d < todayIdx) completed++;
        else if (d === todayIdx && parsed && parsed.end <= nowMin) completed++;
      }
    }
    return { completed, total };
  }, [teacherTimetable, renderTimeSlots, periodCount, workingDays]);

  const progressPercent = useMemo(() => {
    return teacherStats.totalClasses > 0 ? Math.min(100, Math.round((classesCompleted.completed / teacherStats.totalClasses) * 100)) : 0;
  }, [classesCompleted, teacherStats]);

  const days = daysLabels;

  const weekWindow = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = ((day + 6) % 7);
    const start = new Date(now);
    start.setHours(0,0,0,0);
    start.setDate(now.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }, []);

  const cancellationStatusMap = useMemo(() => {
    const map = new Map();
    (Array.isArray(teacherCancellations) ? teacherCancellations : []).forEach((c) => {
      const ts = Number(c.createdAt || 0);
      if (!Number.isFinite(ts)) return;
      if (ts < weekWindow.startMs || ts >= weekWindow.endMs) return;
      const key = `${c.dayIndex}-${c.periodIndex}-${c.className}`;
      map.set(key, String(c.status || 'pending'));
    });
    return map;
  }, [teacherCancellations, weekWindow]);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
      {/* Sidebar (fixed) */}
      <TeacherSidebar currentView={currentView} onNavigate={onNavigate} onLogout={onLogout} />
      {/* Sidebar */}
      <div className="hidden">
        {/* Hamburger Menu */}
        <div className="pt-16 pb-8">
          <div className="mx-auto w-12 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
            <svg width="32" height="26" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 18.1473H28M4 12.9774H28M4 7.80762H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-8 space-y-6">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-4 w-full text-left ${
              currentView === 'dashboard' ? 'font-medium' : 'font-light'
            }`}
            style={{ 
              color: '#000', 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '20px',
              textTransform: 'capitalize'
            }}
          >
            <svg width="32" height="23" viewBox="0 0 32 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 5.84027H4.02559M4.02559 5.84027H27.9745M4.02559 5.84027C4 6.12665 4 6.47966 4 6.93356V15.6784C4 16.6987 4 17.2082 4.29065 17.5979C4.54631 17.9407 4.95396 18.2201 5.45573 18.3948C6.02561 18.5932 6.77201 18.5932 8.26259 18.5932L23.7375 18.5932C25.228 18.5932 25.9733 18.5932 26.5432 18.3948C27.045 18.2201 27.454 17.9407 27.7096 17.5979C28 17.2086 28 16.6994 28 15.681L28 6.93056C28 6.47811 28 6.12602 27.9745 5.84027M4.02559 5.84027C4.05752 5.48291 4.1293 5.22932 4.29065 5.01297C4.54631 4.67017 4.95396 4.39167 5.45573 4.217C6.02616 4.01843 6.77345 4.01843 8.26693 4.01843H23.7336C25.2271 4.01843 25.9728 4.01843 26.5432 4.217C27.045 4.39167 27.454 4.67017 27.7096 5.01297C27.871 5.22932 27.9427 5.48291 27.9745 5.84027M27.9745 5.84027H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>

          <button 
            onClick={() => onNavigate('schedule')}
            className={`flex items-center gap-4 w-full text-left ${
              currentView === 'schedule' ? 'font-medium' : 'font-light'
            }`}
            style={{ 
              color: '#000', 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '20px',
              textTransform: 'capitalize'
            }}
          >
            <svg width="32" height="26" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.666 19.5C22.666 20.0983 23.263 20.5834 23.9993 20.5834C24.7357 20.5834 25.3327 20.0983 25.3327 19.5C25.3327 18.9017 24.7357 18.4167 23.9993 18.4167C23.263 18.4167 22.666 18.9017 22.666 19.5Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 19.5C14.666 20.0983 15.263 20.5834 15.9993 20.5834C16.7357 20.5834 17.3327 20.0983 17.3327 19.5C17.3327 18.9017 16.7357 18.4167 15.9993 18.4167C15.263 18.4167 14.666 18.9017 14.666 19.5Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 19.5C6.66602 20.0983 7.26297 20.5834 7.99935 20.5834C8.73573 20.5834 9.33268 20.0983 9.33268 19.5C9.33268 18.9017 8.73573 18.4167 7.99935 18.4167C7.26297 18.4167 6.66602 18.9017 6.66602 19.5Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 13C22.666 13.5983 23.263 14.0834 23.9993 14.0834C24.7357 14.0834 25.3327 13.5983 25.3327 13C25.3327 12.4017 24.7357 11.9167 23.9993 11.9167C23.263 11.9167 22.666 12.4017 22.666 13Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 13C14.666 13.5983 15.263 14.0834 15.9993 14.0834C16.7357 14.0834 17.3327 13.5983 17.3327 13C17.3327 12.4017 16.7357 11.9167 15.9993 11.9167C15.263 11.9167 14.666 12.4017 14.666 13Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 13C6.66602 13.5983 7.26297 14.0834 7.99935 14.0834C8.73573 14.0834 9.33268 13.5983 9.33268 13C9.33268 12.4017 8.73573 11.9167 7.99935 11.9167C7.26297 11.9167 6.66602 12.4017 6.66602 13Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 6.50002C22.666 7.09833 23.263 7.58335 23.9993 7.58335C24.7357 7.58335 25.3327 7.09833 25.3327 6.50002C25.3327 5.90171 24.7357 5.41669 23.9993 5.41669C23.263 5.41669 22.666 5.90171 22.666 6.50002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 6.50002C14.666 7.09833 15.263 7.58335 15.9993 7.58335C16.7357 7.58335 17.3327 7.09833 17.3327 6.50002C17.3327 5.90171 16.7357 5.41669 15.9993 5.41669C15.263 5.41669 14.666 5.90171 14.666 6.50002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 6.50002C6.66602 7.09833 7.26297 7.58335 7.99935 7.58335C8.73573 7.58335 9.33268 7.09833 9.33268 6.50002C9.33268 5.90171 8.73573 5.41669 7.99935 5.41669C7.26297 5.41669 6.66602 5.90171 6.66602 6.50002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Schedule
          </button>

          <button 
            className="flex items-center gap-4 w-full text-left font-light"
            style={{ 
              color: '#000', 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '20px',
              textTransform: 'capitalize'
            }}
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.0007 4L20.0007 20M20.0007 4H9.60091C8.10744 4 7.36014 4 6.78971 4.21799C6.28795 4.40973 5.8803 4.71547 5.62463 5.0918C5.33398 5.51962 5.33398 6.08009 5.33398 7.2002V16.8002C5.33398 17.9203 5.33398 18.4796 5.62463 18.9074C5.8803 19.2837 6.28795 19.5905 6.78971 19.7822C7.35959 20 8.10599 20 9.59658 20L20.0007 20M20.0007 4H22.4009C23.8944 4 24.6401 4 25.2105 4.21799C25.7123 4.40973 26.1213 4.71547 26.377 5.0918C26.6673 5.5192 26.6673 6.079 26.6673 7.19691L26.6673 16.8031C26.6673 17.921 26.6673 18.48 26.377 18.9074C26.1213 19.2837 25.7123 19.5905 25.2105 19.7822C24.6406 20 23.8953 20 22.4048 20H20.0007" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Course
          </button>

          <button 
            className="flex items-center gap-4 w-full text-left font-light"
            style={{ 
              color: '#000', 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '20px',
              textTransform: 'capitalize'
            }}
          >
            <svg width="35" height="25" viewBox="0 0 35 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.8757 17.7084V18.75C21.8757 20.4759 19.9169 21.875 17.5007 21.875C15.0844 21.875 13.1257 20.4759 13.1257 18.75V17.7084M21.8757 17.7084H13.1257M21.8757 17.7084H27.1118C27.6696 17.7084 27.9499 17.7084 28.1758 17.6539C28.6073 17.55 28.9449 17.308 29.0904 16.9998C29.1669 16.8378 29.1669 16.637 29.1669 16.2354C29.1669 16.0596 29.1666 15.9718 29.1474 15.888C29.111 15.7296 29.025 15.5795 28.894 15.4492C28.8247 15.3803 28.7367 15.3175 28.5633 15.1936L27.9952 14.7878C27.812 14.6569 27.709 14.4793 27.709 14.2942V10.4167C27.709 6.3896 23.1386 3.12501 17.5007 3.12502C11.8628 3.12503 7.29232 6.38962 7.29232 10.4167V14.2942C7.29232 14.4794 7.18913 14.6569 7.00585 14.7878L6.43783 15.1936C6.26386 15.3178 6.17675 15.3803 6.10742 15.4492C5.9764 15.5796 5.88961 15.7296 5.85323 15.888C5.83398 15.9718 5.83398 16.0596 5.83398 16.2354C5.83398 16.637 5.83398 16.8378 5.91048 16.9998C6.05602 17.3079 6.39515 17.55 6.82662 17.6539C7.05251 17.7084 7.33171 17.7084 7.88959 17.7084H13.1257M26.2777 2.0976C28.2891 3.18021 29.8736 4.61644 30.8771 6.26641M8.72435 2.0976C6.713 3.18021 5.12844 4.61644 4.125 6.26641" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Notification
          </button>
        </nav>

        {/* Bottom User Section */}
        <div className="mt-auto mb-8 px-8 space-y-4">
          <button 
            className="flex items-center gap-4 w-full text-left font-light"
            style={{ 
              color: '#000', 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '20px',
              textTransform: 'capitalize'
            }}
          >
            <svg width="24" height="19" viewBox="0 0 24 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.3499 7.06399L19.9837 6.9027C19.9269 6.87766 19.8989 6.86509 19.8714 6.85206C19.5983 6.72256 19.3682 6.54363 19.2002 6.32956C19.1833 6.30802 19.1674 6.28543 19.1348 6.24078C19.1023 6.1962 19.0858 6.1736 19.0706 6.15124C18.92 5.92852 18.8385 5.68033 18.8336 5.42772C18.8331 5.40232 18.8332 5.37637 18.8343 5.32479L18.8415 4.98812C18.8529 4.44937 18.8587 4.17916 18.763 3.93666C18.6781 3.72126 18.536 3.52286 18.3462 3.35449C18.1317 3.16417 17.8347 3.0284 17.2402 2.75719L16.7464 2.53191C16.1536 2.26146 15.8571 2.12619 15.5423 2.07462C15.2639 2.02899 14.9765 2.03111 14.6991 2.08041C14.3859 2.13606 14.0931 2.27486 13.5079 2.5523L13.5045 2.55356L13.1507 2.72128C13.0948 2.7478 13.0665 2.76117 13.0384 2.77351C12.7601 2.896 12.4495 2.96373 12.1312 2.97181C12.0992 2.97263 12.0665 2.97263 12.0013 2.97263C11.9365 2.97263 11.9024 2.97263 11.8704 2.97181C11.5515 2.96369 11.2402 2.8956 10.9615 2.7726C10.9334 2.76021 10.9056 2.74673 10.8496 2.72009L10.4935 2.55085C9.90422 2.27079 9.60915 2.13054 9.29427 2.07462C9.0157 2.02514 8.72737 2.02377 8.44791 2.06998C8.13236 2.12215 7.83577 2.25843 7.24258 2.53098L7.23994 2.53191L6.75228 2.75598L6.74688 2.75859C6.15904 3.02869 5.86441 3.16407 5.6517 3.35361C5.46294 3.52181 5.32185 3.71989 5.2374 3.93472C5.14194 4.17755 5.14703 4.44834 5.15853 4.98963L5.16568 5.32582C5.16676 5.37673 5.16864 5.40203 5.16817 5.42707C5.16343 5.6802 5.08086 5.9289 4.92974 6.15201C4.9148 6.17407 4.8987 6.19614 4.86654 6.24021C4.83436 6.28432 4.81877 6.30625 4.80209 6.32753C4.63336 6.54275 4.40214 6.72272 4.12733 6.85245C4.10015 6.86528 4.0715 6.87762 4.01521 6.90231L3.65365 7.06094C3.05208 7.32486 2.75137 7.45693 2.53256 7.64488C2.33898 7.81116 2.19275 8.00838 2.10349 8.22318C2.00259 8.46598 2.00267 8.73824 2.00424 9.28273L2.00551 9.72774C2.00706 10.2686 2.00919 10.5388 2.11032 10.78C2.19979 10.9933 2.34495 11.1894 2.53744 11.3547C2.75502 11.5415 3.05274 11.6727 3.64974 11.9357L4.00808 12.0935C4.06907 12.1203 4.09976 12.1336 4.12917 12.1476C4.40148 12.2774 4.63089 12.4569 4.79818 12.6709C4.81625 12.694 4.8336 12.718 4.8683 12.766C4.90256 12.8134 4.92009 12.8371 4.93594 12.8608C5.08261 13.0807 5.16114 13.3249 5.16649 13.5735C5.16707 13.6004 5.16658 13.6275 5.16541 13.6821L5.15853 14.0047C5.14695 14.5479 5.1419 14.8198 5.23792 15.0633C5.32287 15.2787 5.46484 15.4771 5.65463 15.6454C5.86915 15.8358 6.16655 15.9714 6.76107 16.2427L7.25478 16.4679C7.84763 16.7384 8.14395 16.8735 8.45869 16.925C8.73714 16.9707 9.02464 16.9689 9.30209 16.9196C9.61567 16.8638 9.90948 16.7246 10.4964 16.4463L10.8502 16.2786C10.9062 16.2521 10.9346 16.2388 10.9626 16.2264C11.2409 16.1039 11.5512 16.0359 11.8695 16.0278C11.9015 16.027 11.9342 16.027 11.9994 16.027C12.0648 16.027 12.0974 16.027 12.1295 16.0278C12.4484 16.0359 12.7607 16.1042 13.0394 16.2272C13.0639 16.238 13.0885 16.2497 13.1316 16.2702L13.5078 16.449C14.0971 16.7291 14.3916 16.8689 14.7065 16.9249C14.985 16.9744 15.2736 16.9764 15.5531 16.9302C15.8685 16.878 16.1657 16.7414 16.7586 16.469L17.2536 16.2416C17.8418 15.9713 18.1367 15.8358 18.3495 15.6462C18.5383 15.478 18.6796 15.28 18.764 15.0652C18.8588 14.8241 18.8531 14.5554 18.8417 14.0219L18.8343 13.674C18.8332 13.6231 18.8331 13.5978 18.8336 13.5727C18.8383 13.3196 18.9195 13.0707 19.0706 12.8476C19.0856 12.8256 19.1018 12.8033 19.1338 12.7594C19.166 12.7153 19.1827 12.6933 19.1994 12.672C19.3681 12.4568 19.5995 12.2767 19.8744 12.147C19.9012 12.1343 19.9289 12.1222 19.9838 12.0981L19.9857 12.0974L20.3472 11.9388C20.9488 11.6748 21.2501 11.5426 21.4689 11.3547C21.6625 11.1884 21.8085 10.9914 21.8978 10.7766C21.9981 10.5353 21.9973 10.2646 21.9958 9.72647L21.9945 9.2719C21.9929 8.73106 21.9921 8.46086 21.891 8.2197C21.8015 8.00634 21.6555 7.81027 21.463 7.64501C21.2457 7.45838 20.9475 7.32708 20.3517 7.06466L20.3499 7.06399Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.00033 9.49997C8.00033 11.2489 9.79119 12.6666 12.0003 12.6666C14.2095 12.6666 16.0003 11.2489 16.0003 9.49997C16.0003 7.75107 14.2095 6.3333 12.0003 6.3333C9.79119 6.3333 8.00033 7.75107 8.00033 9.49997Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Settings
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 w-full text-left font-light"
            style={{ 
              color: '#000', 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '20px',
              textTransform: 'capitalize'
            }}
          >
            <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.3327 21C25.3327 17.134 21.154 14 15.9993 14C10.8447 14 6.66602 17.134 6.66602 21M15.9993 11C13.0538 11 10.666 9.20914 10.666 7C10.666 4.79086 13.0538 3 15.9993 3C18.9449 3 21.3327 4.79086 21.3327 7C21.3327 9.20914 18.9449 11 15.9993 11Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white" style={{ marginLeft: 'var(--teacher-sidebar-width, 246px)' }}>
        {/* Header */}
        <div className="p-8">
          <h1 
            className="text-black mb-6"
            style={{ 
              fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif',
              fontSize: '60px',
              fontWeight: 600,
              textTransform: 'capitalize',
              lineHeight: 'normal'
            }}
          >
            schedule
          </h1>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Weekly Hours Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex justify-between items-center h-full">
                <div className="flex flex-col">
                  <div 
                    className="text-[#717182] mb-1"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '20px',
                      letterSpacing: '-0.15px'
                    }}
                  >
                    Weekly Hours
                  </div>
                  <div 
                    className="text-[#0A0A0A] mb-2"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '24px',
                      fontWeight: 500,
                      lineHeight: '32px',
                      letterSpacing: '0.07px'
                    }}
                  >
                    {teacherStats.weeklyHours}h
                  </div>
                  <div 
                    className="text-[#717182]"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '16px'
                    }}
                  >
                    Teaching load
                  </div>
                </div>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 8V16L21.3333 18.6667" stroke="#00A63E" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.9993 29.3337C22.3631 29.3337 28.3327 23.3641 28.3327 16.0003C28.3327 8.63653 22.3631 2.66699 14.9993 2.66699C7.63555 2.66699 1.66602 8.63653 1.66602 16.0003C1.66602 23.3641 7.63555 29.3337 14.9993 29.3337Z" stroke="#00A63E" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Total Classes Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex justify-between items-center h-full">
                <div className="flex flex-col">
                  <div 
                    className="text-[#717182] mb-1"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '20px',
                      letterSpacing: '-0.15px'
                    }}
                  >
                    Total Classes
                  </div>
                  <div 
                    className="text-[#0A0A0A] mb-2"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '24px',
                      fontWeight: 500,
                      lineHeight: '32px',
                      letterSpacing: '0.07px'
                    }}
                  >
                    {teacherStats.totalClasses}
                  </div>
                  <div 
                    className="text-[#717182]"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '16px'
                    }}
                  >
                    This week
                  </div>
                </div>
                <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.25 9.33331V28" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.24935 24C3.89573 24 3.55659 23.8595 3.30654 23.6095C3.05649 23.3594 2.91602 23.0203 2.91602 22.6667V5.33333C2.91602 4.97971 3.05649 4.64057 3.30654 4.39052C3.55659 4.14048 3.89573 4 4.24935 4H10.916C12.3305 4 13.6871 4.5619 14.6873 5.5621C15.6874 6.56229 16.2493 7.91885 16.2493 9.33333C16.2493 7.91885 16.8113 6.56229 17.8114 5.5621C18.8116 4.5619 20.1682 4 21.5827 4H28.2493C28.603 4 28.9421 4.14048 29.1922 4.39052C29.4422 4.64057 29.5827 4.97971 29.5827 5.33333V22.6667C29.5827 23.0203 29.4422 23.3594 29.1922 23.6095C28.9421 23.8595 28.603 24 28.2493 24H20.2493C19.1885 24 18.1711 24.4214 17.4209 25.1716C16.6708 25.9217 16.2493 26.9391 16.2493 28C16.2493 26.9391 15.8279 25.9217 15.0778 25.1716C14.3276 24.4214 13.3102 24 12.2493 24H4.24935Z" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Free Hours Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex justify-between items-center h-full">
                <div className="flex flex-col">
                  <div 
                    className="text-[#717182] mb-1"
                    style={{ 
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      lineHeight: '20px',
                      letterSpacing: '-0.15px'
                    }}
                  >
                    Free Hours
                  </div>
                  <div
                    className="text-[#0A0A0A] mb-2"
                    style={{
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '24px',
                      fontWeight: 500,
                      lineHeight: '32px',
                      letterSpacing: '0.07px'
                    }}
                  >
                    {teacherStats.freePeriods}
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                      fontSize: '12px',
                      fontWeight: 400,
                      lineHeight: '16px',
                      color: '#3B82F6'
                    }}
                  >
                    Break time
                  </div>
                </div>
                <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.584 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.916 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21.5833 10.6667C21.937 10.6667 22.2761 10.8072 22.5261 11.0572C22.7762 11.3073 22.9167 11.6464 22.9167 12V22.6667C22.9167 24.0812 22.3548 25.4377 21.3546 26.4379C20.3544 27.4381 18.9978 28 17.5833 28H9.58333C8.16885 28 6.81229 27.4381 5.8121 26.4379C4.8119 25.4377 4.25 24.0812 4.25 22.6667V12C4.25 11.6464 4.39048 11.3073 4.64052 11.0572C4.89057 10.8072 5.22971 10.6667 5.58333 10.6667H24.25C25.6645 10.6667 27.021 11.2286 28.0212 12.2288C29.0214 13.229 29.5833 14.5855 29.5833 16C29.5833 17.4145 29.0214 18.7711 28.0212 19.7713C27.021 20.7715 25.6645 21.3334 24.25 21.3334H22.9167" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.25 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Classes Completed Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex flex-col h-full justify-between">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <div 
                      className="text-[#717182] mb-1"
                      style={{ 
                        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '20px',
                        letterSpacing: '-0.15px'
                      }}
                    >
                      Classes Completed
                    </div>
                    <div 
                      className="text-[#0A0A0A]"
                      style={{ 
                        fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                        fontSize: '24px',
                        fontWeight: 500,
                        lineHeight: '32px',
                        letterSpacing: '0.07px'
                      }}
                    >
                      {classesCompleted.completed}/{teacherStats.totalClasses}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-[rgba(3,2,19,0.2)] rounded-full h-2">
                  <div 
                    className="bg-[#030213] h-2 rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          {false && (<div className="flex items-center gap-4 mb-8">
            <div className="flex items-center justify-between w-32 h-9 px-3 bg-[#F3F3F5] border border-transparent rounded-lg relative">
              <span 
                className="text-[#0A0A0A]"
                style={{ 
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '20px',
                  letterSpacing: '-0.15px'
                }}
              >
                CS-3A
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6L8 10L12 6" stroke="#717182" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
              </svg>
            </div>

            <button className="flex items-center gap-3 h-9 px-3 bg-white border border-[rgba(0,0,0,0.1)] rounded-lg">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.44754 2.75735C6.48427 2.37091 6.66376 2.01205 6.95094 1.75087C7.23812 1.4897 7.61235 1.34497 8.00054 1.34497C8.38872 1.34497 8.76296 1.4897 9.05014 1.75087C9.33732 2.01205 9.5168 2.37091 9.55354 2.75735C9.57561 3.00699 9.65751 3.24763 9.79229 3.45891C9.92707 3.67019 10.1108 3.84589 10.3278 3.97114C10.5449 4.09638 10.789 4.16749 11.0393 4.17843C11.2897 4.18938 11.539 4.13984 11.7662 4.03402C12.1189 3.87387 12.5187 3.8507 12.8875 3.96901C13.2564 4.08732 13.5681 4.33865 13.7619 4.67409C13.9557 5.00953 14.0177 5.40507 13.936 5.78373C13.8542 6.1624 13.6345 6.4971 13.3195 6.72269C13.1145 6.86658 12.9471 7.05776 12.8315 7.28004C12.7159 7.50231 12.6556 7.74916 12.6556 7.99969C12.6556 8.25021 12.7159 8.49706 12.8315 8.71934C12.9471 8.94161 13.1145 9.13279 13.3195 9.27669C13.6345 9.50228 13.8542 9.83697 13.936 10.2156C14.0177 10.5943 13.9557 10.9898 13.7619 11.3253C13.5681 11.6607 13.2564 11.9121 12.8875 12.0304C12.5187 12.1487 12.1189 12.1255 11.7662 11.9654C11.539 11.8595 11.2897 11.81 11.0393 11.8209C10.789 11.8319 10.5449 11.903 10.3278 12.0282C10.1108 12.1535 9.92707 12.3292 9.79229 12.5405C9.65751 12.7517 9.57561 12.9924 9.55354 13.242C9.5168 13.6285 9.33732 13.9873 9.05014 14.2485C8.76296 14.5097 8.38872 14.6544 8.00054 14.6544C7.61235 14.6544 7.23812 14.5097 6.95094 14.2485C6.66376 13.9873 6.48427 13.6285 6.44754 13.242C6.4255 12.9923 6.3436 12.7516 6.20878 12.5402C6.07396 12.3288 5.89018 12.1531 5.67302 12.0278C5.45586 11.9026 5.21172 11.8315 4.96126 11.8206C4.7108 11.8097 4.4614 11.8594 4.2342 11.9654C3.88146 12.1255 3.48175 12.1487 3.11287 12.0304C2.74399 11.9121 2.43232 11.6607 2.23853 11.3253C2.04473 10.9898 1.98268 10.5943 2.06444 10.2156C2.14621 9.83697 2.36594 9.50228 2.68087 9.27669C2.88595 9.13279 3.05336 8.94161 3.16893 8.71934C3.2845 8.49706 3.34484 8.25021 3.34484 7.99969C3.34484 7.74916 3.2845 7.50231 3.16893 7.28004C3.05336 7.05776 2.88595 6.86658 2.68087 6.72269C2.36638 6.49698 2.14704 6.16242 2.06547 5.78401C1.9839 5.4056 2.04594 5.01038 2.23953 4.67516C2.43311 4.33994 2.74441 4.08867 3.11293 3.97018C3.48145 3.85169 3.88086 3.87444 4.23354 4.03402C4.46071 4.13984 4.71003 4.18938 4.9604 4.17843C5.21078 4.16749 5.45482 4.09638 5.67189 3.97114C5.88896 3.84589 6.07266 3.67019 6.20745 3.45891C6.34223 3.24763 6.42413 3.00699 6.4462 2.75735" stroke="#0A0A0A" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="#0A0A0A" strokeWidth="1.33333" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span 
                className="text-[#0A0A0A]"
                style={{ 
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  lineHeight: '20px',
                  letterSpacing: '-0.15px'
                }}
              >
                Preferences
              </span>
            </button>
          </div>)}

          {/* Timetable */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.1)] shadow-sm overflow-hidden">
            {/* Timetable Header */}
            <div className="flex items-center gap-2 p-6 border-b border-[rgba(0,0,0,0.1)]">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5.83331V17.5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.49935 15C2.27834 15 2.06637 14.9122 1.91009 14.7559C1.75381 14.5996 1.66602 14.3877 1.66602 14.1667V3.33333C1.66602 3.11232 1.75381 2.90036 1.91009 2.74408C2.06637 2.5878 2.27834 2.5 2.49935 2.5H6.66602C7.55007 2.5 8.39792 2.85119 9.02304 3.47631C9.64816 4.10143 9.99935 4.94928 9.99935 5.83333C9.99935 4.94928 10.3505 4.10143 10.9757 3.47631C11.6008 2.85119 12.4486 2.5 13.3327 2.5H17.4993C17.7204 2.5 17.9323 2.5878 18.0886 2.74408C18.2449 2.90036 18.3327 3.11232 18.3327 3.33333V14.1667C18.3327 14.3877 18.2449 14.5996 18.0886 14.7559C17.9323 14.9122 17.7204 15 17.4993 15H12.4993C11.8363 15 11.2004 15.2634 10.7316 15.7322C10.2627 16.2011 9.99935 16.837 9.99935 17.5C9.99935 16.837 9.73596 16.2011 9.26712 15.7322C8.79828 15.2634 8.16239 15 7.49935 15H2.49935Z" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span 
                className="text-[#0A0A0A]"
                style={{ 
                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                  fontSize: '16px',
                  fontWeight: 400,
                  lineHeight: '16px',
                  letterSpacing: '-0.312px'
                }}
              >
                Weekly Timetable
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                {/* Table Header */}
                <thead>
                  <tr className="h-9 border-b border-[rgba(0,0,0,0.1)]">
                    <th className="px-2 text-left bg-[rgba(236,236,240,0.3)] w-20 sm:w-28 md:w-32">
                      <span 
                        className="text-[#0A0A0A]"
                        style={{ 
                          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: '20px',
                          letterSpacing: '-0.15px'
                        }}
                      >
                        Time
                      </span>
                    </th>
                    {days.map((day, index) => (
                      <th key={index} className="px-1 sm:px-2 text-left">
                        <span 
                          className="text-[#0A0A0A]"
                          style={{ 
                            fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: '20px',
                            letterSpacing: '-0.15px'
                          }}
                        >
                          {day}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {Array.from({ length: periodCount }, (_, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-[rgba(0,0,0,0.1)]">
                      {/* Time Column */}
                      <td className="px-2 py-4 sm:py-6 text-left bg-[rgba(236,236,240,0.3)] w-20 sm:w-28 md:w-32">
                        <span
                          className="text-[#0A0A0A]"
                          style={{
                            fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                            lineHeight: '20px',
                            letterSpacing: '-0.15px'
                          }}
                        >
                          {renderTimeSlots[rowIndex] || `${9 + rowIndex}:00-${10 + rowIndex}:00`}
                        </span>
                      </td>

                      {/* Day Columns */}
                      {days.map((_, dayIdx) => {
                        const slot = teacherTimetable?.[dayIdx]?.[rowIndex];
                        const subj = String(slot?.subjectName || '');
                        const headerLabel = renderTimeSlots[rowIndex] || '';
                        const isHeaderBreak = /^\s*break\s*$/i.test(headerLabel) || /(\(LUNCH\))/i.test(headerLabel);
                        const isCellBreak = slot && (slot.status === 'break' || /break|lunch/i.test(subj));
                        const isFree = !slot || slot.status === 'free' || subj === 'Free';

                        if (isHeaderBreak || isCellBreak) {
                          return (
                            <td key={dayIdx} className="px-2 py-2">
                              <div className="w-full h-8 sm:h-10 flex items-center justify-center">
                                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                                  {/(LUNCH)/i.test(headerLabel) || /lunch/i.test(subj) ? 'Lunch' : 'Break'}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        if (isFree) {
                          return (
                            <td key={dayIdx} className="px-2 py-2">
                              <div className="w-full h-8 sm:h-10 flex items-center justify-center">
                                <span
                                  className="text-[#717182] text-center"
                                  style={{
                                    fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                                    fontSize: '12px',
                                    fontWeight: 400,
                                    lineHeight: '16px'
                                  }}
                                >
                                  Free
                                </span>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td key={dayIdx} className="px-2 py-2">
                            <div
                              role={(typeof handleSlotToggle === 'function' && slot?.status === 'confirmed' && !cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`)) ? 'button' : undefined}
                              onClick={() => {
                                const can = typeof handleSlotToggle === 'function' && slot?.status === 'confirmed' && !cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`);
                                if (can) handleSlotToggle(dayIdx, rowIndex, slot);
                              }}
                              className={`w-full h-10 sm:h-12 p-2 flex flex-col justify-center rounded border ${cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`) === 'approved' ? 'border-red-500 bg-white' : 'border-transparent bg-[#DCFCE7]'} ${(typeof handleSlotToggle === 'function' && slot?.status === 'confirmed' && !cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`)) ? 'cursor-pointer' : ''}`}
                            >
                              <div
                                className={`${cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`) === 'approved' ? 'text-red-700' : 'text-[#016630]'} text-center`}
                                style={{
                                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  lineHeight: '16px'
                                }}
                              >
                                {cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`) === 'approved' ? 'Canceled' : (cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`) === 'pending' ? 'Requested' : slot.subjectName)}
                              </div>
                              <div
                                className={`${cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`) ? 'text-red-700 opacity-75' : 'text-[#016630] opacity-75'} text-center`}
                                style={{
                                  fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                                  fontSize: '12px',
                                  fontWeight: 400,
                                  lineHeight: '16px'
                                }}
                              >
                                {cancellationStatusMap.get(`${dayIdx}-${rowIndex}-${slot.className}`) ? '' : slot.className}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedulePage;

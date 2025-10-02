import { useState, useEffect, useMemo } from 'react';
import TeacherSidebar from './TeacherSidebar.jsx';

const TeacherDashboard = ({
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
  teacherOffers = [],
  acceptOffer,
  declineOffer,
  timeSlots = [],
  electiveSlots = [],
  classes = [],
  teachers = [],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const DISPLAY_DAYS = 5;
  const DISPLAY_CENTER = Math.floor(DISPLAY_DAYS / 2);
  const [selectedDay, setSelectedDay] = useState(DISPLAY_CENTER); // index in displayedDates

  const slotDescriptors = useMemo(() => {
    if (!Array.isArray(timeSlots)) return [];
    return timeSlots.map((label, index) => {
      const originalLabel = String(label ?? '');
      const normalizedLabel = originalLabel.trim();
      const hasLunch = /\bLUNCH\b/i.test(normalizedLabel);
      const hasBreak = !hasLunch && /\bBREAK\b/i.test(normalizedLabel);
      const displayLabel = hasLunch ? 'Lunch' : hasBreak ? 'Break' : normalizedLabel;
      return {
        index,
        originalLabel,
        normalizedLabel,
        displayLabel,
        type: hasLunch ? 'lunch' : hasBreak ? 'break' : 'class',
      };
    });
  }, [timeSlots]);

  const breakOrLunchIndices = useMemo(() => {
    const indices = new Set();
    slotDescriptors.forEach((descriptor) => {
      if (descriptor.type === 'lunch' || descriptor.type === 'break') {
        indices.add(descriptor.index);
      }
    });
    return indices;
  }, [slotDescriptors]);

  const deriveSlotType = (slot, descriptor) => {
    const normalizedStatus = String(slot?.status || '').toLowerCase();
    if (normalizedStatus === 'lunch' || normalizedStatus === 'break') {
      return normalizedStatus;
    }
    if (descriptor && descriptor.type !== 'class') {
      return descriptor.type;
    }
    const subject = String(slot?.subjectName || '');
    if (/lunch/i.test(subject)) return 'lunch';
    if (/break/i.test(subject)) return 'break';
    return 'class';
  };

  const WEEKDAY_LABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const getWeekdayLabel = (idx) => WEEKDAY_LABELS[((Number(idx) % 7) + 7) % 7];

  // Get teacher info
  const currentTeacher = useMemo(() => {
    return teachers.find(t => t.id === collegeId) || { name: 'Teacher', hoursLeft: 0, weeklyRequiredHours: 0 };
  }, [teachers, collegeId]);

  // Calculate teacher stats (exclude lunch/break; free hours = number of free periods; weekly hours = total classes * class length / 60)
  const teacherStats = useMemo(() => {
    // Determine class duration in minutes from the first non-break/lunch header
    const parseHm = (t) => {
      const [hh, mm] = String(t || '').trim().split(':').map(Number);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      return hh * 60 + mm;
    };
    let classDurationMinutes = 60;
    for (const lbl of (Array.isArray(timeSlots) ? timeSlots : [])) {
      const s = String(lbl || '');
      if (/(\(LUNCH\))/.test(s) || /^\s*BREAK\s*$/i.test(s)) continue;
      const m = s.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if (m) {
        const start = parseHm(m[1]);
        const end = parseHm(m[2]);
        if (start != null && end != null) {
          classDurationMinutes = Math.max(1, (end - start + 24 * 60) % (24 * 60));
          break;
        }
      }
    }

    let totalClasses = 0;
    let freePeriods = 0;
    let teachingLoad = 0;

    if (Array.isArray(teacherTimetable) && teacherTimetable.length) {
      const days = Math.min(Number(workingDays || 5), teacherTimetable.length);
      for (let d = 0; d < days; d++) {
        const day = Array.isArray(teacherTimetable[d]) ? teacherTimetable[d] : [];
        const periods = Math.min(Number(hoursPerDay || 5), day.length);
        for (let p = 0; p < periods; p++) {
          if (breakOrLunchIndices.has(p)) continue; // skip lunch/break periods entirely
          const slot = day[p];
          const subj = String(slot?.subjectName || '');
          const slotType = deriveSlotType(slot, slotDescriptors[p]);
          if (slotType === 'break' || slotType === 'lunch') continue;
          const isFree = slot && (slot.status === 'free' || subj === 'Free');
          if (isFree) {
            freePeriods++;
          } else if (slot) {
            totalClasses++;
            teachingLoad++;
          }
        }
      }
    }

    const weeklyHours = (totalClasses * classDurationMinutes) / 60;
    const weeklyHoursRounded = Math.round(weeklyHours * 10) / 10; // 1 decimal place

    return {
      totalClasses,
      weeklyHours: weeklyHoursRounded,
      freeHours: freePeriods,
      teachingLoad,
      requiredHours: currentTeacher.weeklyRequiredHours || 0,
    };
  }, [teacherTimetable, workingDays, hoursPerDay, currentTeacher, timeSlots, slotDescriptors]);

  // Calendar helpers
  const calendarData = useMemo(() => {
    const now = currentDate;
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstOfMonth = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const daysInPrev = new Date(y, m, 0).getDate();
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday first

    const prevDays = Array.from({ length: startOffset }, (_, i) => daysInPrev - startOffset + 1 + i);
    const currDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalSoFar = prevDays.length + currDays.length;
    const cells = 42; // 6 rows * 7 cols
    const nextCount = Math.max(0, cells - totalSoFar);
    const nextDays = Array.from({ length: nextCount }, (_, i) => i + 1);

    const monthTitle = now.toLocaleString('default', { month: 'long', year: 'numeric' });
    const todayDate = now.getDate();

    return { prevDays, currDays, nextDays, monthTitle, todayDate, monthIndex: m, year: y };
  }, [currentDate]);

  // Get courses taught by teacher
  const teacherCourses = useMemo(() => {
    const courses = [];
    classes.forEach(cls => {
      if (cls.subjects) {
        cls.subjects.forEach(subject => {
          if (subject.teachers && subject.teachers.includes(collegeId)) {
            courses.push({
              name: subject.name,
              className: cls.name,
              code: subject.code || cls.name.split('-')[0] || '',
              progress: Math.floor(Math.random() * 40) + 30 // Simulated progress
            });
          }
        });
      }
    });
    return courses.slice(0, 4); // Limit to 4 courses
  }, [classes, collegeId]);

  // Calculate class progress data based on classes assigned to the teacher
  const classProgressData = useMemo(() => {
    const sanitizeId = (s) => String(s || '').replace(/\//g, '_').replace(/\s+/g, '-');
    const data = [];

    (Array.isArray(classes) ? classes : []).forEach((cls) => {
      const subjects = Array.isArray(cls?.subjects) ? cls.subjects : [];
      const isAssigned = subjects.some((subj) => Array.isArray(subj?.teachers) && subj.teachers.includes(collegeId));
      if (!isAssigned) return;

      const clsKey = sanitizeId(cls.name);
      const table = generatedTimetables && generatedTimetables[clsKey];
      let totalSlots = 0;
      let teacherSlots = 0;
      if (Array.isArray(table)) {
        for (let d = 0; d < table.length; d++) {
          const row = Array.isArray(table[d]) ? table[d] : [];
          for (let p = 0; p < row.length; p++) {
            const cell = row[p];
            if (!cell) continue;
            const subjName = String(cell.subjectName || '');
            const isBreak = cell.status === 'break' || /break|lunch/i.test(subjName);
            const isFree = cell.status === 'free' || subjName === 'Free';
            if (isBreak || isFree) continue;
            totalSlots++;
            if (cell.teacherId === collegeId) teacherSlots++;
          }
        }
      }
      const percent = totalSlots > 0 ? Math.round((teacherSlots / totalSlots) * 100) : 0;
      const registered = Array.isArray(cls.students) ? cls.students.length : 0;
      data.push({ name: cls.name, registered, progress: percent, color: '#0052B4' });
    });

    return data.slice(0, 4);
  }, [classes, generatedTimetables, collegeId]);

  const computedTeacherTimetable = useMemo(() => {
    let base;

    if (Array.isArray(teacherTimetable) && teacherTimetable.length) {
      base = teacherTimetable.map((day) => {
        if (!Array.isArray(day)) return [];
        return day.map((slot) => {
          if (!slot) {
            return { subjectName: 'Free', className: '', status: 'free', teacherId: '' };
          }
          return { ...slot };
        });
      });
    } else {
      const days = Number(workingDays || 5);
      const hours = Number(hoursPerDay || 5);
      base = Array.from({ length: days }, () =>
        Array.from({ length: hours }, () => ({ subjectName: 'Free', className: '', status: 'free', teacherId: '' }))
      );

      try {
        Object.keys(generatedTimetables || {}).forEach((clsName) => {
          const table = generatedTimetables[clsName];
          if (!Array.isArray(table)) return;
          for (let d = 0; d < Math.min(days, table.length); d++) {
            const day = Array.isArray(table[d]) ? table[d] : [];
            for (let p = 0; p < Math.min(hours, day.length); p++) {
              const slot = day[p];
              if (slot && slot.teacherId === collegeId) {
                base[d][p] = { subjectName: slot.subjectName || 'N/A', className: clsName, status: slot.status || 'confirmed', teacherId: slot.teacherId };
              }
            }
          }
        });
      } catch (e) {
        // ignore
      }
    }

    if (breakOrLunchIndices.size > 0) {
      const intervalIndices = Array.from(breakOrLunchIndices);
      for (let dayIndex = 0; dayIndex < base.length; dayIndex++) {
        const dailySlots = base[dayIndex];
        if (!Array.isArray(dailySlots)) continue;
        intervalIndices.forEach((periodIdx) => {
          if (periodIdx >= dailySlots.length) return;
          const descriptor = slotDescriptors[periodIdx];
          if (!descriptor || (descriptor.type !== 'break' && descriptor.type !== 'lunch')) return;
          const existingSlot = dailySlots[periodIdx] || {};
          const updatedSlot = {
            ...existingSlot,
            subjectName: descriptor.displayLabel,
            className: '',
            status: descriptor.type,
          };
          dailySlots[periodIdx] = updatedSlot;
        });
      }
    }

    return base;
  }, [teacherTimetable, generatedTimetables, collegeId, workingDays, hoursPerDay, slotDescriptors, breakOrLunchIndices]);

  // Initialize selected day to center (today will be centered)
  useEffect(() => {
    setSelectedDay(DISPLAY_CENTER);
    setCurrentDate(new Date());
  }, [workingDays]);

  // Compute displayedDates centered on currentDate
  const displayedDates = useMemo(() => {
    const base = new Date(currentDate || new Date());
    return Array.from({ length: DISPLAY_DAYS }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + (i - DISPLAY_CENTER));
      return d;
    });
  }, [currentDate]);

  const selectedWeekdayIndex = useMemo(() => {
    const dt = displayedDates[selectedDay] || new Date();
    return ((dt.getDay() + 6) % 7);
  }, [displayedDates, selectedDay]);

  const isSelectedDayNoClasses = useMemo(() => {
    const weekdayIdx = selectedWeekdayIndex;
    const row = Array.isArray(teacherTimetable?.[weekdayIdx]) ? teacherTimetable[weekdayIdx] : [];
    if (!row || !row.length) return true;
    const hasTeaching = row.some(slot => slot && slot.status !== 'break' && slot.status !== 'free' && !/lunch/i.test(String(slot.subjectName || '')));
    return !hasTeaching;
  }, [teacherTimetable, selectedWeekdayIndex]);

  // Generate circular progress SVG
  const CircularProgress = ({ progress, size = 73, strokeWidth = 8 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / 100) * circumference;

    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="white"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#0052B4"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-black">{progress}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-white" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}>
      {/* Sidebar (fixed) */}
      <TeacherSidebar currentView={currentView} onNavigate={onNavigate} onLogout={onLogout} />

      {/* Main content */}
      <main className="overflow-hidden" style={{ marginLeft: 'var(--teacher-sidebar-width, 246px)' }}>
        {/* Header */}
        <header className="flex justify-between items-center p-8 pb-4">
          <h1 className="text-6xl font-semibold text-black capitalize">Dashboard</h1>
          
          {/* Date display */}
          <div className="bg-[#D6F0FF] rounded-2xl px-8 py-2 shadow-sm">
            <div className="flex items-center gap-4">
              <span className="text-lg font-medium text-black">Today :</span>
              <span className="text-xl font-medium text-black">
                {new Date().toLocaleDateString('en-US', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Greeting section */}
        <div className="mx-8 mb-8">
          <div className="bg-[#D9D9D9] rounded-2xl h-20 flex items-center px-8 relative">
            <h2 className="text-4xl font-medium text-black capitalize">
              Hello {currentTeacher.name || collegeId || 'Teacher'} !
            </h2>

            {/* Teacher character image */}
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2 w-32 h-20">
              <img
                src="https://api.builder.io/api/v1/image/assets/TEMP/5ec5c90e84d6b1566778e527b19123b8692bdff5?width=260"
                alt="Teacher"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
          </div>
        </div>

        {/* Teacher analytics layout */}
        <div className="px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 w-full max-w-sm lg:max-w-none">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-normal text-[#717182] leading-5 tracking-[-0.15px]" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
                        Classes Completed
                      </span>
                      <span className="text-2xl font-medium text-[#0A0A0A] leading-8 tracking-[0.07px]" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
                        {teacherStats.totalClasses}/{teacherStats.requiredHours || 13}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-[rgba(3,2,19,0.2)] rounded-full h-2 mt-2">
                    <div
                      className="bg-[#030213] h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (teacherStats.totalClasses / (teacherStats.requiredHours || 13)) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {displayedDates.map((dt, i) => {
                  const dayLabel = dt.toLocaleString('default', { weekday: 'short' });
                  const dateNum = dt.getDate();
                  return (
                    <button
                      key={`td-${dt.toISOString()}`}
                      onClick={() => setSelectedDay(i)}
                      className={`flex flex-col items-center justify-center w-16 h-12 rounded-lg transition-all duration-200 ${i === selectedDay ? 'bg-blue-200 bg-opacity-60 shadow-md' : 'bg-gray-200 hover:bg-gray-300'}`}
                    >
                      <span className="text-sm font-medium text-black">{dateNum}</span>
                      <span className="text-sm font-medium text-black uppercase">{dayLabel}</span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-lg font-medium text-black">Timetable for {getWeekdayLabel(selectedWeekdayIndex)}</h3>
                  <p className="text-sm text-gray-500">Your schedule for the day</p>
                </div>
                <div className="p-4 flex-1">
                  <div className="space-y-3">
                    {isSelectedDayNoClasses ? (
                      <div className="text-center text-black py-6">No classes on this day</div>
                    ) : Array.from({ length: Math.min(hoursPerDay, (computedTeacherTimetable[selectedWeekdayIndex] || []).length || hoursPerDay) }, (_, periodIdx) => {
                      const slot = computedTeacherTimetable[selectedWeekdayIndex]?.[periodIdx];
                      const descriptor = slotDescriptors[periodIdx];
                      const label =
                        descriptor?.originalLabel ||
                        (Array.isArray(timeSlots) ? timeSlots[periodIdx] : undefined) ||
                        `${9 + periodIdx}:00-${10 + periodIdx}:00`;
                      const slotType = deriveSlotType(slot, descriptor);
                      const isInterval = slotType === 'break' || slotType === 'lunch';
                      const isBusy = !isInterval && slot && slot.subjectName && slot.subjectName !== 'Free';
                      const intervalText = slot?.subjectName || (slotType === 'lunch' ? 'Lunch' : 'Break');

                      return (
                        <div key={periodIdx} className="flex items-center gap-3">
                          <div className="w-36 shrink-0 text-sm font-medium text-black">{label}</div>
                          {isInterval ? (
                            <div className={`flex-1 h-12 flex items-center justify-center rounded-lg border text-sm font-semibold ${slotType === 'lunch' ? 'bg-[#FFF4E5] border-[#FAD6A5] text-[#B96A00]' : 'bg-[#EAF5FF] border-[#AED6FF] text-[#1B4E96]'}`}>
                              {intervalText}
                            </div>
                          ) : isBusy ? (
                            <div className="flex-1 rounded-2xl p-3 border bg-gray-100 border-gray-300">
                              <div className="text-sm font-medium text-gray-700">{slot.subjectName}</div>
                              <div className="text-xs text-gray-600">{currentTeacher.name} • {slot.className}</div>
                            </div>
                          ) : (
                            <div className="flex-1 h-12 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500">Free Slot</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-black mb-4">Class Progress</h3>
                  {Array.isArray(classProgressData) && classProgressData.length > 0 ? (
                    <div className="space-y-4">
                      {classProgressData.map((item, index) => (
                        <div key={index} className="bg-[#F0F7FF] rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-black mb-1">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.registered} Registered</div>
                          </div>
                          <CircularProgress progress={item.progress} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#F0F7FF] rounded-lg p-4 text-black">No classes assigned. Contact admin.</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Weekly Hours</div>
                      <div className="text-2xl font-medium text-black">{teacherStats.weeklyHours}h</div>
                      <div className="text-xs text-gray-500">Teaching load</div>
                    </div>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M16 8V16L21.3333 18.6667" stroke="#00A63E" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14.9993 29.3337C22.3631 29.3337 28.3327 23.3641 28.3327 16.0003C28.3327 8.63653 22.3631 2.66699 14.9993 2.66699C7.63555 2.66699 1.66602 8.63653 1.66602 16.0003C1.66602 23.3641 7.63555 29.3337 14.9993 29.3337Z" stroke="#00A63E" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Free Hours</div>
                      <div className="text-2xl font-medium text-black">{teacherStats.freeHours}</div>
                      <div className="text-xs" style={{ color: '#3B82F6' }}>Break time</div>
                    </div>
                    <svg width="33" height="32" viewBox="0 0 33 32" fill="none">
                      <path d="M13.584 2.66663V5.33329" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M18.916 2.66663V5.33329" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8.25 2.66663V5.33329" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Total Classes</div>
                      <div className="text-2xl font-medium text-black">{teacherStats.totalClasses}</div>
                      <div className="text-xs text-gray-500">This week</div>
                    </div>
                    <svg width="33" height="32" viewBox="0 0 33 32" fill="none">
                      <path d="M16.25 9.33337V28" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M4.24935 24C3.89573 24 3.55659 23.8595 3.30654 23.6095C3.05649 23.3594 2.91602 23.0203 2.91602 22.6667V5.33333C2.91602 4.97971 3.05649 4.64057 3.30654 4.39052C3.55659 4.14048 3.89573 4 4.24935 4H10.916C12.3305 4 13.6871 4.5619 14.6873 5.5621C15.6874 6.56229 16.2493 7.91885 16.2493 9.33333C16.2493 7.91885 16.8113 6.56229 17.8114 5.5621C18.8116 4.5619 20.1682 4 21.5827 4H28.2493C28.603 4 28.9421 4.14048 29.1922 4.39052C29.4422 4.64057 29.5827 4.97971 29.5827 5.33333V22.6667C29.5827 23.0203 29.4422 23.3594 29.1922 23.6095C28.9421 23.8595 28.603 24 28.2493 24H20.2493C19.1885 24 18.1711 24.4214 17.4209 25.1716C16.6708 25.9217 16.2493 26.9391 16.2493 28C16.2493 26.9391 15.8279 25.1716 15.0778 25.1716C14.3276 24.4214 13.3102 24 12.2493 24H4.24935Z" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Classes Completed</div>
                      <div className="text-2xl font-medium text-black">7/13</div>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div className="bg-black h-2 rounded-full" style={{ width: '54%' }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-lg border border-[#A9A9A9] p-6 shadow-sm flex flex-col">
                <h3 className="text-xl font-bold text-black mb-4">{calendarData.monthTitle}</h3>
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="text-center text-xs text-gray-600 py-2 font-medium">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarData.prevDays.map((dnum) => {
                    const dt = new Date(calendarData.year, calendarData.monthIndex - 1, dnum);
                    return (
                      <div key={`prev-${dnum}`} onClick={() => { setCurrentDate(dt); setSelectedDay(DISPLAY_CENTER); }} className="text-center text-base text-gray-400 py-2 hover:bg-gray-50 rounded cursor-pointer">{dnum}</div>
                    );
                  })}
                  {calendarData.currDays.map((dnum) => {
                    const dt = new Date(calendarData.year, calendarData.monthIndex, dnum);
                    return (
                      <div key={`curr-${dnum}`} onClick={() => { setCurrentDate(dt); setSelectedDay(DISPLAY_CENTER); }} className="text-center text-base text-black py-2 hover:bg-blue-50 rounded cursor-pointer transition-colors">
                        {dnum === calendarData.todayDate ? (
                          <div className="w-6 h-6 mx-auto">
                            <div className="w-6 h-6 border border-red-500 rounded-full flex items-center justify-center">
                              <span className="text-sm">{dnum}</span>
                            </div>
                          </div>
                        ) : (
                          dnum
                        )}
                      </div>
                    );
                  })}
                  {calendarData.nextDays.map((dnum) => {
                    const dt = new Date(calendarData.year, calendarData.monthIndex + 1, dnum);
                    return (
                      <div key={`next-${dnum}`} onClick={() => { setCurrentDate(dt); setSelectedDay(DISPLAY_CENTER); }} className="text-center text-base text-gray-400 py-2 hover:bg-gray-50 rounded cursor-pointer">{dnum}</div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-light text-black mb-6">Courses</h3>
                {Array.isArray(teacherCourses) && teacherCourses.length > 0 ? (
                  <div className="space-y-4">
                    {teacherCourses.map((c, idx) => (
                      <div className="bg-white rounded-2xl shadow-lg p-6" key={`${c.id || c.code || c.name || 'course'}-${c.className || 'class'}-${idx}`}>
                        <div className="text-lg font-medium text-black">{c.name}</div>
                        <div className="text-lg text-black">{c.code}</div>
                        <div className="w-16 h-2 bg-[#595880] rounded-full mt-2"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-lg p-6 text-black">Courses not assigned. Contact admin.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;

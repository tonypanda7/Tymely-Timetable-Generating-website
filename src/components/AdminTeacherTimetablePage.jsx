import { useMemo } from 'react';
import Sidebar from './Sidebar.jsx';

const AdminTeacherTimetablePage = ({
  collegeId,
  onNavigate,
  currentView = 'teacher-timetable',
  role,
  teachers = [],
  generatedTimetables = {},
  workingDays = 6,
  hoursPerDay = 9,
  timeSlots = [],
  classes = [],
  courses = [],
  programs = [],
  onLogout
}) => {
  // Build teacher timetables using the same logic as App.jsx
  const buildTeacherTimetableFor = (teacherId) => {
    const days = workingDays;
    const hours = hoursPerDay;
    const base = Array.from({ length: days }, () => Array.from({ length: hours }, () => null));

    Object.keys(generatedTimetables).forEach((className) => {
      const table = generatedTimetables[className];
      if (!Array.isArray(table)) return;
      table.forEach((daySlots, dayIdx) => {
        daySlots.forEach((slot, periodIdx) => {
          if (slot && slot.teacherId === teacherId) {
            const displayName = resolveElectiveSubjectForTeacher({ 
              classesList: classes, 
              className, 
              originalName: slot.subjectName, 
              status: slot.status, 
              teacherId 
            });
            base[dayIdx][periodIdx] = {
              subjectName: displayName,
              className,
              status: slot.status,
              teacherId: slot.teacherId,
            };
          }
        });
      });
    });

    return base;
  };

  // Helper function to resolve elective subjects for teachers
  const resolveElectiveSubjectForTeacher = ({ classesList, className, originalName, status, teacherId }) => {
    if (!originalName || !className || status !== 'confirmed') return originalName;
    
    const cls = Array.isArray(classesList) ? classesList.find(c => c && c.name === className) : null;
    if (!cls || !Array.isArray(cls.subjects)) return originalName;
    
    const electiveSubject = cls.subjects.find(s => 
      s && s.courseType === 'elective' && s.name === originalName
    );
    
    if (!electiveSubject || !Array.isArray(electiveSubject.electiveOptionsDetailed)) {
      return originalName;
    }
    
    const teacherOption = electiveSubject.electiveOptionsDetailed.find(opt => 
      opt && Array.isArray(opt.teachers) && opt.teachers.includes(teacherId)
    );
    
    return teacherOption ? teacherOption.name : originalName;
  };

  // Days labels
  const daysLabels = useMemo(() => {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].slice(0, Math.min(6, Number(workingDays || 6)));
  }, [workingDays]);

  // Time slots
  const defaultTimeSlots = ['9:00-10:00', '10:00-11:00', '11:00-12:00', '12:00-1:00', '1:00-2:00', '2:00-3:00'];
  
  const periodCount = useMemo(() => {
    if (Array.isArray(timeSlots) && timeSlots.length) return Math.min(timeSlots.length, Number(hoursPerDay || timeSlots.length));
    if (Number.isFinite(Number(hoursPerDay))) return Number(hoursPerDay);
    return defaultTimeSlots.length;
  }, [timeSlots, hoursPerDay]);

  const renderTimeSlots = useMemo(() => {
    if (Array.isArray(timeSlots) && timeSlots.length) return timeSlots.slice(0, periodCount);
    const slots = [];
    for (let i = 0; i < periodCount; i++) {
      slots.push(defaultTimeSlots[i] || `${9 + i}:00-${10 + i}:00`);
    }
    return slots;
  }, [timeSlots, periodCount]);

  return (
    <div className="admin-layout">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        role={role}
        collegeId={collegeId}
        onLogout={onLogout}
      />
      
      <main className="main-content">
        <div className="teacher-timetable-container">
          <div className="page-header">
            <h1 className="page-title">Teacher Timetables</h1>
          </div>

          <div className="teachers-list">
            {teachers.length === 0 ? (
              <div className="no-teachers">
                <p>No teachers available. Please upload teacher data first.</p>
              </div>
            ) : (
              teachers.map((teacher) => {
                const teacherTimetable = buildTeacherTimetableFor(teacher.id);
                
                return (
                  <div key={teacher.id} className="teacher-section">
                    {/* Teacher Header */}
                    <div className="teacher-header">
                      <h2 className="teacher-name">{teacher.name}</h2>
                      <span className="teacher-id">ID: {teacher.id}</span>
                    </div>

                    {/* Timetable Card */}
                    <div className="timetable-card">
                      <div className="card-header">
                        <div className="card-title-container">
                          <svg className="card-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 5.83331V17.5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2.49935 15C2.27834 15 2.06637 14.9122 1.91009 14.7559C1.75381 14.5996 1.66602 14.3877 1.66602 14.1667V3.33333C1.66602 3.11232 1.75381 2.90036 1.91009 2.74408C2.06637 2.5878 2.27834 2.5 2.49935 2.5H6.66602C7.55007 2.5 8.39792 2.85119 9.02304 3.47631C9.64816 4.10143 9.99935 4.94928 9.99935 5.83333C9.99935 4.94928 10.3505 4.10143 10.9757 3.47631C11.6008 2.85119 12.4486 2.5 13.3327 2.5H17.4993C17.7204 2.5 17.9323 2.5878 18.0886 2.74408C18.2449 2.90036 18.3327 3.11232 18.3327 3.33333V14.1667C18.3327 14.3877 18.2449 14.5996 18.0886 14.7559C17.9323 14.9122 17.7204 15 17.4993 15H12.4993C11.8363 15 11.2004 15.2634 10.7316 15.7322C10.2627 16.2011 9.99935 16.837 9.99935 17.5C9.99935 16.837 9.73596 16.2011 9.26712 15.7322C8.79828 15.2634 8.16239 15 7.49935 15H2.49935Z" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <span className="card-title">Weekly Timetable</span>
                        </div>
                      </div>

                      {/* Table */}
                      <div className="table-container">
                        <table className="timetable-table">
                          {/* Table Header */}
                          <thead>
                            <tr className="table-header-row">
                              <th className="time-header-cell">
                                <span className="header-text">Time</span>
                              </th>
                              {daysLabels.map((day, index) => (
                                <th key={index} className="day-header-cell">
                                  <span className="header-text">{day}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>

                          {/* Table Body */}
                          <tbody>
                            {Array.from({ length: periodCount }, (_, rowIndex) => (
                              <tr key={rowIndex} className="table-row">
                                {/* Time Column */}
                                <td className="time-cell">
                                  <span className="time-text">
                                    {renderTimeSlots[rowIndex] || `${9 + rowIndex}:00-${10 + rowIndex}:00`}
                                  </span>
                                </td>

                                {/* Day Columns */}
                                {daysLabels.map((_, dayIdx) => {
                                  const headerLabel = renderTimeSlots[rowIndex] || '';
                                  const isHeaderLunch = /(\(LUNCH\))/i.test(String(headerLabel)) || /lunch/i.test(String(headerLabel));
                                  const isHeaderBreak = /^\s*break\s*$/i.test(String(headerLabel));
                                  if (isHeaderLunch || isHeaderBreak) {
                                    return (
                                      <td key={dayIdx} className="table-cell">
                                        <div className="free-slot">
                                          <span className="interval-badge">{isHeaderLunch ? 'Lunch' : 'Break'}</span>
                                        </div>
                                      </td>
                                    );
                                  }

                                  const slot = teacherTimetable?.[dayIdx]?.[rowIndex];
                                  const subj = String(slot?.subjectName || '');
                                  const isFree = !slot || slot.status === 'free' || subj === 'Free';

                                  if (isFree) {
                                    return (
                                      <td key={dayIdx} className="table-cell">
                                        <div className="free-slot">
                                          <span className="free-text">Free</span>
                                        </div>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={dayIdx} className="table-cell">
                                      <div className="subject-slot">
                                        <div className="subject-name">{slot.subjectName}</div>
                                        <div className="class-name">{slot.className}</div>
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
                );
              })
            )}
          </div>
        </div>
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
          background: #fff;
        }

        .teacher-timetable-container {
          padding: 2rem;
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-title {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 2rem;
          font-weight: 600;
          color: #0A0A0A;
          margin: 0;
        }

        .teachers-list {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .no-teachers {
          text-align: center;
          padding: 3rem;
          color: #717182;
          font-size: 1.125rem;
        }

        .teacher-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .teacher-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .teacher-name {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #0A0A0A;
          margin: 0;
        }

        .teacher-id {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 400;
          color: #717182;
          background: #F3F3F5;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
        }

        .timetable-card {
          display: flex;
          flex-direction: column;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.10);
          background: #FFF;
          overflow: hidden;
        }

        .card-header {
          display: flex;
          align-items: center;
          padding: 1.5rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.10);
        }

        .card-title-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-icon {
          flex-shrink: 0;
        }

        .card-title {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 400;
          color: #0A0A0A;
          line-height: 1;
          letter-spacing: -0.312px;
        }

        .table-container {
          overflow-x: auto;
        }

        .timetable-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
        }

        .table-header-row {
          height: 37px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.10);
        }

        .time-header-cell {
          width: 116px;
          padding: 8.5px 8px;
          text-align: left;
          background: rgba(236, 236, 240, 0.30);
        }

        .day-header-cell {
          width: 146px;
          padding: 8.5px 8px;
          text-align: left;
        }

        .header-text {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #0A0A0A;
          line-height: 20px;
          letter-spacing: -0.15px;
        }

        .table-row {
          border-bottom: 1px solid rgba(0, 0, 0, 0.10);
        }

        .time-cell {
          padding: 19px 8px 18px 8px;
          background: rgba(236, 236, 240, 0.30);
        }

        .time-text {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #0A0A0A;
          line-height: 20px;
          letter-spacing: -0.15px;
        }

        .table-cell {
          padding: 8.5px 8px;
          vertical-align: middle;
        }

        .free-slot {
          display: flex;
          width: 100%;
          height: 40px;
          align-items: center;
          justify-content: center;
        }

        .free-text {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: #717182;
          line-height: 16px;
          text-align: center;
        }
        .interval-badge {
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 600;
          background: #2563EB;
          color: #FFFFFF;
          line-height: 16px;
        }

        .subject-slot {
          display: flex;
          width: 100%;
          min-height: 48px;
          padding: 8px;
          flex-direction: column;
          align-items: flex-start;
          border-radius: 4px;
          background: #DCFCE7;
        }

        .subject-name {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 500;
          color: #016630;
          line-height: 16px;
          margin-bottom: 2px;
        }

        .class-name {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 12px;
          font-weight: 400;
          color: #016630;
          line-height: 16px;
          opacity: 0.75;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .main-content {
            margin-left: 0;
          }
        }

        @media (max-width: 768px) {
          .teacher-timetable-container {
            padding: 1rem;
          }

          .teacher-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .teacher-name {
            font-size: 1.25rem;
          }

          .time-header-cell,
          .day-header-cell {
            width: auto;
            min-width: 80px;
          }

          .card-header {
            padding: 1rem;
          }

          .card-title {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 480px) {
          .teacher-name {
            font-size: 1.125rem;
          }

          .page-title {
            font-size: 1.5rem;
          }

          .time-header-cell,
          .day-header-cell {
            min-width: 70px;
            padding: 4px;
          }

          .header-text,
          .time-text {
            font-size: 12px;
          }

          .subject-name,
          .class-name {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminTeacherTimetablePage;

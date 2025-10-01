import { useMemo } from 'react';
import Sidebar from './Sidebar.jsx';

const AdminStudentTimetablePage = ({
  collegeId,
  onNavigate,
  currentView = 'student-timetable',
  role,
  classes = [],
  generatedTimetables = {},
  workingDays = 6,
  hoursPerDay = 7,
  timeSlots = [],
  breakSlots = [],
  teachers = []
}) => {
  // Days labels
  const daysLabels = useMemo(() => {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].slice(0, Math.min(6, Number(workingDays || 6)));
  }, [workingDays]);

  // Time slots
  const defaultTimeSlots = [
    '9:00-10:00',
    '10:00-11:00', 
    '11:00-12:00',
    '12:00-1:00',
    '1:00-2:00',
    '2:00-3:00',
    '2:00-3:00'
  ];
  
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

  // Calculate total credits for a class
  const calculateTotalCredits = (classData) => {
    if (!classData || !Array.isArray(classData.subjects)) return 0;
    return classData.subjects.reduce((total, subject) => {
      return total + (Number(subject.credits) || 0);
    }, 0);
  };

  // Get cell content for timetable
  const getCellContent = (className, dayIdx, periodIdx) => {
    const timetable = generatedTimetables[className];
    if (!Array.isArray(timetable) || !timetable[dayIdx] || !timetable[dayIdx][periodIdx]) {
      return { subjectName: 'Free', className: '', status: 'free' };
    }

    const slot = timetable[dayIdx][periodIdx];
    if (!slot) {
      return { subjectName: 'Free', className: '', status: 'free' };
    }

    // Handle breaks
    if (slot.status === 'break' || (breakSlots && breakSlots.includes(periodIdx))) {
      return { subjectName: 'Break', className: '', status: 'break' };
    }

    // Handle free periods
    if (slot.status === 'free' || slot.subjectName === 'Free') {
      return { subjectName: 'Free', className: '', status: 'free' };
    }

    // Find teacher and classroom info
    const teacher = teachers.find(t => t.id === slot.teacherId);
    const classroomInfo = slot.classroom || `Classroom ${String.fromCharCode(65 + dayIdx)}-${100 + periodIdx + 1}`;

    return {
      subjectName: slot.subjectName || 'Subject',
      className: classroomInfo,
      status: slot.status || 'confirmed',
      teacherName: teacher?.name || ''
    };
  };

  return (
    <div className="admin-layout">
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        role={role}
        collegeId={collegeId}
      />
      
      <main className="main-content">
        <div className="student-timetable-container">
          <div className="page-header">
            <h1 className="page-title">Student Timetables</h1>
          </div>

          <div className="classes-list">
            {classes.length === 0 ? (
              <div className="no-classes">
                <p>No classes available. Please upload student data first.</p>
              </div>
            ) : (
              classes.map((classData) => {
                const totalCredits = calculateTotalCredits(classData);
                const timetableExists = generatedTimetables[classData.name];
                
                return (
                  <div key={classData.name} className="class-section">
                    {/* Class Header */}
                    <div className="class-header">
                      <h2 className="class-name">{classData.name}</h2>
                      <span className="total-credits">{totalCredits} Credits</span>
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

                      {!timetableExists ? (
                        <div className="no-timetable">
                          <p>No timetable generated for this class yet.</p>
                        </div>
                      ) : (
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
                              {Array.from({ length: periodCount }, (_, periodIdx) => (
                                <tr key={periodIdx} className="table-row">
                                  {/* Time Column */}
                                  <td className="time-cell">
                                    <span className="time-text">
                                      {renderTimeSlots[periodIdx] || `${9 + periodIdx}:00-${10 + periodIdx}:00`}
                                    </span>
                                  </td>

                                  {/* Day Columns */}
                                  {daysLabels.map((_, dayIdx) => {
                                    const cellData = getCellContent(classData.name, dayIdx, periodIdx);

                                    if (cellData.status === 'free') {
                                      return (
                                        <td key={dayIdx} className="table-cell">
                                          <div className="free-slot">
                                            <span className="free-text">Free</span>
                                          </div>
                                        </td>
                                      );
                                    }

                                    if (cellData.status === 'break') {
                                      return (
                                        <td key={dayIdx} className="table-cell">
                                          <div className="free-slot">
                                            <span className="free-text">Break</span>
                                          </div>
                                        </td>
                                      );
                                    }

                                    return (
                                      <td key={dayIdx} className="table-cell">
                                        <div className="subject-slot">
                                          <div className="subject-name">{cellData.subjectName}</div>
                                          <div className="class-location">{cellData.className}</div>
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
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

        .student-timetable-container {
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

        .classes-list {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .no-classes {
          text-align: center;
          padding: 3rem;
          color: #717182;
          font-size: 1.125rem;
        }

        .class-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .class-header {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .class-name {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #0A0A0A;
          margin: 0;
        }

        .total-credits {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 1rem;
          font-weight: 500;
          color: #00A63E;
          background: #DCFCE7;
          padding: 0.5rem 1rem;
          border-radius: 8px;
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

        .no-timetable {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 200px;
          color: #717182;
          font-size: 1rem;
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

        .class-location {
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

          .student-timetable-container {
            padding: 1rem;
          }

          .class-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .class-name {
            font-size: 1.25rem;
          }

          .card-header {
            padding: 1rem;
          }

          .card-title {
            font-size: 0.875rem;
          }
        }

        @media (max-width: 768px) {
          .student-timetable-container {
            padding: 1rem;
          }

          .class-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .class-name {
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
          .class-name {
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
          .class-location {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminStudentTimetablePage;

import { useState, useMemo } from 'react';

import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const StudentTimetable = ({
  onLogout,
  onNavigate,
  currentView = 'timetable',
  studentClass,
  generatedTimetables = {},
  workingDays = 6,
  hoursPerDay = 7,
  timeSlots = [],
  classes = [],
  teachers = [],
  selectedElectivesMap = {},
  electiveGroups = [],
  saveStudentElective,
}) => {
  const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Default time slots
  const defaultTimeSlots = [
    '9:00-10:00',
    '10:00-11:00', 
    '11:00-12:00',
    '12:00-1:00',
    '1:00-2:00',
    '2:00-3:00'
  ];

  // Get the student's timetable
  const studentTimetable = useMemo(() => {
    if (!studentClass || !generatedTimetables[studentClass]) return [];
    return generatedTimetables[studentClass];
  }, [studentClass, generatedTimetables]);

  // Determine how many periods to render
  const periodCount = useMemo(() => {
    if (Array.isArray(timeSlots) && timeSlots.length) return timeSlots.length;
    if (Number.isFinite(Number(hoursPerDay))) return Number(hoursPerDay);
    if (Array.isArray(studentTimetable) && studentTimetable.length) {
      return studentTimetable.reduce((m, day) => Math.max(m, Array.isArray(day) ? day.length : 0), 0);
    }
    return defaultTimeSlots.length;
  }, [timeSlots, hoursPerDay, studentTimetable]);

  // Build the time slots to display
  const renderTimeSlots = useMemo(() => {
    if (Array.isArray(timeSlots) && timeSlots.length) return timeSlots.slice(0, periodCount);
    const slots = [];
    for (let i = 0; i < periodCount; i++) {
      if (defaultTimeSlots[i]) slots.push(defaultTimeSlots[i]);
      else slots.push(`${9 + i}:00-${10 + i}:00`);
    }
    return slots;
  }, [timeSlots, periodCount]);

  // Column widths for table-fixed layout
  const timeColWidth = '20%';
  const dayColWidth = `${(80 / Math.max(1, workingDays)).toFixed(2)}%`;

  // Calculate statistics (same logic as student dashboard)
  const { completedClasses, totalClasses, freeHours } = useMemo(() => {
    let completed = 0;
    let total = 0;
    let free = 0;

    if (Array.isArray(studentTimetable)) {
      const days = Math.min(Number(workingDays || 0), studentTimetable.length);
      for (let d = 0; d < days; d++) {
        const day = Array.isArray(studentTimetable[d]) ? studentTimetable[d] : [];
        const periods = Math.min(Number(hoursPerDay || 0), day.length);
        for (let p = 0; p < periods; p++) {
          const slot = day[p];
          const subj = String(slot?.subjectName || '');
          const isBreakOrLunch = slot && (slot.status === 'break' || /lunch/i.test(subj));
          if (isBreakOrLunch) continue;
          if (!slot || slot.status === 'free' || subj === 'Free') {
            free++;
          } else {
            total++;
            // Keep a lightweight completion heuristic (not shown elsewhere)
            if ((d + p) % 2 === 0) completed++;
          }
        }
      }
    }

    return { completedClasses: completed, totalClasses: total, freeHours: free };
  }, [studentTimetable, workingDays, hoursPerDay]);

  // Format time slots
  const formatTimeSlot = (periodIndex) => {
    if (timeSlots && timeSlots[periodIndex]) {
      return timeSlots[periodIndex];
    }
    return defaultTimeSlots[periodIndex] || `${9 + periodIndex}:00-${10 + periodIndex}:00`;
  };

  // Get cell content for a specific day and period (actual data only)
  const getCellContent = (dayIdx, periodIdx) => {
    const day = Array.isArray(studentTimetable?.[dayIdx]) ? studentTimetable[dayIdx] : [];
    const slot = day?.[periodIdx];

    if (!slot) return { subjectName: 'Free', className: '', status: 'free', bgColor: '#F5F5F5', textColor: '#717182' };

    const subj = String(slot.subjectName || '');
    if (slot.status === 'break' || /break|lunch/i.test(subj)) {
      return { subjectName: /lunch/i.test(subj) ? 'Lunch' : 'Break', className: '', status: 'break', bgColor: '#3B82F6', textColor: '#FFFFFF' };
    }

    if (slot.status === 'free' || subj === 'Free') {
      return { subjectName: 'Free', className: '', status: 'free', bgColor: '#F5F5F5', textColor: '#717182' };
    }

    // Handle electives using selectedElectivesMap
    if (slot.status === 'elective') {
      const selections = selectedElectivesMap || {};
      const allSelected = Object.values(selections).flatMap(v => Array.isArray(v) ? v : (v ? [v] : []));

      if (allSelected.length > 0) {
        // Display each selected elective with "(elective)" suffix
        const electiveNames = allSelected.map(name => `${name} (elective)`).join(', ');
        return {
          subjectName: electiveNames,
          className: slot.className || '',
          status: 'confirmed',
          bgColor: '#DCFCE7',
          textColor: '#016630'
        };
      } else {
        // No selection made yet
        return {
          subjectName: 'Elective (Not Selected)',
          className: '',
          status: 'elective',
          bgColor: '#FEF3C7',
          textColor: '#92400E'
        };
      }
    }

    return {
      subjectName: slot.subjectName || 'Subject',
      className: slot.className || '',
      status: slot.status || 'confirmed',
      bgColor: '#DCFCE7',
      textColor: '#016630'
    };
  };

  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 72 : 220; // match Dashboard student sidebar widths

  // Helpers to align cells with header when lunch is present in timeSlots
  const isLunchHeaderAt = (idx) => /\(LUNCH\)/i.test(String(renderTimeSlots[idx] || ''));
  const lunchCountBefore = (idx) => {
    let c = 0; for (let i = 0; i < idx; i++) { if (isLunchHeaderAt(i)) c++; } return c;
  };
  const toDataIndex = (headerIdx) => headerIdx - lunchCountBefore(headerIdx);

  // Build export matrix (header + rows)
  const buildExportMatrix = () => {
    const header = ['Time', ...WEEKDAY_LABELS.slice(0, Math.min(workingDays, WEEKDAY_LABELS.length))];
    const rows = Array.from({ length: periodCount }, (_, periodIdx) => {
      const timeSlot = renderTimeSlots[periodIdx] || `${9 + periodIdx}:00-${10 + periodIdx}:00`;
      const cols = [timeSlot];
      const lunchHeader = isLunchHeaderAt(periodIdx);
      for (let dayIdx = 0; dayIdx < Math.min(workingDays, WEEKDAY_LABELS.length); dayIdx++) {
        if (lunchHeader) {
          cols.push('Lunch');
          continue;
        }
        const effIdx = toDataIndex(periodIdx);
        const cellData = getCellContent(dayIdx, effIdx);
        let val = 'Free';
        if (cellData.status === 'break') val = cellData.subjectName || 'Break';
        else if (cellData.status !== 'free') val = cellData.className ? `${cellData.subjectName} — ${cellData.className}` : `${cellData.subjectName}`;
        cols.push(val);
      }
      return cols;
    });
    return [header, ...rows];
  };

  const downloadAsExcel = () => {
    const data = buildExportMatrix();
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Set column widths
    const colWidths = data[0].map((h, i) => ({ wch: i === 0 ? 14 : 22 }));
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timetable');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const filename = `${(studentClass || 'class').toString().replace(/\W+/g,'_')}_timetable.xlsx`;
    saveAs(new Blob([out], { type: 'application/octet-stream' }), filename);
  };

  const downloadAsText = () => {
    const data = buildExportMatrix();
    if (!data || !data.length) return;
    const cols = data[0].length;
    const colWidths = Array(cols).fill(0);
    data.forEach(row => {
      for (let i = 0; i < cols; i++) {
        const s = String(row[i] == null ? '' : row[i]);
        colWidths[i] = Math.max(colWidths[i], s.length);
      }
    });

    const lines = data.map(row => {
      return row.map((cell, i) => {
        const s = String(cell == null ? '' : cell);
        return s + ' '.repeat(colWidths[i] - s.length);
      }).join(' | ');
    }).join('\n');

    const filename = `${(studentClass || 'class').toString().replace(/\W+/g,'_')}_timetable.txt`;
    saveAs(new Blob([lines], { type: 'text/plain;charset=utf-8' }), filename);
  };

  const downloadAsPDF = () => {
    const data = buildExportMatrix();
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    const title = `${studentClass || 'Class'} — Weekly Timetable`;
    doc.text(title, margin, margin);

    // Table setup
    const startY = margin + 20;
    const cols = data[0].length;
    const colWidths = Array.from({ length: cols }, (_, i) => (i === 0 ? 90 : Math.floor((pageWidth - margin * 2 - 90) / (cols - 1))));
    const lineHeight = 16;

    let y = startY;

    // Header row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    let x = margin;
    for (let c = 0; c < cols; c++) {
      const text = String(data[0][c] || '');
      // header background
      doc.setFillColor(236, 236, 240);
      doc.rect(x, y, colWidths[c], lineHeight + 6, 'F');
      doc.setTextColor(10, 10, 10);
      doc.text(text, x + 6, y + lineHeight);
      x += colWidths[c];
    }
    y += lineHeight + 6;

    // Body rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    for (let r = 1; r < data.length; r++) {
      // compute row height based on wrapped text
      const wrappedByCol = [];
      let rowHeight = lineHeight + 6;
      for (let c = 0; c < cols; c++) {
        const cellText = String(data[r][c] == null ? '' : data[r][c]);
        const maxWidth = colWidths[c] - 12;
        const lines = doc.splitTextToSize(cellText, Math.max(20, maxWidth));
        wrappedByCol.push(lines);
        rowHeight = Math.max(rowHeight, lines.length * 12 + 8);
      }

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      let cx = margin;
      for (let c = 0; c < cols; c++) {
        doc.setDrawColor(220);
        doc.rect(cx, y, colWidths[c], rowHeight);
        const lines = wrappedByCol[c];
        let ty = y + 14;
        lines.forEach((ln) => {
          doc.text(String(ln), cx + 6, ty, { maxWidth: colWidths[c] - 12 });
          ty += 12;
        });
        cx += colWidths[c];
      }
      y += rowHeight;
    }

    const filename = `${(studentClass || 'class').toString().replace(/\W+/g,'_')}_timetable.pdf`;
    doc.save(filename);
  };

  return (
    <div className="w-full min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className="fixed left-0 top-6 bottom-6 flex flex-col shadow-lg overflow-hidden"
        style={{ background: '#E1F3FF', borderRadius: '0 50px 50px 0', width: `${sidebarWidth}px`, zIndex: 40 }}
      >
        {/* Hamburger Menu */}
        <button
          aria-label="Toggle sidebar"
          onClick={() => setCollapsed((v) => !v)}
          className="absolute top-6 left-2"
        >
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 22.6666H28M4 16H28M4 9.33331H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>

        {/* Navigation */}
        <nav className={`${collapsed ? 'items-center px-0' : 'px-8'} flex flex-col gap-9 mt-40`}>
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
              currentView === 'dashboard' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
            style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 8.46475H4.02559M4.02559 8.46475H27.9745M4.02559 8.46475C4 8.88323 4 9.39909 4 10.0624V22.8412C4 24.3322 4 25.0767 4.29065 25.6462C4.54631 26.1471 4.95396 26.5555 5.45573 26.8107C6.02561 27.1006 6.77201 27.1006 8.26259 27.1006L23.7375 27.1006C25.228 27.1006 25.9733 27.1006 26.5432 26.8107C27.045 26.5555 27.454 26.1471 27.7096 25.6462C28 25.0772 28 24.3332 28 22.845L28 10.058C28 9.39682 28 8.88231 27.9745 8.46475M4.02559 8.46475C4.05752 7.94253 4.1293 7.57196 4.29065 7.25581C4.54631 6.75488 4.95396 6.3479 5.45573 6.09266C6.02616 5.80249 6.77345 5.80249 8.26693 5.80249H23.7336C25.2271 5.80249 25.9728 5.80249 26.5432 6.09266C27.045 6.3479 27.454 6.75488 27.7096 7.25581C27.871 7.57196 27.9427 7.94253 27.9745 8.46475M27.9745 8.46475H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && <span>Dashboard</span>}
          </button>

          <button
            onClick={() => onNavigate('timetable')}
            className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
              currentView === 'timetable' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
            style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.666 24C22.666 24.7364 23.263 25.3334 23.9993 25.3334C24.7357 25.3334 25.3327 24.7364 25.3327 24C25.3327 23.2636 24.7357 22.6667 23.9993 22.6667C23.263 22.6667 22.666 23.2636 22.666 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 24C14.666 24.7364 15.263 25.3334 15.9993 25.3334C16.7357 25.3334 17.3327 24.7364 17.3327 24C17.3327 23.2636 16.7357 22.6667 15.9993 22.6667C15.263 22.6667 14.666 23.2636 14.666 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 24C6.66602 24.7364 7.26297 25.3334 7.99935 25.3334C8.73573 25.3334 9.33268 24.7364 9.33268 24C9.33268 23.2636 8.73573 22.6667 7.99935 22.6667C7.26297 22.6667 6.66602 23.2636 6.66602 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 16C22.666 16.7364 23.263 17.3334 23.9993 17.3334C24.7357 17.3334 25.3327 16.7364 25.3327 16C25.3327 15.2636 24.7357 14.6667 23.9993 14.6667C23.263 14.6667 22.666 15.2636 22.666 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 16C14.666 16.7364 15.263 17.3334 15.9993 17.3334C16.7357 17.3334 17.3327 16.7364 17.3327 16C17.3327 15.2636 16.7357 14.6667 15.9993 14.6667C15.263 14.6667 14.666 15.2636 14.666 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 16C6.66602 16.7364 7.26297 17.3334 7.99935 17.3334C8.73573 17.3334 9.33268 16.7364 9.33268 16C9.33268 15.2636 8.73573 14.6667 7.99935 14.6667C7.26297 14.6667 6.66602 15.2636 6.66602 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 8.00002C22.666 8.7364 23.263 9.33335 23.9993 9.33335C24.7357 9.33335 25.3327 8.7364 25.3327 8.00002C25.3327 7.26364 24.7357 6.66669 23.9993 6.66669C23.263 6.66669 22.666 7.26364 22.666 8.00002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 8.00002C14.666 8.7364 15.263 9.33335 15.9993 9.33335C16.7357 9.33335 17.3327 8.7364 17.3327 8.00002C17.3327 7.26364 16.7357 6.66669 15.9993 6.66669C15.263 6.66669 14.666 7.26364 14.666 8.00002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 8.00002C6.66602 8.7364 7.26297 9.33335 7.99935 9.33335C8.73573 9.33335 9.33268 8.7364 9.33268 8.00002C9.33268 7.26364 8.73573 6.66669 7.99935 6.66669C7.26297 6.66669 6.66602 7.26364 6.66602 8.00002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && <span>Timetable</span>}
          </button>

          <button
            onClick={() => onNavigate('notification')}
            className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
              currentView === 'notification' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
            style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
          >
            <svg width="35" height="32" viewBox="0 0 35 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.8757 22.6666V24C21.8757 26.2091 19.9169 28 17.5007 28C15.0844 28 13.1257 26.2091 13.1257 24V22.6666M21.8757 22.6666H13.1257M21.8757 22.6666H27.1118C27.6696 22.6666 27.9499 22.6666 28.1758 22.597C28.6073 22.4639 28.9449 22.1542 29.0904 21.7597C29.1669 21.5524 29.1669 21.2953 29.1669 20.7812C29.1669 20.5563 29.1666 20.4438 29.1474 20.3366C29.111 20.1339 29.025 19.9418 28.894 19.7749C28.8247 19.6868 28.7367 19.6063 28.5633 19.4478L27.9952 18.9284C27.812 18.7608 27.709 18.5335 27.709 18.2965V13.3333C27.709 8.17865 23.1386 3.99997 17.5007 3.99998C11.8628 3.99999 7.29232 8.17866 7.29232 13.3333V18.2966C7.29232 18.5335 7.18913 18.7608 7.00585 18.9284L6.43783 19.4477C6.26386 19.6068 6.17675 19.6867 6.10742 19.775C5.9764 19.9418 5.88961 20.1339 5.85323 20.3366C5.83398 20.4438 5.83398 20.5563 5.83398 20.7813C5.83398 21.2953 5.83398 21.5523 5.91048 21.7596C6.05602 22.1541 6.39515 22.4639 6.82662 22.597C7.05251 22.6666 7.33171 22.6666 7.88959 22.6666H13.1257M26.2777 2.68488C28.2891 4.07063 29.8736 5.909 30.8771 8.02096M8.72435 2.68488C6.713 4.07063 5.12844 5.909 4.125 8.02096" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && <span>Notification</span>}
          </button>
        </nav>

        {/* Bottom user section */}
        <div className={`${collapsed ? 'px-0 items-center' : 'px-8'} mt-auto mb-8 flex flex-col gap-4`}>
          <button className="hidden" aria-hidden="true">
            <svg width="24" height="19" viewBox="0 0 24 19" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.3499 7.06399L19.9837 6.9027C19.9269 6.87766 19.8989 6.86509 19.8714 6.85206C19.5983 6.72256 19.3682 6.54363 19.2002 6.32956C19.1833 6.30802 19.1674 6.28543 19.1348 6.24078C19.1023 6.1962 19.0858 6.1736 19.0706 6.15124C18.92 5.92852 18.8385 5.68033 18.8336 5.42772C18.8331 5.40232 18.8332 5.37637 18.8343 5.32479L18.8415 4.98812C18.8529 4.44937 18.8587 4.17916 18.763 3.93666C18.6781 3.72126 18.536 3.52286 18.3462 3.35449C18.1317 3.16417 17.8347 3.0284 17.2402 2.75719L16.7464 2.53191C16.1536 2.26146 15.8571 2.12619 15.5423 2.07462C15.2639 2.02899 14.9765 2.03111 14.6991 2.08041C14.3859 2.13606 14.0931 2.27486 13.5079 2.5523L13.5045 2.55356L13.1507 2.72128C13.0948 2.7478 13.0665 2.76117 13.0384 2.77351C12.7601 2.896 12.4495 2.96373 12.1312 2.97181C12.0992 2.97263 12.0665 2.97263 12.0013 2.97263C11.9365 2.97263 11.9024 2.97263 11.8704 2.97181C11.5515 2.96369 11.2402 2.8956 10.9615 2.7726C10.9334 2.76021 10.9056 2.74673 10.8496 2.72009L10.4935 2.55085C9.90422 2.27079 9.60915 2.13054 9.29427 2.07462C9.0157 2.02514 8.72737 2.02377 8.44791 2.06998C8.13236 2.12215 7.83577 2.25843 7.24258 2.53098L7.23994 2.53191L6.75228 2.75598L6.74688 2.75859C6.15904 3.02869 5.86441 3.16407 5.6517 3.35361C5.46294 3.52181 5.32185 3.71989 5.2374 3.93472C5.14194 4.17755 5.14703 4.44834 5.15853 4.98963L5.16568 5.32582C5.16676 5.37673 5.16864 5.40203 5.16817 5.42707C5.16343 5.6802 5.08086 5.9289 4.92974 6.15201C4.9148 6.17407 4.8987 6.19614 4.86654 6.24021C4.83436 6.28432 4.81877 6.30625 4.80209 6.32753C4.63336 6.54275 4.40214 6.72272 4.12733 6.85245C4.10015 6.86528 4.0715 6.87762 4.01521 6.90231L3.65365 7.06094C3.05208 7.32486 2.75137 7.45693 2.53256 7.64488C2.33898 7.81116 2.19275 8.00838 2.10349 8.22318C2.00259 8.46598 2.00267 8.73824 2.00424 9.28273L2.00551 9.72774C2.00706 10.2686 2.00919 10.5388 2.11032 10.78C2.19979 10.9933 2.34495 11.1894 2.53744 11.3547C2.75502 11.5415 3.05274 11.6727 3.64974 11.9357L4.00808 12.0935C4.06907 12.1203 4.09976 12.1336 4.12917 12.1476C4.40148 12.2774 4.63089 12.4569 4.79818 12.6709C4.81625 12.694 4.8336 12.718 4.8683 12.766C4.90256 12.8134 4.92009 12.8371 4.93594 12.8608C5.08261 13.0807 5.16114 13.3249 5.16649 13.5735C5.16707 13.6004 5.16658 13.6275 5.16541 13.6821L5.15853 14.0047C5.14695 14.5479 5.1419 14.8198 5.23792 15.0633C5.32287 15.2787 5.46484 15.4771 5.65463 15.6454C5.86915 15.8358 6.16655 15.9714 6.76107 16.2427L7.25478 16.4679C7.84763 16.7384 8.14395 16.8735 8.45869 16.925C8.73714 16.9707 9.02464 16.9689 9.30209 16.9196C9.61567 16.8638 9.90948 16.7246 10.4964 16.4463L10.8502 16.2786C10.9062 16.2521 10.9346 16.2388 10.9626 16.2264C11.2409 16.1039 11.5512 16.0359 11.8695 16.0278C11.9015 16.027 11.9342 16.027 11.9994 16.027C12.0648 16.027 12.0974 16.027 12.1295 16.0278C12.4484 16.0359 12.7607 16.1042 13.0394 16.2272C13.0639 16.238 13.0885 16.2497 13.1316 16.2702L13.5078 16.449C14.0971 16.7291 14.3916 16.8689 14.7065 16.9249C14.985 16.9744 15.2736 16.9764 15.5531 16.9302C15.8685 16.878 16.1657 16.7414 16.7586 16.469L17.2536 16.2416C17.8418 15.9713 18.1367 15.8358 18.3495 15.6462C18.5383 15.478 18.6796 15.28 18.764 15.0652C18.8588 14.8241 18.8531 14.5554 18.8417 14.0219L18.8343 13.674C18.8332 13.6231 18.8331 13.5978 18.8336 13.5727C18.8383 13.3196 18.9195 13.0707 19.0706 12.8476C19.0856 12.8256 19.1018 12.8033 19.1338 12.7594C19.166 12.7153 19.1827 12.6933 19.1994 12.672C19.3681 12.4568 19.5995 12.2767 19.8744 12.147C19.9012 12.1343 19.9289 12.1222 19.9838 12.0981L19.9857 12.0974L20.3472 11.9388C20.9488 11.6748 21.2501 11.5426 21.4689 11.3547C21.6625 11.1884 21.8085 10.9914 21.8978 10.7766C21.9981 10.5353 21.9973 10.2646 21.9958 9.72647L21.9945 9.2719C21.9929 8.73106 21.9921 8.46086 21.891 8.2197C21.8015 8.00634 21.6555 7.81027 21.463 7.64501C21.2457 7.45838 20.9475 7.32708 20.3517 7.06466L20.3499 7.06399Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.00033 9.49997C8.00033 11.2489 9.79119 12.6666 12.0003 12.6666C14.2095 12.6666 16.0003 11.2489 16.0003 9.49997C16.0003 7.75107 14.2095 6.3333 12.0003 6.3333C9.79119 6.3333 8.00033 7.75107 8.00033 9.49997Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && <span>Settings</span>}
          </button>

          <button
            onClick={onLogout}
            className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl font-light hover:font-medium transition-all duration-200`}
            style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M25.3327 28C25.3327 22.8453 21.154 18.6667 15.9993 18.6667C10.8447 18.6667 6.66602 22.8453 6.66602 28M15.9993 14.6667C13.0538 14.6667 10.666 12.2789 10.666 9.33333C10.666 6.38781 13.0538 4 15.9993 4C18.9449 4 21.3327 6.38781 21.3327 9.33333C21.3327 12.2789 18.9449 14.6667 15.9993 14.6667Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative bg-white overflow-auto" style={{ marginLeft: `${sidebarWidth}px`, minHeight: '100vh' }}>
        {/* Character Image */}
        <div className="absolute top-12 right-8 w-68 h-68">
          <img 
            src="https://api.builder.io/api/v1/image/assets/TEMP/885bc9d3ced1f9cf0ef1a254af16e38983c42c98?width=544"
            alt="Student Character"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjcyIiBoZWlnaHQ9IjI3MiIgdmlld0JveD0iMCAwIDI3MiAyNzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNzIiIGhlaWdodD0iMjcyIiByeD0iMTM2IiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEzNiIgeT0iMTQ2IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiPlN0dWRlbnQ8L3RleHQ+Cjwvc3ZnPg==';
            }}
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <h1 className="text-6xl font-semibold text-black mb-6" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}>
            Timetable
          </h1>

          {/* Stats Cards Row */}
          <div className="flex gap-6 mb-8">
            {/* Elective Selection Card */}
            <div className="bg-white rounded-lg p-6" style={{ width: '288px', minHeight: '109px', borderRadius: '8px' }}>
              {electiveGroups && electiveGroups.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-base font-normal capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', color: '#99A1AF', fontSize: '15px' }}>
                    Choose Elective
                  </h3>
                  {electiveGroups.map((group) => {
                    const chooseCount = group.chooseCount || 1;
                    const hasSelection = selectedElectivesMap && selectedElectivesMap[group.groupName];
                    const isLocked = !!hasSelection;

                    return (
                      <div key={group.groupName} className="space-y-2">
                        <div className="text-xs font-medium" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', color: '#0A0A0A' }}>
                          {group.groupName}
                          {isLocked && <span className="ml-2 text-green-600">✓ Confirmed</span>}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {group.options.map((option) => {
                            const isSelected = chooseCount === 1
                              ? selectedElectivesMap[group.groupName] === option
                              : Array.isArray(selectedElectivesMap[group.groupName]) && selectedElectivesMap[group.groupName].includes(option);

                            return (
                              <label
                                key={option}
                                className={`px-3 py-1 rounded-full text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                } ${isLocked && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
                              >
                                <input
                                  type={chooseCount === 1 ? 'radio' : 'checkbox'}
                                  name={`elective-${group.groupName}`}
                                  className="hidden"
                                  checked={isSelected}
                                  disabled={isLocked}
                                  onChange={() => {
                                    if (!saveStudentElective || isLocked) return;

                                    let newValue;
                                    if (chooseCount === 1) {
                                      newValue = option;
                                    } else {
                                      const current = Array.isArray(selectedElectivesMap[group.groupName])
                                        ? [...selectedElectivesMap[group.groupName]]
                                        : [];

                                      if (isSelected) {
                                        newValue = current.filter(v => v !== option);
                                      } else {
                                        if (current.length >= chooseCount) {
                                          alert(`You can only choose ${chooseCount} option(s) for ${group.groupName}`);
                                          return;
                                        }
                                        newValue = [...current, option];
                                      }
                                    }

                                    const confirmed = window.confirm(
                                      `Confirm your elective selection: ${Array.isArray(newValue) ? newValue.join(', ') : newValue}\n\nOnce confirmed, you cannot change your selection.`
                                    );

                                    if (confirmed) {
                                      saveStudentElective(group.groupName, newValue);
                                    }
                                  }}
                                />
                                {option}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm font-normal capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', color: '#99A1AF', fontSize: '15px' }}>
                    No electives available
                  </span>
                </div>
              )}
            </div>

            {/* Total Classes Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" style={{ width: '277px' }}>
              <div className="flex justify-between items-center h-16">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-sm font-normal" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#717182', lineHeight: '20px', letterSpacing: '-0.15px' }}>
                    Total Classes
                  </span>
                  <span className="text-2xl font-medium" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#0A0A0A', lineHeight: '32px', letterSpacing: '0.07px' }}>
                    {totalClasses}
                  </span>
                </div>
                <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16.25 9.33331V28" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.24935 24C3.89573 24 3.55659 23.8595 3.30654 23.6095C3.05649 23.3594 2.91602 23.0203 2.91602 22.6667V5.33333C2.91602 4.97971 3.05649 4.64057 3.30654 4.39052C3.55659 4.14048 3.89573 4 4.24935 4H10.916C12.3305 4 13.6871 4.5619 14.6873 5.5621C15.6874 6.56229 16.2493 7.91885 16.2493 9.33333C16.2493 7.91885 16.8113 6.56229 17.8114 5.5621C18.8116 4.5619 20.1682 4 21.5827 4H28.2493C28.603 4 28.9421 4.14048 29.1922 4.39052C29.4422 4.64057 29.5827 4.97971 29.5827 5.33333V22.6667C29.5827 23.0203 29.4422 23.3594 29.1922 23.6095C28.9421 23.8595 28.603 24 28.2493 24H20.2493C19.1885 24 18.1711 24.4214 17.4209 25.1716C16.6708 25.9217 16.2493 26.9391 16.2493 28C16.2493 26.9391 15.8279 25.9217 15.0778 25.1716C14.3276 24.4214 13.3102 24 12.2493 24H4.24935Z" stroke="#155DFC" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-xs font-normal mt-2" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#717182', lineHeight: '16px' }}>
                This week
              </div>
            </div>

            {/* Free Hours Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" style={{ width: '274px' }}>
              <div className="flex justify-between items-center h-16">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-sm font-normal" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#717182', lineHeight: '20px', letterSpacing: '-0.15px' }}>
                    Free Hours
                  </span>
                  <span className="text-2xl font-medium" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#0A0A0A', lineHeight: '32px', letterSpacing: '0.07px' }}>
                    {freeHours}h
                  </span>
                </div>
                <svg width="33" height="32" viewBox="0 0 33 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.584 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.916 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21.5833 10.6667C21.937 10.6667 22.2761 10.8072 22.5261 11.0572C22.7762 11.3073 22.9167 11.6464 22.9167 12V22.6667C22.9167 24.0812 22.3548 25.4377 21.3546 26.4379C20.3544 27.4381 18.9978 28 17.5833 28H9.58333C8.16885 28 6.81229 27.4381 5.8121 26.4379C4.8119 25.4377 4.25 24.0812 4.25 22.6667V12C4.25 11.6464 4.39048 11.3073 4.64052 11.0572C4.89057 10.8072 5.22971 10.6667 5.58333 10.6667H24.25C25.6645 10.6667 27.021 11.2286 28.0212 12.2288C29.0214 13.229 29.5833 14.5855 29.5833 16C29.5833 17.4145 29.0214 18.7711 28.0212 19.7713C27.021 20.7715 25.6645 21.3334 24.25 21.3334H22.9167" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8.25 2.66669V5.33335" stroke="#F54900" strokeWidth="2.66667" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="text-xs font-normal mt-2" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#3B82F6', lineHeight: '16px' }}>
                Break time
              </div>
            </div>
          </div>

          {/* Timetable Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm" style={{ maxWidth: '1042px', minHeight: '420px' }}>
            {/* Card Header */}
            <div className="flex items-center gap-2 mb-8">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 5.83331V17.5" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2.49935 15C2.27834 15 2.06637 14.9122 1.91009 14.7559C1.75381 14.5996 1.66602 14.3877 1.66602 14.1667V3.33333C1.66602 3.11232 1.75381 2.90036 1.91009 2.74408C2.06637 2.5878 2.27834 2.5 2.49935 2.5H6.66602C7.55007 2.5 8.39792 2.85119 9.02304 3.47631C9.64816 4.10143 9.99935 4.94928 9.99935 5.83333C9.99935 4.94928 10.3505 4.10143 10.9757 3.47631C11.6008 2.85119 12.4486 2.5 13.3327 2.5H17.4993C17.7204 2.5 17.9323 2.5878 18.0886 2.74408C18.2449 2.90036 18.3327 3.11232 18.3327 3.33333V14.1667C18.3327 14.3877 18.2449 14.5996 18.0886 14.7559C17.9323 14.9122 17.7204 15 17.4993 15H12.4993C11.8363 15 11.2004 15.2634 10.7316 15.7322C10.2627 16.2011 9.99935 16.837 9.99935 17.5C9.99935 16.837 9.73596 16.2011 9.26712 15.7322C8.79828 15.2634 8.16239 15 7.49935 15H2.49935Z" stroke="#00A63E" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <h3 className="text-base font-normal" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#0A0A0A', lineHeight: '16px', letterSpacing: '-0.312px' }}>
                Weekly Timetable
              </h3>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.10)' }}>
                    {/* compute widths: time column 20%, remaining equally divided */}
                    <th className="text-left p-2 text-sm font-medium" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#0A0A0A', width: '20%' }}>
                      Time
                    </th>
                    {WEEKDAY_LABELS.slice(0, workingDays).map((day) => (
                      <th key={day} className="text-left p-2 text-sm font-medium" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#0A0A0A', width: `${(80 / Math.max(1, workingDays)).toFixed(2)}%` }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: periodCount }, (_, periodIdx) => {
                    const timeSlot = renderTimeSlots[periodIdx] || `${9 + periodIdx}:00-${10 + periodIdx}:00`;
                    const lunchHeader = isLunchHeaderAt(periodIdx);
                    return (
                      <tr key={periodIdx} className="border-b" style={{ borderColor: 'rgba(0, 0, 0, 0.10)' }}>
                        {/* Time Cell */}
                        <td className="p-2 text-sm font-medium" style={{
                          fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif',
                          color: '#0A0A0A',
                          background: 'rgba(236, 236, 240, 0.30)',
                          height: periodIdx === 0 ? '65px' : '57px',
                          width: timeColWidth
                        }}>
                          {timeSlot}
                        </td>

                        {/* Day Cells */}
                        {Array.from({ length: Math.min(workingDays, WEEKDAY_LABELS.length) }, (_, dayIdx) => {
                          if (lunchHeader) {
                            return (
                              <td key={dayIdx} className="p-2 text-center" style={{ height: periodIdx === 0 ? '65px' : '57px' }}>
                                <div className="flex items-center justify-center h-10">
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: '#3B82F6', color: '#FFFFFF', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
                                    Lunch
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          const dataIdx = toDataIndex(periodIdx);
                          const cellData = getCellContent(dayIdx, dataIdx);

                          if (cellData.status === 'free') {
                            return (
                              <td key={dayIdx} className="p-2 text-center" style={{ height: periodIdx === 0 ? '65px' : '57px' }}>
                                <div className="flex items-center justify-center h-10">
                                  <span className="text-xs text-center" style={{ fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif', color: '#717182' }}>
                                    Free
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          if (cellData.status === 'break') {
                            return (
                              <td key={dayIdx} className="p-2 text-center" style={{ height: periodIdx === 0 ? '65px' : '57px' }}>
                                <div className="flex items-center justify-center h-10">
                                  <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: cellData.bgColor || '#3B82F6', color: cellData.textColor || '#FFFFFF', fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
                                    {cellData.subjectName}
                                  </span>
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={dayIdx} className="p-2" style={{ height: periodIdx === 0 ? '65px' : '57px' }}>
                              <div
                                className="rounded p-2 flex flex-col justify-center"
                                style={{
                                  backgroundColor: cellData.bgColor,
                                  height: periodIdx === 0 ? '48px' : '48px'
                                }}
                              >
                                <div className="text-xs font-medium" style={{ color: cellData.textColor, fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
                                  {cellData.subjectName}
                                </div>
                                <div className="text-xs opacity-75" style={{ color: cellData.textColor, fontFamily: 'Inter, -apple-system, Roboto, Helvetica, sans-serif' }}>
                                  {cellData.className}
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={downloadAsPDF} className="px-3 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">Download PDF</button>
              <button onClick={downloadAsExcel} className="px-3 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">Download Excel</button>
              <button onClick={downloadAsText} className="px-3 py-2 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors">Download Text</button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentTimetable;

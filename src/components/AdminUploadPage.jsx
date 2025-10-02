import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const AdminUploadPage = ({
  // Upload handlers
  handleTeacherCSV,
  handleStudentCSV,
  handleClassroomsCSV,
  handleCoursesCSV,
  handleFeedbackCSV,
  isUploading,

  // Counts
  teacherCount = 0,
  studentCount = 0,
  classroomsCount = 0,
  coursesCount = 0,
  feedbackCount = 0,

  // Timetable settings
  workingDays,
  setWorkingDays,
  hoursPerDay,
  setHoursPerDay,
  breakSlots,
  setBreakSlots,
  electiveSlots,
  setElectiveSlots,
  dayStartTime,
  setDayStartTime,
  dayEndTime,
  setDayEndTime,
  classStartTime,
  setClassStartTime,
  classDuration,
  setClassDuration,
  freePeriodPercentage,
  setFreePeriodPercentage,
  // computed time slots from parent (may include LUNCH marker)
  timeSlots = [] ,

  // Teacher hours bypass toggle
  bypassHoursCheck,
  updateBypassSetting,

  // Actions
  saveSettings,
  generateTimetable,
  isGenerating,
  deleteAllUploadedData,
  isPurging
}) => {
  const [dragActive, setDragActive] = useState({});
  const [uploadedNames, setUploadedNames] = useState({});

  const onFileSelect = (uploadType, handler, e) => {
    try {
      const files = (e && e.target && e.target.files) ? e.target.files : (e && e.dataTransfer && e.dataTransfer.files) ? e.dataTransfer.files : null;
      if (files && files.length) {
        const names = Array.from(files).map(f => f.name).join(', ');
        setUploadedNames(prev => ({ ...prev, [uploadType]: names }));
      }
    } catch (err) {
      // ignore
    }

    if (typeof handler === 'function') {
      try { handler(e); } catch (err) { /* ignore handler errors here */ }
    }
  };

  const handleDrag = (e, uploadType) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [uploadType]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [uploadType]: false }));
    }
  };

  const handleDrop = (e, uploadType, handler) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [uploadType]: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileEvent = { target: { files: e.dataTransfer.files } };
      handler(fileEvent);
    }
  };

  const formatBreakSlots = (slots) => {
    if (Array.isArray(slots)) {
      return slots.join(', ');
    }
    return slots || '';
  };

  const parseBreakSlots = (value) => {
    if (!value) return [];
    return value.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
  };

  const UploadBox = ({
    title,
    uploadType,
    handler,
    accept = ".csv,.xlsx,.xls",
    footer = null
  }) => (
    <div className="upload-box-container">
      <label className="upload-box-label">{title}</label>
      <div
        className={`upload-box ${dragActive[uploadType] ? 'drag-active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={(e) => handleDrag(e, uploadType)}
        onDragLeave={(e) => handleDrag(e, uploadType)}
        onDragOver={(e) => handleDrag(e, uploadType)}
        onDrop={(e) => handleDrop(e, uploadType, handler)}
      >
        <div className="upload-content">
          <div className="upload-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M9.5 8.96533C9.5 8.48805 9.5 8.24941 9.59974 8.11618C9.68666 8.00007 9.81971 7.92744 9.96438 7.9171C10.1304 7.90525 10.3311 8.03429 10.7326 8.29239L15.4532 11.3271C15.8016 11.551 15.9758 11.663 16.0359 11.8054C16.0885 11.9298 16.0885 12.0702 16.0359 12.1946C15.9758 12.337 15.8016 12.449 15.4532 12.6729L10.7326 15.7076C10.3311 15.9657 10.1304 16.0948 9.96438 16.0829C9.81971 16.0726 9.68666 15.9999 9.59974 15.8838C9.5 15.7506 9.5 15.512 9.5 15.0347V8.96533Z" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 7.8C3 6.11984 3 5.27976 3.32698 4.63803C3.6146 4.07354 4.07354 3.6146 4.63803 3.32698C5.27976 3 6.11984 3 7.8 3H16.2C17.8802 3 18.7202 3 19.362 3.32698C19.9265 3.6146 20.3854 4.07354 20.673 4.63803C21 5.27976 21 6.11984 21 7.8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V7.8Z" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="upload-text">
            <span className="upload-primary">Drag and drop files, or </span>
            <span className="upload-browse">Browse</span>
          </div>
          <p className="upload-subtitle">Upload in Excel or CSV file</p>
        </div>
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handler}
          disabled={isUploading}
          className="file-input"
        />
      </div>
      {footer && <div className="upload-footer">{footer}</div>}
    </div>
  );

  const TimeInput = ({ value, onChange, label, id }) => {
    const [local, setLocal] = useState(value || '');
    useEffect(() => { setLocal(value || ''); }, [value]);
    return (
      <div className="time-input-container">
        <label htmlFor={id} className="time-label">{label}</label>
        <div className="time-picker">
          <input
            id={id}
            type="time"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => onChange(local)}
            className="time-input"
          />
        </div>
      </div>
    );
  };

  const DropdownInput = ({ value, onChange, options, label, id }) => (
    <div className="dropdown-container">
      <label htmlFor={id} className="dropdown-label">{label}</label>
      <div className="dropdown-wrapper">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="dropdown-select"
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="dropdown-icon">
          <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
            <path d="M1 5.76412L5 1.77319L9 5.76412" stroke="#818181" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 11.7505L5 15.7414L1 11.7505" stroke="#818181" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  );

  const TextInput = ({ value, onChange, label, id, placeholder, type = "text" }) => {
    const [local, setLocal] = useState(type === 'number' ? (Number(value) || '') : (value == null ? '' : String(value)));
    useEffect(() => { setLocal(type === 'number' ? (Number(value) || '') : (value == null ? '' : String(value))); }, [value, type]);
    return (
      <div className="text-input-container">
        <label htmlFor={id} className="text-label">{label}</label>
        <div className="text-input-wrapper">
          <input
            id={id}
            type={type}
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            onBlur={() => onChange(type === 'number' ? Number(local) : local)}
            placeholder={placeholder}
            className="text-input"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="admin-upload-page">
      {/* Dataset Upload Section */}
      <section className="dataset-upload-section">
        <h1 className="section-title">Dataset Upload</h1>
        
        <div className="upload-grid">
          <div className="upload-row">
            <UploadBox
              title="Upload Teachers CSV"
              uploadType="teachers"
              handler={handleTeacherCSV}
              footer={<p className="upload-count">Current teachers: {teacherCount}</p>}
            />
            <UploadBox
              title="Upload Students CSV"
              uploadType="students"
              handler={handleStudentCSV}
              footer={<p className="upload-count">Current students: {studentCount}</p>}
            />
          </div>
          
          <div className="upload-row">
            <UploadBox
              title="Upload Classrooms CSV"
              uploadType="classrooms"
              handler={handleClassroomsCSV}
              footer={<p className="upload-count">Current classrooms: {classroomsCount}</p>}
            />
            <UploadBox
              title="Upload Courses CSV"
              uploadType="courses"
              handler={handleCoursesCSV}
              footer={<p className="upload-count">Current courses: {coursesCount}</p>}
            />
          </div>
          
          <div className="upload-row-single">
            <UploadBox
              title="Upload Students' Feedback CSV"
              uploadType="feedback"
              handler={handleFeedbackCSV}
              footer={<p className="upload-count">Feedback entries: {feedbackCount}</p>}
            />
          </div>
        </div>
      </section>

      {/* Time Table Settings Section */}
      <section className="timetable-settings-section">
        <h1 className="section-title">Time Table Settings</h1>
        
        <div className="settings-grid">
          <div className="settings-column">
            <DropdownInput
              label="Working Days:"
              id="working-days"
              value={workingDays}
              onChange={setWorkingDays}
              options={[
                { value: 1, label: '1 Day' },
                { value: 2, label: '2 Days' },
                { value: 3, label: '3 Days' },
                { value: 4, label: '4 Days' },
                { value: 5, label: '5 Days' },
                { value: 6, label: '6 Days' },
                { value: 7, label: '7 Days' }
              ]}
            />
            
            <DropdownInput
              label="Classes Per Day:"
              id="hours-per-day"
              value={(() => { const lunchCount = Array.isArray(timeSlots) ? timeSlots.filter(s => /\(LUNCH\)/i.test(String(s || ''))).length : 0; return Math.max(0, Number(hoursPerDay || 0) - (Array.isArray(breakSlots) ? breakSlots.length : 0) - lunchCount); })()}
              onChange={(v) => { const lunchCount = Array.isArray(timeSlots) ? timeSlots.filter(s => /\(LUNCH\)/i.test(String(s || ''))).length : 0; setHoursPerDay(Number(v) + (Array.isArray(breakSlots) ? breakSlots.length : 0) + lunchCount); }}
              options={[
                { value: 1, label: '1 Class' },
                { value: 2, label: '2 Classes' },
                { value: 3, label: '3 Classes' },
                { value: 4, label: '4 Classes' },
                { value: 5, label: '5 Classes' },
                { value: 6, label: '6 Classes' },
                { value: 7, label: '7 Classes' },
                { value: 8, label: '8 Classes' },
                { value: 9, label: '9 Classes' },
                { value: 10, label: '10 Classes' }
              ]}
            />
            
            <TextInput
              label="Break Slots (comma-separated, 0-based):"
              id="break-slots"
              value={formatBreakSlots(breakSlots)}
              onChange={(value) => setBreakSlots(parseBreakSlots(value))}
              placeholder="e.g., 2, 5"
            />
            
            <TextInput
              label="Elective Periods (comma-separated, 0-based):"
              id="elective-slots"
              value={formatBreakSlots(electiveSlots)}
              onChange={(value) => setElectiveSlots(parseBreakSlots(value))}
              placeholder="e.g., 3, 6"
            />
          </div>
          
          <div className="settings-column">
            <TimeInput
              label="Start of Day:"
              id="start-day"
              value={dayStartTime}
              onChange={setDayStartTime}
            />
            
            <TimeInput
              label="End of Day:"
              id="end-day"
              value={dayEndTime}
              onChange={setDayEndTime}
            />
            
            <TimeInput
              label="Class Start Time:"
              id="class-start"
              value={classStartTime}
              onChange={setClassStartTime}
            />
            
            <div className="settings-row">
              <TextInput
                label="Class Duration (min):"
                id="class-duration"
                type="number"
                value={classDuration}
                onChange={setClassDuration}
                placeholder="60"
              />
              
              <TextInput
                label="Free Period %:"
                id="free-period"
                type="number"
                value={freePeriodPercentage}
                onChange={setFreePeriodPercentage}
                placeholder="20"
              />
            </div>

            <div className="toggle-container">
              <label className="dropdown-label">Bypass Teacher Working Hours:</label>
              <label className="toggle-inline">
                <input
                  type="checkbox"
                  checked={Boolean(bypassHoursCheck)}
                  onChange={(e) => updateBypassSetting(Boolean(e.target.checked))}
                  className="toggle-checkbox"
                />
                <span className="toggle-help">Allow accepting substitutions regardless of hours left</span>
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={saveSettings}
          disabled={isUploading}
          className="save-button"
        >
          Save Settings
        </button>

        <button
          onClick={generateTimetable}
          disabled={isUploading || isGenerating}
          className="generate-button"
        >
          {isGenerating ? 'Generating...' : 'Generate Timetable'}
        </button>
      </div>

      <section className="data-purge-section">
        <h2 className="purge-title">Danger Zone</h2>
        <p className="purge-description">
          Deleting all uploaded data removes every dataset, generated timetable, and stored CSV upload from the system.
        </p>
        <button
          onClick={deleteAllUploadedData}
          disabled={isUploading || isPurging}
          className="purge-button"
        >
          {isPurging ? 'Deleting All Data...' : 'Delete All Uploaded Data'}
        </button>
        {isPurging && (
          <p className="purge-status">Deleting data, please wait. Do not close this tab.</p>
        )}
      </section>

      <style>{`
        .admin-upload-page {
          min-height: 100vh;
          background: #fff;
          padding: 2rem;
        }

        .section-title {
          font-family: 'Roboto Condensed', sans-serif;
          font-size: 3rem;
          font-weight: 700;
          color: #000;
          margin-bottom: 2rem;
          line-height: 1.1;
        }

        /* Dataset Upload Styles */
        .dataset-upload-section {
          margin-bottom: 4rem;
        }

        .upload-grid {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .upload-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .upload-row-single {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          width: 100%;
        }

        .upload-row-single > .upload-box-container {
          grid-column: 1 / -1;
        }

        .upload-box-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .upload-box-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          color: #000;
          text-align: center;
        }

        .upload-footer {
          margin-top: 0.25rem;
          text-align: center;
        }

        .upload-count {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          color: #0F172A;
          opacity: 0.6;
          margin: 0;
        }

        .upload-box {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          min-height: 144px;
          padding: 1.25rem 4rem;
          border: 1px dashed #E2E8F0;
          border-radius: 0.5rem;
          background: #fff;
          box-shadow: 0 4px 50px 0 rgba(0, 0, 0, 0.25);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .upload-box:hover {
          border-color: #3B82F6;
          box-shadow: 0 4px 50px 0 rgba(59, 130, 246, 0.15);
        }

        .upload-box.drag-active {
          border-color: #3B82F6;
          background: #F8FAFC;
        }

        .upload-box.uploading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          pointer-events: none;
        }

        .upload-icon {
          color: #0F172A;
        }

        .upload-text {
          font-family: 'Inter', sans-serif;
          font-size: 1.125rem;
          font-weight: 700;
          text-align: center;
          line-height: 1.6;
        }

        .upload-primary {
          color: #0F172A;
        }

        .upload-browse {
          color: #3B82F6;
          cursor: pointer;
        }

        .upload-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          color: #0F172A;
          opacity: 0.5;
          text-align: center;
          margin: 0;
          line-height: 1.5;
        }

        .file-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .file-input:disabled {
          cursor: not-allowed;
        }

        /* Timetable Settings Styles */
        .timetable-settings-section {
          margin-bottom: 3rem;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          margin-bottom: 2rem;
        }

        .settings-column {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .settings-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        /* Input Components */
        .dropdown-container,
        .time-input-container,
        .text-input-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .toggle-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .toggle-inline {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .toggle-checkbox {
          width: 16px;
          height: 16px;
        }

        .toggle-help {
          font-family: 'Poppins', sans-serif;
          font-size: 0.875rem;
          color: #000;
          opacity: 0.7;
        }

        .dropdown-label,
        .time-label,
        .text-label {
          font-family: 'Poppins', sans-serif;
          font-size: 1.125rem;
          font-weight: 300;
          color: #000;
          text-transform: capitalize;
        }

        .dropdown-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .dropdown-select {
          width: 105px;
          height: 41px;
          padding: 0.5rem 2rem 0.5rem 0.75rem;
          border-radius: 0.5rem;
          background: #fff;
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.25);
          border: none;
          font-family: 'Poppins', sans-serif;
          font-size: 0.875rem;
          color: #000;
          appearance: none;
          cursor: pointer;
        }

        .dropdown-icon {
          position: absolute;
          right: 0.75rem;
          pointer-events: none;
        }

        .time-picker {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .time-input {
          width: 163px;
          height: 28px;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 0.5px solid #2196F3;
          background: #fff;
          font-family: 'Roboto', sans-serif;
          font-size: 1rem;
          font-weight: 500;
          color: #424242;
          text-align: center;
        }

        .text-input-wrapper {
          position: relative;
        }

        .text-input {
          width: 100%;
          max-width: 300px;
          height: 41px;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          background: #fff;
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.25);
          border: 1px solid #E2E8F0;
          font-family: 'Poppins', sans-serif;
          font-size: 0.875rem;
          color: #000;
        }

        .text-input:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Action Buttons */
        .action-buttons {
          display: flex;
          gap: 1.5rem;
          justify-content: flex-start;
          margin-top: 2rem;
        }

        .save-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 206px;
          height: 48px;
          padding: 0.625rem 1.5rem;
          border-radius: 0.5rem;
          background: #16A34A;
          border: none;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .save-button:hover:not(:disabled) {
          background: #15803d;
          transform: translateY(-1px);
        }

        .save-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .generate-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 246px;
          height: 48px;
          padding: 0.625rem 1.5rem;
          border-radius: 0.5rem;
          background: #3B82F6;
          border: none;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .generate-button:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .generate-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .data-purge-section {
          margin-top: 3rem;
          padding: 2rem;
          border-radius: 0.75rem;
          background: #fef2f2;
          box-shadow: 0 4px 40px 0 rgba(220, 38, 38, 0.15);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .purge-title {
          font-family: 'Roboto Condensed', sans-serif;
          font-size: 2rem;
          font-weight: 700;
          color: #991b1b;
          margin: 0;
        }

        .purge-description {
          font-family: 'Inter', sans-serif;
          font-size: 0.95rem;
          color: #7f1d1d;
          margin: 0;
          line-height: 1.6;
        }

        .purge-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 246px;
          height: 48px;
          padding: 0.625rem 1.5rem;
          border-radius: 0.5rem;
          background: #dc2626;
          border: none;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .purge-button:hover:not(:disabled) {
          background: #b91c1c;
          transform: translateY(-1px);
        }

        .purge-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .purge-status {
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          color: #dc2626;
          margin: 0;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .admin-upload-page {
            padding: 1.5rem;
          }

          .section-title {
            font-size: 2.5rem;
          }

          .settings-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .upload-row {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .settings-row {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .data-purge-section {
            padding: 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .admin-upload-page {
            padding: 1rem;
          }

          .section-title {
            font-size: 2rem;
            margin-bottom: 1.5rem;
          }

          .upload-box {
            min-height: 120px;
            padding: 1rem 2rem;
          }

          .upload-text {
            font-size: 1rem;
          }

          .action-buttons {
            flex-direction: column;
            align-items: stretch;
          }

          .save-button,
          .generate-button,
          .purge-button {
            width: 100%;
          }

          .settings-column {
            gap: 1.25rem;
          }

          .data-purge-section {
            padding: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .admin-upload-page {
            padding: 0.75rem;
          }

          .section-title {
            font-size: 1.75rem;
          }

          .upload-box {
            min-height: 100px;
            padding: 0.75rem 1rem;
          }

          .upload-text {
            font-size: 0.875rem;
          }

          .upload-subtitle {
            font-size: 0.75rem;
          }

          .dropdown-select {
            width: 100%;
          }

          .time-input {
            width: 100%;
          }

          .text-input {
            max-width: 100%;
          }

          .purge-title {
            font-size: 1.5rem;
          }

          .purge-description {
            font-size: 0.85rem;
          }

          .purge-button {
            height: 44px;
          }
        }
      `}</style>
    </div>
  );
};

AdminUploadPage.propTypes = {
  // Upload handlers
  handleTeacherCSV: PropTypes.func.isRequired,
  handleStudentCSV: PropTypes.func.isRequired,
  handleClassroomsCSV: PropTypes.func.isRequired,
  handleCoursesCSV: PropTypes.func.isRequired,
  handleFeedbackCSV: PropTypes.func.isRequired,
  isUploading: PropTypes.bool,

  // Counts
  teacherCount: PropTypes.number,
  studentCount: PropTypes.number,
  classroomsCount: PropTypes.number,
  coursesCount: PropTypes.number,
  feedbackCount: PropTypes.number,

  // Timetable settings
  workingDays: PropTypes.number.isRequired,
  setWorkingDays: PropTypes.func.isRequired,
  hoursPerDay: PropTypes.number.isRequired,
  setHoursPerDay: PropTypes.func.isRequired,
  breakSlots: PropTypes.array.isRequired,
  setBreakSlots: PropTypes.func.isRequired,
  electiveSlots: PropTypes.array.isRequired,
  setElectiveSlots: PropTypes.func.isRequired,
  dayStartTime: PropTypes.string.isRequired,
  setDayStartTime: PropTypes.func.isRequired,
  dayEndTime: PropTypes.string.isRequired,
  setDayEndTime: PropTypes.func.isRequired,
  classStartTime: PropTypes.string.isRequired,
  setClassStartTime: PropTypes.func.isRequired,
  classDuration: PropTypes.number.isRequired,
  setClassDuration: PropTypes.func.isRequired,
  freePeriodPercentage: PropTypes.number.isRequired,
  setFreePeriodPercentage: PropTypes.func.isRequired,

  // Teacher hours bypass toggle
  bypassHoursCheck: PropTypes.bool.isRequired,
  updateBypassSetting: PropTypes.func.isRequired,

  // Actions
  saveSettings: PropTypes.func.isRequired,
  generateTimetable: PropTypes.func.isRequired,
  isGenerating: PropTypes.bool,
  deleteAllUploadedData: PropTypes.func.isRequired,
  isPurging: PropTypes.bool
};

AdminUploadPage.defaultProps = {
  isUploading: false,
  isGenerating: false,
  isPurging: false
};

export default AdminUploadPage;

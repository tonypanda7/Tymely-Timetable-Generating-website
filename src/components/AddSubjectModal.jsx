import PropTypes from 'prop-types';
import { useState } from 'react';

export default function AddSubjectModal({ classes = [], teachers = [], programs = {}, onAddSubject, onClose }) {
  const [selectedClass, setSelectedClass] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [credits, setCredits] = useState(3);
  const [courseType, setCourseType] = useState('major');
  const [subjectType, setSubjectType] = useState('theory');
  const [courseStyle, setCourseStyle] = useState('hard_theory');
  const [semester, setSemester] = useState(1);

  const getMaxSemForSelected = () => {
    try {
      const cls = classes.find(c => c && c.name === selectedClass);
      const prog = String(cls?.program || '');
      const lim = Number(programs?.[prog]?.numSemesters);
      if ([4, 6, 8].includes(lim)) return lim;
      return 8;
    } catch {
      return 8;
    }
  };
  const maxSem = getMaxSemForSelected();
  const [assignedTeachers, setAssignedTeachers] = useState([]);

  const handleAdd = async () => {
    if (!selectedClass || !subjectName || Number(credits) <= 0 || (!Array.isArray(assignedTeachers) || assignedTeachers.length === 0) ) {
      alert('Please fill all required fields');
      return;
    }

    const maxAllowed = getMaxSemForSelected();
    const semVal = Number(semester);
    if (!(semVal >= 1 && semVal <= maxAllowed)) {
      alert(`Semester must be between 1 and ${maxAllowed} for this program.`);
      return;
    }

    const subjectData = {
      name: subjectName,
      credits: Number(credits),
      courseType,
      isLab: subjectType === 'lab',
      delivery: subjectType,
      style: courseStyle,
      sem: Number(semester),
      teachers: assignedTeachers
    };

    if (onAddSubject) await onAddSubject(selectedClass, subjectData);
    // Clear local state and close
    setSelectedClass('');
    setSubjectName('');
    setCredits(3);
    setCourseType('major');
    setSubjectType('theory');
    setCourseStyle('hard_theory');
    setSemester(1);
    setAssignedTeachers([]);
    if (onClose) onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-form">
          <h2 className="modal-title">Add Subject to Course</h2>

          <div className="form-group">
            <label className="form-label">Select Class</label>
            <select
              className="form-input"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="">-- Select a Class --</option>
              {classes.map((cls) => (
                <option key={cls.name} value={cls.name}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Course Type</label>
            <select
              className="form-input"
              value={courseType}
              onChange={(e) => setCourseType(e.target.value)}
            >
              <option value="major">Major</option>
              <option value="skill_based">Skill Based</option>
              <option value="elective">Elective</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Data Structures"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Credits</label>
            <input
              type="number"
              className="form-input"
              value={credits}
              onChange={(e) => setCredits(e.target.value === '' ? '' : Number(e.target.value))}
              min="1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Type</label>
            <select
              className="form-input"
              value={subjectType}
              onChange={(e) => setSubjectType(e.target.value)}
            >
              <option value="theory">Theory</option>
              <option value="lab">Lab</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Course Style</label>
            <select
              className="form-input"
              value={courseStyle}
              onChange={(e) => setCourseStyle(e.target.value)}
            >
              <option value="hard_theory">Hard Theory</option>
              <option value="hands_on">Hands On</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Semester (1-{maxSem})</label>
            <input
              type="number"
              className="form-input"
              value={semester}
              onChange={(e) => setSemester(e.target.value === '' ? '' : Number(e.target.value))}
              min="1"
              max={maxSem}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Assign Teachers</label>
            <select
              multiple
              className="form-input form-select-multiple"
              value={assignedTeachers}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setAssignedTeachers(selected);
              }}
            >
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.id})
                </option>
              ))}
            </select>
            <p className="form-helper">Hold Ctrl/Cmd to select multiple teachers</p>
          </div>

          <button className="btn-add-subject" onClick={handleAdd}>
            Add Subject
          </button>
        </div>

        <div className="modal-preview">
          <div className="preview-card">
            <div className="preview-header">
              <h3 className="preview-title">{selectedClass || 'Select a Class'}</h3>
            </div>

            <div className="preview-subjects">
              {(classes.find(c => c.name === selectedClass)?.subjects || []).map((subject, index) => (
                <div key={index} className="preview-subject">
                  <span className="preview-subject-name">
                    {subject.name} ({subject.credits || 3} credits)
                  </span>
                </div>
              ))}
              {!(classes.find(c => c.name === selectedClass)?.subjects || []).length && (
                <div className="preview-empty">
                  {selectedClass ? 'No subjects added yet' : 'Select a class to view subjects'}
                </div>
              )}
            </div>
          </div>

          <button className="btn-add-course" onClick={() => { if (onClose) onClose(); }}>
            Add Course
          </button>
        </div>
      </div>
    </div>
  );
}

AddSubjectModal.propTypes = {
  classes: PropTypes.array,
  teachers: PropTypes.array,
  programs: PropTypes.object,
  onAddSubject: PropTypes.func,
  onClose: PropTypes.func
};

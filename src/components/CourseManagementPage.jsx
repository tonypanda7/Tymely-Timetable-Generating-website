import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

const CourseManagementPage = ({
  classes = [],
  onNavigate,
  currentView = 'course',
  role,
  collegeId,
  onDeleteSubject,
  teachers = [],
  onAddSubject
}) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  // Form state
  const [selectedClass, setSelectedClass] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [credits, setCredits] = useState(3);
  const [courseType, setCourseType] = useState('major');
  const [subjectType, setSubjectType] = useState('theory');
  const [courseStyle, setCourseStyle] = useState('hard_theory');
  const [semester, setSemester] = useState(1);
  const [assignedTeachers, setAssignedTeachers] = useState([]);

  // Local input buffers to prevent focus loss while typing
  const [localSubjectName, setLocalSubjectName] = useState('');
  const [localCredits, setLocalCredits] = useState(credits);
  const [localSemester, setLocalSemester] = useState(semester);

  // Sync main -> local when main state changes (e.g., reset after submit)
  useEffect(() => { setLocalSubjectName(subjectName || ''); }, [subjectName]);
  useEffect(() => { setLocalCredits(Number(credits) || 0); }, [credits]);
  useEffect(() => { setLocalSemester(Number(semester) || 1); }, [semester]);

  useEffect(() => {
    // Transform classes data into course sections
    const courseData = classes.map(cls => ({
      id: cls.name,
      title: cls.name,
      subjects: cls.subjects || []
    }));
    setCourses(courseData);
  }, [classes]);

  const handleDeleteClick = async (courseId, subjectName, subjectIndex) => {
    // Optimistic UI update
    setCourses(prev => prev.map(course =>
      course.id === courseId
        ? { ...course, subjects: course.subjects.filter((_, index) => index !== subjectIndex) }
        : course
    ));
    try {
      if (onDeleteSubject) await onDeleteSubject(courseId, subjectName);
    } catch (e) {
      // Re-sync from props on failure (classes listener will refresh soon anyway)
    }
  };

  const CourseCard = ({ course }) => (
    <div className="course-card">
      <div className="course-header">
        <h3 className="course-title">{course.title}</h3>
      </div>
      
      <div className="subjects-list">
        {course.subjects.map((subject, index) => (
          <div key={index} className="subject-item">
            <span className="subject-name">{subject.name} ({subject.credits || 3} credits)</span>
            <button
              className="delete-btn"
              onClick={() => handleDeleteClick(course.id, subject.name, index)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const AddCourseCard = () => (
    <div className="add-course-card" onClick={() => setShowAddCourseModal(true)}>
      <div className="add-course-content">
        <span className="add-course-text">+ Add a Course</span>
      </div>
    </div>
  );

  const handleAddSubject = async () => {
    if (!selectedClass || !subjectName || credits <= 0 || assignedTeachers.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    const subjectData = {
      name: subjectName,
      credits,
      courseType,
      isLab: subjectType === 'lab',
      delivery: subjectType,
      style: courseStyle,
      sem: semester,
      teachers: assignedTeachers
    };

    if (onAddSubject) {
      await onAddSubject(selectedClass, subjectData);
      // Reset form
      setSubjectName('');
      setCredits(3);
      setCourseType('major');
      setSubjectType('theory');
      setCourseStyle('hard_theory');
      setSemester(1);
      setAssignedTeachers([]);
      // Reset local buffers as well
      setLocalSubjectName('');
      setLocalCredits(3);
      setLocalSemester(1);
      setShowAddCourseModal(false);
    }
  };

  const selectedClassData = classes.find(cls => cls.name === selectedClass);

  const AddSubjectModal = () => (
    <div className="modal-overlay" onClick={() => setShowAddCourseModal(false)}>
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
              value={localSubjectName}
              onChange={(e) => setLocalSubjectName(e.target.value)}
              onBlur={() => setSubjectName(localSubjectName)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Credits</label>
            <input
              type="number"
              className="form-input"
              value={localCredits}
              onChange={(e) => setLocalCredits(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => setCredits(Number(localCredits) || 0)}
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
            <label className="form-label">Semester (1-8)</label>
            <input
              type="number"
              className="form-input"
              value={localSemester}
              onChange={(e) => setLocalSemester(e.target.value === '' ? '' : Number(e.target.value))}
              onBlur={() => setSemester(Number(localSemester) || 1)}
              min="1"
              max="8"
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

          <button className="btn-add-subject" onClick={handleAddSubject}>
            Add Subject
          </button>
        </div>

        <div className="modal-preview">
          <div className="preview-card">
            <div className="preview-header">
              <h3 className="preview-title">{selectedClass || 'Select a Class'}</h3>
            </div>

            <div className="preview-subjects">
              {selectedClassData?.subjects?.map((subject, index) => (
                <div key={index} className="preview-subject">
                  <span className="preview-subject-name">
                    {subject.name} ({subject.credits || 3} credits)
                  </span>
                  <button
                    className="preview-delete-btn"
                    onClick={() => handleDeleteClick(selectedClass, subject.name, index)}
                  >
                    Delete
                  </button>
                </div>
              )) || (
                <div className="preview-empty">
                  {selectedClass ? 'No subjects added yet' : 'Select a class to view subjects'}
                </div>
              )}
            </div>
          </div>

          <button className="btn-add-course" onClick={() => setShowAddCourseModal(false)}>
            Add Course
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="course-management-page">
      <div className="page-header">
        <h1 className="page-title">Courses</h1>
      </div>

      <div className="courses-grid">
        {courses.map(course => (
          <CourseCard key={course.id} course={course} />
        ))}
        <AddCourseCard />
      </div>

      {showAddCourseModal && <AddSubjectModal />}

      <style>{`
        .course-management-page {
          min-height: 100vh;
          background: #fff;
          padding: 2rem;
          margin-left: 211px;
        }

        .page-header {
          margin-bottom: 3rem;
        }

        .page-title {
          font-family: 'Roboto Condensed', sans-serif;
          font-size: 50px;
          font-weight: 600;
          color: #000;
          margin: 0;
          line-height: normal;
        }

        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(535px, 1fr));
          gap: 2rem;
          max-width: 1400px;
        }

        .course-card {
          width: 535px;
          height: 261px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.25);
          padding: 17px;
          display: flex;
          flex-direction: column;
        }

        .course-header {
          margin-bottom: 14px;
        }

        .course-title {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #000;
          text-align: center;
          margin: 0;
          line-height: 150%;
        }

        .subjects-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
          overflow-y: auto;
        }

        .subject-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 498px;
          height: 54px;
          border-radius: 5px;
          background: #d9d9d9;
          padding: 0 28px;
        }

        .subject-name {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #000;
          line-height: 150%;
        }

        .delete-btn {
          display: flex;
          width: 87px;
          height: 31px;
          padding: 10px 24px;
          justify-content: center;
          align-items: center;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          line-height: 160%;
          transition: all 0.2s ease;
        }

        .delete-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .add-course-card {
          width: 535px;
          height: 261px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-course-card:hover {
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.35);
          transform: translateY(-2px);
        }

        .add-course-content {
          text-align: center;
        }

        .add-course-text {
          font-family: 'Inter', sans-serif;
          font-size: 25px;
          font-weight: 600;
          color: #999;
          line-height: 150%;
        }

        @media (max-width: 1024px) {
          .course-management-page {
            margin-left: 0;
            padding: 1rem;
          }

          .courses-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .course-card,
          .add-course-card {
            width: 100%;
            max-width: 535px;
            margin: 0 auto;
          }

          .subject-item {
            width: 100%;
            padding: 0 1rem;
          }

          .page-title {
            font-size: 40px;
          }
        }

        @media (max-width: 640px) {
          .page-title {
            font-size: 32px;
          }

          .subject-item {
            height: 48px;
            padding: 0 0.75rem;
          }

          .subject-name {
            font-size: 13px;
          }

          .delete-btn {
            width: 70px;
            height: 28px;
            padding: 8px 16px;
            font-size: 12px;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(217, 217, 217, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          width: 1016px;
          height: 1078px;
          background: #fff;
          border-radius: 20px;
          display: flex;
          gap: 60px;
          padding: 49px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-form {
          flex: 1;
          max-width: 400px;
        }

        .modal-title {
          font-family: 'Inter', sans-serif;
          font-size: 22px;
          font-weight: 600;
          color: #000;
          margin-bottom: 40px;
          line-height: 150%;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          font-family: 'Inter', sans-serif;
          font-size: 18px;
          font-weight: 400;
          color: #000;
          margin-bottom: 12px;
          line-height: 150%;
        }

        .form-input {
          width: 327px;
          height: 41px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.25);
          border: none;
          padding: 0 16px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          color: #000;
          outline: none;
        }

        .form-input:focus {
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.35);
        }

        .form-select-multiple {
          height: 120px;
          padding: 8px 16px;
        }

        .form-helper {
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }

        .btn-add-subject {
          width: 206px;
          height: 48px;
          background: #16A34A;
          border-radius: 8px;
          border: none;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          margin-top: 24px;
          transition: background 0.2s ease;
        }

        .btn-add-subject:hover {
          background: #15803d;
        }

        .modal-preview {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 48px;
        }

        .preview-card {
          width: 535px;
          height: 261px;
          border-radius: 8px;
          background: #fff;
          box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.25);
          padding: 17px;
          display: flex;
          flex-direction: column;
        }

        .preview-header {
          margin-bottom: 14px;
        }

        .preview-title {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #000;
          text-align: center;
          margin: 0;
          line-height: 150%;
        }

        .preview-subjects {
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex: 1;
          overflow-y: auto;
        }

        .preview-subject {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 498px;
          height: 54px;
          border-radius: 5px;
          background: #d9d9d9;
          padding: 0 28px;
        }

        .preview-subject-name {
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #000;
          line-height: 150%;
        }

        .preview-delete-btn {
          display: flex;
          width: 87px;
          height: 31px;
          padding: 10px 24px;
          justify-content: center;
          align-items: center;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #fff;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          transition: all 0.2s ease;
        }

        .preview-delete-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .preview-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          color: #666;
          text-align: center;
        }

        .btn-add-course {
          width: 246px;
          height: 48px;
          background: #3B82F6;
          border-radius: 8px;
          border: none;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
          align-self: center;
        }

        .btn-add-course:hover {
          background: #2563eb;
        }

        @media (max-width: 1200px) {
          .modal-content {
            width: 90vw;
            height: auto;
            max-height: 90vh;
            flex-direction: column;
            gap: 30px;
          }

          .modal-form {
            max-width: none;
          }

          .form-input {
            width: 100%;
          }

          .preview-card {
            width: 100%;
          }

          .preview-subject {
            width: 100%;
          }
        }

        @media (max-width: 768px) {
          .modal-content {
            padding: 24px;
            margin: 20px;
          }

          .modal-title {
            font-size: 20px;
          }

          .form-label {
            font-size: 16px;
          }

          .preview-subject {
            padding: 0 16px;
            height: 48px;
          }

          .preview-delete-btn {
            width: 70px;
            height: 28px;
            padding: 8px 16px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

CourseManagementPage.propTypes = {
  classes: PropTypes.array,
  onNavigate: PropTypes.func.isRequired,
  currentView: PropTypes.string,
  role: PropTypes.string,
  collegeId: PropTypes.string,
  onDeleteSubject: PropTypes.func,
  teachers: PropTypes.array,
  onAddSubject: PropTypes.func
};

export default CourseManagementPage;

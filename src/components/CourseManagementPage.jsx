import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import AddSubjectModal from './AddSubjectModal.jsx';

const CourseManagementPage = ({
  classes = [],
  onNavigate,
  currentView = 'course',
  role,
  collegeId,
  onDeleteSubject,
  teachers = [],
  onAddSubject,
  programs = {}
}) => {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);


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

  // Render AddSubjectModal as isolated component to avoid parent re-render issues

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

      {showAddCourseModal && (
        <AddSubjectModal
          classes={classes}
          teachers={teachers}
          programs={programs}
          onAddSubject={onAddSubject}
          onClose={() => setShowAddCourseModal(false)}
        />
      )}

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
  onAddSubject: PropTypes.func,
  programs: PropTypes.object
};

export default CourseManagementPage;

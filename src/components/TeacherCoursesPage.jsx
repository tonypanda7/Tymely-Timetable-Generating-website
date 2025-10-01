import { useState, useMemo } from 'react';
import TeacherSidebar from './TeacherSidebar.jsx';

const TeacherCoursesPage = ({
  collegeId,
  onLogout,
  onNavigate,
  currentView = 'courses',
  classes = [],
  teachers = [],
}) => {
  const [courseRankings, setCourseRankings] = useState([]);

  // Get teacher info
  const currentTeacher = useMemo(() => {
    return teachers.find(t => t.id === collegeId) || { name: 'Shikha', expertise: '', preferences: [] };
  }, [teachers, collegeId]);

  // Get teacher's courses with rankings
  const teacherCourses = useMemo(() => {
    const courses = [];
    classes.forEach(cls => {
      if (cls.subjects) {
        cls.subjects.forEach(subject => {
          if (subject.teachers && subject.teachers.includes(collegeId)) {
            courses.push({
              id: `${subject.name}-${cls.name}`,
              name: subject.name,
              code: subject.code || generateCourseCode(subject.name),
              className: cls.name,
              credits: subject.credits || 3,
              progressColor: getProgressColor(subject.name),
              type: subject.courseType || 'major'
            });
          }
        });
      }
    });
    return courses;
  }, [classes, collegeId]);

  // Generate course code based on course name
  function generateCourseCode(courseName) {
    const codes = {
      'Cognitive Psychology': 'HS2001',
      'Operating System': 'CS2701',
      'Artificial Intelligence': 'CS2007',
      'Object Oriented Programming Lab': 'CS2007',
    };
    return codes[courseName] || 'CS2001';
  }

  // Get progress bar color based on course
  function getProgressColor(courseName) {
    const colors = {
      'Cognitive Psychology': '#595880',
      'Operating System': '#EAE9D5',
      'Artificial Intelligence': '#E6E593',
      'Object Oriented Programming Lab': '#F29B70',
    };
    return colors[courseName] || '#595880';
  }

  // Get classes assigned to teacher
  const teacherClasses = useMemo(() => {
    return classes.filter(cls => {
      return cls.subjects && cls.subjects.some(subject => 
        subject.teachers && subject.teachers.includes(collegeId)
      );
    }).map(cls => cls.name);
  }, [classes, collegeId]);

  const handleAddCourse = () => {
    console.log('Add course clicked');
  };

  const handleAddClass = () => {
    console.log('Add class clicked');
  };

  return (
    <div className="min-h-screen w-full bg-white overflow-hidden" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}>
      {/* Sidebar (fixed) */}
      <TeacherSidebar currentView={currentView} onNavigate={onNavigate} onLogout={onLogout} />
      {/* Sidebar (old, hidden) */}
      <aside className="hidden">
        {/* Header with hamburger */}
        <div className="relative pt-16 pb-8">
          <div className="absolute top-8 left-8">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 22.6666H28M4 15.9999H28M4 9.33325H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-8 space-y-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-4 text-black text-xl transition-all duration-200 ${
              currentView === 'dashboard' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
          >
            <svg width="32" height="27" viewBox="0 0 32 27" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6.65019H4.02559M4.02559 6.65019H27.9745M4.02559 6.65019C4 6.99863 4 7.42816 4 7.98044V18.6207C4 19.8622 4 20.4821 4.29065 20.9562C4.54631 21.3733 4.95396 21.7133 5.45573 21.9259C6.02561 22.1672 6.77201 22.1672 8.26259 22.1672L23.7375 22.1672C25.228 22.1672 25.9733 22.1672 26.5432 21.9259C27.045 21.7133 27.454 21.3733 27.7096 20.9562C28 20.4825 28 19.863 28 18.6239L28 7.9768C28 7.42627 28 6.99787 27.9745 6.65019M4.02559 6.65019C4.05752 6.21537 4.1293 5.90682 4.29065 5.64358C4.54631 5.22647 4.95396 4.8876 5.45573 4.67508C6.02616 4.43347 6.77345 4.43347 8.26693 4.43347H23.7336C25.2271 4.43347 25.9728 4.43347 26.5432 4.67508C27.045 4.8876 27.454 5.22647 27.7096 5.64358C27.871 5.90682 27.9427 6.21537 27.9745 6.65019M27.9745 6.65019H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Dashboard
          </button>

          <button 
            onClick={() => onNavigate('schedule')}
            className={`flex items-center gap-4 text-black text-xl transition-all duration-200 ${
              currentView === 'schedule' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.666 24.0001C22.666 24.7365 23.263 25.3334 23.9993 25.3334C24.7357 25.3334 25.3327 24.7365 25.3327 24.0001C25.3327 23.2637 24.7357 22.6667 23.9993 22.6667C23.263 22.6667 22.666 23.2637 22.666 24.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 24.0001C14.666 24.7365 15.263 25.3334 15.9993 25.3334C16.7357 25.3334 17.3327 24.7365 17.3327 24.0001C17.3327 23.2637 16.7357 22.6667 15.9993 22.6667C15.263 22.6667 14.666 23.2637 14.666 24.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 24.0001C6.66602 24.7365 7.26297 25.3334 7.99935 25.3334C8.73573 25.3334 9.33268 24.7365 9.33268 24.0001C9.33268 23.2637 8.73573 22.6667 7.99935 22.6667C7.26297 22.6667 6.66602 23.2637 6.66602 24.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 16.0001C22.666 16.7365 23.263 17.3334 23.9993 17.3334C24.7357 17.3334 25.3327 16.7365 25.3327 16.0001C25.3327 15.2637 24.7357 14.6667 23.9993 14.6667C23.263 14.6667 22.666 15.2637 22.666 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 16.0001C14.666 16.7365 15.263 17.3334 15.9993 17.3334C16.7357 17.3334 17.3327 16.7365 17.3327 16.0001C17.3327 15.2637 16.7357 14.6667 15.9993 14.6667C15.263 14.6667 14.666 15.2637 14.666 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 16.0001C6.66602 16.7365 7.26297 17.3334 7.99935 17.3334C8.73573 17.3334 9.33268 16.7365 9.33268 16.0001C9.33268 15.2637 8.73573 14.6667 7.99935 14.6667C7.26297 14.6667 6.66602 15.2637 6.66602 16.0001Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22.666 8.00008C22.666 8.73646 23.263 9.33341 23.9993 9.33341C24.7357 9.33341 25.3327 8.73646 25.3327 8.00008C25.3327 7.2637 24.7357 6.66675 23.9993 6.66675C23.263 6.66675 22.666 7.2637 22.666 8.00008Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.666 8.00008C14.666 8.73646 15.263 9.33341 15.9993 9.33341C16.7357 9.33341 17.3327 8.73646 17.3327 8.00008C17.3327 7.2637 16.7357 6.66675 15.9993 6.66675C15.263 6.66675 14.666 7.2637 14.666 8.00008Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.66602 8.00008C6.66602 8.73646 7.26297 9.33341 7.99935 9.33341C8.73573 9.33341 9.33268 8.73646 9.33268 8.00008C9.33268 7.2637 8.73573 6.66675 7.99935 6.66675C7.26297 6.66675 6.66602 7.2637 6.66602 8.00008Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Schedule
          </button>

          <button
            onClick={() => onNavigate('courses')}
            className={`flex items-center gap-4 text-black text-xl transition-all duration-200 ${
              currentView === 'courses' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.0007 5.33325L20.0007 26.6666M20.0007 5.33325H9.60091C8.10744 5.33325 7.36014 5.33325 6.78971 5.6239C6.28795 5.87956 5.8803 6.28722 5.62463 6.78898C5.33398 7.35941 5.33398 8.10671 5.33398 9.60018V22.4002C5.33398 23.8937 5.33398 24.6393 5.62463 25.2098C5.8803 25.7115 6.28795 26.1206 6.78971 26.3762C7.35959 26.6666 8.10599 26.6666 9.59658 26.6666L20.0007 26.6666M20.0007 5.33325H22.4009C23.8944 5.33325 24.6401 5.33325 25.2105 5.6239C25.7123 5.87956 26.1213 6.28722 26.377 6.78898C26.6673 7.35885 26.6673 8.10525 26.6673 9.5958L26.6673 22.404C26.6673 23.8946 26.6673 24.6399 26.377 25.2098C26.1213 25.7115 25.7123 26.1206 25.2105 26.3762C24.6406 26.6666 23.8953 26.6666 22.4048 26.6666H20.0007" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Course
          </button>

          <button 
            onClick={() => onNavigate('notification')}
            className={`flex items-center gap-4 text-black text-xl transition-all duration-200 ${
              currentView === 'notification' ? 'font-medium' : 'font-light hover:font-medium'
            }`}
          >
            <svg width="35" height="32" viewBox="0 0 35 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.8757 22.6666V24C21.8757 26.2091 19.9169 28 17.5007 28C15.0844 28 13.1257 26.2091 13.1257 24V22.6666M21.8757 22.6666H13.1257M21.8757 22.6666H27.1118C27.6696 22.6666 27.9499 22.6666 28.1758 22.597C28.6073 22.4639 28.9449 22.1542 29.0904 21.7597C29.1669 21.5524 29.1669 21.2953 29.1669 20.7812C29.1669 20.5563 29.1666 20.4438 29.1474 20.3366C29.111 20.1339 29.025 19.9418 28.894 19.7749C28.8247 19.6868 28.7367 19.6063 28.5633 19.4478L27.9952 18.9284C27.812 18.7608 27.709 18.5335 27.709 18.2965V13.3333C27.709 8.17865 23.1386 3.99997 17.5007 3.99998C11.8628 3.99999 7.29232 8.17866 7.29232 13.3333V18.2966C7.29232 18.5335 7.18913 18.7608 7.00585 18.9284L6.43783 19.4477C6.26386 19.6068 6.17675 19.6867 6.10742 19.775C5.9764 19.9418 5.88961 20.1339 5.85323 20.3366C5.83398 20.4438 5.83398 20.5563 5.83398 20.7813C5.83398 21.2953 5.83398 21.5523 5.91048 21.7596C6.05602 22.1541 6.39515 22.4639 6.82662 22.597C7.05251 22.6666 7.33171 22.6666 7.88959 22.6666H13.1257M26.2777 2.68488C28.2891 4.07063 29.8736 5.909 30.8771 8.02096M8.72435 2.68488C6.713 4.07063 5.12844 5.909 4.125 8.02096" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Notification
          </button>
        </nav>

        {/* User section at bottom */}
        <div className="mt-auto mb-8 px-8">
          <div className="flex items-center gap-4 text-black text-xl font-light mb-4">
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.3499 6.6922L19.9837 6.5394C19.9269 6.51567 19.8989 6.50377 19.8714 6.49143C19.5983 6.36874 19.3682 6.19923 19.2002 5.99642C19.1833 5.97602 19.1674 5.95462 19.1348 5.91232C19.1023 5.87008 19.0858 5.84868 19.0706 5.82749C18.92 5.6165 18.8385 5.38136 18.8336 5.14205C18.8331 5.11799 18.8332 5.0934 18.8343 5.04453L18.8415 4.72559C18.8529 4.21519 18.8587 3.9592 18.763 3.72946C18.6781 3.5254 18.536 3.33744 18.3462 3.17794C18.1317 2.99764 17.8347 2.86901 17.2402 2.61207L16.7464 2.39865C16.1536 2.14243 15.8571 2.01428 15.5423 1.96543C15.2639 1.9222 14.9765 1.92421 14.6991 1.97092C14.3859 2.02364 14.0931 2.15513 13.5079 2.41797L13.5045 2.41916L13.1507 2.57806C13.0948 2.60318 13.0665 2.61585 13.0384 2.62754C12.7601 2.74358 12.4495 2.80774 12.1312 2.8154C12.0992 2.81617 12.0665 2.81617 12.0013 2.81617C11.9365 2.81617 11.9024 2.81617 11.8704 2.8154C11.5515 2.80771 11.2402 2.7432 10.9615 2.62668C10.9334 2.61493 10.9056 2.60217 10.8496 2.57693L10.4935 2.4166C9.90422 2.15127 9.60915 2.01841 9.29427 1.96543C9.0157 1.91855 8.72737 1.91725 8.44791 1.96103C8.13236 2.01046 7.83577 2.13957 7.24258 2.39777L7.23994 2.39865L6.75228 2.61093L6.74688 2.61341C6.15904 2.86929 5.86441 2.99754 5.6517 3.1771C5.46294 3.33645 5.32185 3.52411 5.2374 3.72763C5.14194 3.95768 5.14703 4.21422 5.15853 4.72702L5.16568 5.04552C5.16676 5.09375 5.16864 5.11771 5.16817 5.14143C5.16343 5.38124 5.08086 5.61685 4.92974 5.82822C4.9148 5.84912 4.8987 5.87003 4.86654 5.91178C4.83436 5.95356 4.81877 5.97434 4.80209 5.99451C4.63336 6.19839 4.40214 6.3689 4.12733 6.49179C4.10015 6.50395 4.0715 6.51564 4.01521 6.53903L3.65365 6.68931C3.05208 6.93934 2.75137 7.06446 2.53256 7.24252C2.33898 7.40004 2.19275 7.58689 2.10349 7.79038C2.00259 8.0204 2.00267 8.27834 2.00424 8.79416L2.00551 9.21576C2.00706 9.72813 2.00919 9.98415 2.11032 10.2126C2.19979 10.4147 2.34495 10.6005 2.53744 10.7571C2.75502 10.934 3.05274 11.0584 3.64974 11.3075L4.00808 11.457C4.06907 11.4824 4.09976 11.495 4.12917 11.5083C4.40148 11.6312 4.63089 11.8013 4.79818 12.004C4.81625 12.0259 4.8336 12.0486 4.8683 12.0941C4.90256 12.139 4.92009 12.1614 4.93594 12.1839C5.08261 12.3922 5.16114 12.6236 5.16649 12.8591C5.16707 12.8845 5.16658 12.9103 5.16541 12.962L5.15853 13.2676C5.14695 13.7822 5.1419 14.0398 5.23792 14.2705C5.32287 14.4745 5.46484 14.6625 5.65463 14.822C5.86915 15.0023 6.16655 15.1308 6.76107 15.3878L7.25478 15.6012C7.84763 15.8574 8.14395 15.9854 8.45869 16.0342C8.73714 16.0775 9.02464 16.0758 9.30209 16.0291C9.61567 15.9763 9.90948 15.8443 10.4964 15.5807L10.8502 15.4218C10.9062 15.3967 10.9346 15.3841 10.9626 15.3724C11.2409 15.2564 11.5512 15.1919 11.8695 15.1842C11.9015 15.1834 11.9342 15.1834 11.9994 15.1834C12.0648 15.1834 12.0974 15.1834 12.1295 15.1842C12.4484 15.1919 12.7607 15.2566 13.0394 15.3731C13.0639 15.3834 13.0885 15.3945 13.1316 15.4139L13.5078 15.5833C14.0971 15.8486 14.3916 15.9811 14.7065 16.0341C14.985 16.081 15.2736 16.0829 15.5531 16.0391C15.8685 15.9897 16.1657 15.8603 16.7586 15.6023L17.2536 15.3868C17.8418 15.1307 18.1367 15.0023 18.3495 14.8227C18.5383 14.6634 18.6796 14.4758 18.764 14.2723C18.8588 14.0439 18.8531 13.7893 18.8417 13.2839L18.8343 12.9543C18.8332 12.9061 18.8331 12.8821 18.8336 12.8584C18.8383 12.6186 18.9195 12.3828 19.0706 12.1714C19.0856 12.1506 19.1018 12.1295 19.1338 12.0879C19.166 12.0461 19.1827 12.0253 19.1994 12.0051C19.3681 11.8012 19.5995 11.6306 19.8744 11.5077C19.9012 11.4957 19.9289 11.4842 19.9838 11.4613L19.9857 11.4607L20.3472 11.3104C20.9488 11.0604 21.2501 10.9351 21.4689 10.7571C21.6625 10.5995 21.8085 10.4129 21.8978 10.2095C21.9981 9.98078 21.9973 9.72435 21.9958 9.21455L21.9945 8.78391C21.9929 8.27153 21.9921 8.01555 21.891 7.78708C21.8015 7.58496 21.6555 7.39921 21.463 7.24264C21.2457 7.06583 20.9475 6.94144 20.3517 6.69283L20.3499 6.6922Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8.00033 8.99997C8.00033 10.6568 9.79119 12 12.0003 12C14.2095 12 16.0003 10.6568 16.0003 8.99997C16.0003 7.34312 14.2095 5.99997 12.0003 5.99997C9.79119 5.99997 8.00033 7.34312 8.00033 8.99997Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Settings
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 text-black text-xl font-light hover:font-medium transition-all duration-200"
          >
            <svg width="32" height="23" viewBox="0 0 32 23" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25.3327 20.125C25.3327 16.4201 21.154 13.4167 15.9993 13.4167C10.8447 13.4167 6.66602 16.4201 6.66602 20.125M15.9993 10.5417C13.0538 10.5417 10.666 8.82542 10.666 6.70833C10.666 4.59124 13.0538 2.875 15.9993 2.875C18.9449 2.875 21.3327 4.59124 21.3327 6.70833C21.3327 8.82542 18.9449 10.5417 15.9993 10.5417Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {currentTeacher.name || 'Shikha'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="overflow-hidden min-w-0" style={{ marginLeft: 'var(--teacher-sidebar-width, 246px)' }}>
        {/* Mobile Header - only show on small screens */}
        <div className="md:hidden p-4 bg-white shadow-sm border-b">
          <div className="flex items-center justify-between">
            <button className="p-2 rounded-lg bg-gray-100">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 22.6666H28M4 15.9999H28M4 9.33325H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <h1 className="text-2xl font-semibold text-black" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}>
              Course
            </h1>
            <div className="w-8"></div>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="p-8 pb-4 hidden md:block">
          <h1 className="text-6xl font-semibold text-black capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontWeight: 700 }}>
            Course
          </h1>
        </header>

        {/* Content area */}
        <div className="px-4 md:px-8 pb-8 flex flex-col lg:flex-row gap-8 overflow-x-auto">
          {/* Left side - Course List */}
          <div className="flex-1 min-w-0">
            <div className="mb-6">
              <h2 className="text-3xl font-light text-black mb-2 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}>
                Course List
              </h2>
              <p className="text-base font-light text-black" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', textTransform: 'lowercase' }}>
                These are the courses allotted for you
              </p>
            </div>

            {/* Course Cards */}
            <div className="space-y-4 max-w-4xl">
              {/* Cognitive Psychology Card */}
              <div className="bg-white rounded-2xl shadow-lg relative h-19" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: 'min(744px, 100%)', height: '76px', minWidth: '320px' }}>
                <div className="absolute left-10 top-4">
                  <h3 className="text-lg font-medium text-black mb-1 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '17px' }}>
                    Cognitive Psychology
                  </h3>
                  <p className="text-lg text-black" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '17px' }}>
                    HS2001
                  </p>
                </div>
                <button className="absolute left-8 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg font-bold" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', left: '300px', fontSize: '17px', color: '#A0A0A0' }}>
                  : : :
                </button>
                <div className="absolute right-8 bottom-4" style={{ right: '32px' }}>
                  <div className="w-28 h-2 rounded-full" style={{ background: '#595880', width: '114px', height: '9px' }}></div>
                </div>
              </div>

              {/* Operating System Card */}
              <div className="bg-white rounded-2xl shadow-lg relative" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: 'min(744px, 100%)', height: '76px', minWidth: '320px' }}>
                <div className="absolute left-10 top-4">
                  <h3 className="text-base font-medium text-black mb-1 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '15px' }}>
                    Operating System
                  </h3>
                  <p className="text-base text-black" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '15px' }}>
                    CS2701
                  </p>
                </div>
                <button className="absolute text-gray-400 text-lg font-bold" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', left: '300px', top: '50%', transform: 'translateY(-50%)', fontSize: '17px', color: '#A0A0A0' }}>
                  : : :
                </button>
                <div className="absolute right-8 bottom-4" style={{ right: '32px' }}>
                  <div className="w-28 h-2 rounded-full" style={{ background: '#EAE9D5', width: '114px', height: '9px' }}></div>
                </div>
              </div>

              {/* Artificial Intelligence Card */}
              <div className="bg-white rounded-2xl shadow-lg relative" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: 'min(744px, 100%)', height: '74px', minWidth: '320px' }}>
                <div className="absolute left-10 top-4">
                  <h3 className="text-base font-medium text-black mb-1 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '15px' }}>
                    Artificial Intelligence
                  </h3>
                  <p className="text-base text-black" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '15px' }}>
                    CS2007
                  </p>
                </div>
                <button className="absolute text-gray-400 text-lg font-bold" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', left: '300px', top: '50%', transform: 'translateY(-50%)', fontSize: '17px', color: '#A0A0A0' }}>
                  : : :
                </button>
                <div className="absolute right-8 bottom-4" style={{ right: '32px' }}>
                  <div className="w-28 h-2 rounded-full" style={{ background: '#E6E593', width: '114px', height: '9px' }}></div>
                </div>
              </div>

              {/* Object Oriented Programming Lab Card */}
              <div className="bg-white rounded-2xl shadow-lg relative" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: 'min(744px, 100%)', height: '81px', minWidth: '320px' }}>
                <div className="absolute left-10 top-4">
                  <h3 className="text-base font-medium text-black mb-1 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '15px' }}>
                    Object Oriented Programming Lab
                  </h3>
                  <p className="text-base text-black" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '15px' }}>
                    CS2007
                  </p>
                </div>
                <button className="absolute text-gray-400 text-lg font-bold" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', left: '300px', top: '50%', transform: 'translateY(-50%)', fontSize: '17px', color: '#A0A0A0' }}>
                  : : :
                </button>
                <div className="absolute right-8 bottom-4" style={{ right: '40px' }}>
                  <div className="w-28 h-1.5 rounded-full" style={{ background: '#F29B70', width: '114px', height: '6px' }}></div>
                </div>
              </div>

            </div>
          </div>

          {/* Right side - Class List */}
          <div className="w-full lg:w-80 lg:ml-20">
            <div className="mb-6">
              <h2 className="text-3xl font-light text-black mb-2 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '30px' }}>
                Class List
              </h2>
            </div>

            {/* Class Cards */}
            <div className="space-y-4 grid grid-cols-2 gap-4 lg:grid-cols-1 lg:space-y-4 lg:gap-0">
              {/* IoT A */}
              <div className="bg-white rounded-2xl shadow-lg flex items-center justify-center text-center" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '148px', height: '66px', minHeight: '60px' }}>
                <h3 className="text-xl font-medium text-black capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px' }}>
                  IoT A
                </h3>
              </div>

              {/* IoT B */}
              <div className="bg-white rounded-2xl shadow-lg flex items-center justify-center text-center" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '148px', height: '63px', minHeight: '60px' }}>
                <h3 className="text-xl font-medium text-black capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px' }}>
                  IoT B
                </h3>
              </div>

              {/* Cyber */}
              <div className="bg-white rounded-2xl shadow-lg flex items-center justify-center text-center" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '148px', height: '63px', minHeight: '60px' }}>
                <h3 className="text-xl font-medium text-black capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px' }}>
                  Cyber
                </h3>
              </div>

              {/* AIDS B */}
              <div className="bg-white rounded-2xl shadow-lg flex items-center justify-center text-center" style={{ boxShadow: '4px 4px 30px 0 rgba(0, 0, 0, 0.25)', width: '100%', maxWidth: '148px', height: '61px', minHeight: '60px' }}>
                <h3 className="text-xl font-medium text-black capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px' }}>
                  AIDS B
                </h3>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherCoursesPage;

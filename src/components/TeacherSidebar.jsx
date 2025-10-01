import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

const TeacherSidebar = ({ currentView, onNavigate, onLogout }) => {
  const [collapsed, setCollapsed] = useState(false);
  const expandedWidth = 246; // keep teacher style width
  const collapsedWidth = 80;

  useEffect(() => {
    const w = collapsed ? collapsedWidth : expandedWidth;
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--teacher-sidebar-width', `${w}px`);
      document.body.classList.toggle('teacher-sidebar-collapsed', collapsed);
    }
  }, [collapsed]);

  return (
    <aside
      className="fixed left-0 top-6 bottom-6 flex flex-col shadow-lg overflow-hidden"
      style={{ background: '#E1F3FF', borderRadius: '0 50px 50px 0', width: `var(--teacher-sidebar-width, ${expandedWidth}px)`, zIndex: 50 }}
    >
      {/* Hamburger Menu */}
      <button
        aria-label="Toggle sidebar"
        onClick={() => setCollapsed(v => !v)}
        className="absolute top-6 left-2"
      >
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 22.6666H28M4 16H28M4 9.33331H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {/* Navigation */}
      <nav className={`${collapsed ? 'items-center px-0' : 'px-8'} flex flex-col gap-8 mt-40`}>
        <button
          onClick={() => onNavigate('dashboard')}
          className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
            currentView === 'dashboard' ? 'font-medium' : 'font-light hover:font-medium'
          }`}
          style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
        >
          <svg width="32" height="27" viewBox="0 0 32 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6.65019H4.02559M4.02559 6.65019H27.9745M4.02559 6.65019C4 6.99863 4 7.42816 4 7.98044V18.6207C4 19.8622 4 20.4821 4.29065 20.9562C4.54631 21.3733 4.95396 21.7133 5.45573 21.9259C6.02561 22.1672 6.77201 22.1672 8.26259 22.1672L23.7375 22.1672C25.228 22.1672 25.9733 22.1672 26.5432 21.9259C27.045 21.7133 27.454 21.3733 27.7096 20.9562C28 20.4825 28 19.863 28 18.6239L28 7.9768C28 7.42627 28 6.99787 27.9745 6.65019M4.02559 6.65019C4.05752 6.21537 4.1293 5.90682 4.29065 5.64358C4.54631 5.22647 4.95396 4.8876 5.45573 4.67508C6.02616 4.43347 6.77345 4.43347 8.26693 4.43347H23.7336C25.2271 4.43347 25.9728 4.43347 26.5432 4.67508C27.045 4.8876 27.454 5.22647 27.7096 5.64358C27.871 5.90682 27.9427 6.21537 27.9745 6.65019M27.9745 6.65019H28" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`${collapsed ? 'hidden' : ''}`}>Dashboard</span>
        </button>

        <button
          onClick={() => onNavigate('schedule')}
          className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
            currentView === 'schedule' ? 'font-medium' : 'font-light hover:font-medium'
          }`}
          style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.666 24C22.666 24.7363 23.263 25.3333 23.9993 25.3333C24.7357 25.3333 25.3327 24.7363 25.3327 24C25.3327 23.2636 24.7357 22.6666 23.9993 22.6666C23.263 22.6666 22.666 23.2636 22.666 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14.666 24C14.666 24.7363 15.263 25.3333 15.9993 25.3333C16.7357 25.3333 17.3327 24.7363 17.3327 24C17.3327 23.2636 16.7357 22.6666 15.9993 22.6666C15.263 22.6666 14.666 23.2636 14.666 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.66602 24C6.66602 24.7363 7.26297 25.3333 7.99935 25.3333C8.73573 25.3333 9.33268 24.7363 9.33268 24C9.33268 23.2636 8.73573 22.6666 7.99935 22.6666C7.26297 22.6666 6.66602 23.2636 6.66602 24Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22.666 16C22.666 16.7363 23.263 17.3333 23.9993 17.3333C24.7357 17.3333 25.3327 16.7363 25.3327 16C25.3327 15.2636 24.7357 14.6666 23.9993 14.6666C23.263 14.6666 22.666 15.2636 22.666 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14.666 16C14.666 16.7363 15.263 17.3333 15.9993 17.3333C16.7357 17.3333 17.3327 16.7363 17.3327 16C17.3327 15.2636 16.7357 14.6666 15.9993 14.6666C15.263 14.6666 14.666 15.2636 14.666 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.66602 16C6.66602 16.7363 7.26297 17.3333 7.99935 17.3333C8.73573 17.3333 9.33268 16.7363 9.33268 16C9.33268 15.2636 8.73573 14.6666 7.99935 14.6666C7.26297 14.6666 6.66602 15.2636 6.66602 16Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22.666 8.00002C22.666 8.7364 23.263 9.33335 23.9993 9.33335C24.7357 9.33335 25.3327 8.7364 25.3327 8.00002C25.3327 7.26364 24.7357 6.66669 23.9993 6.66669C23.263 6.66669 22.666 7.26364 22.666 8.00002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14.666 8.00002C14.666 8.7364 15.263 9.33335 15.9993 9.33335C16.7357 9.33335 17.3327 8.7364 17.3327 8.00002C17.3327 7.26364 16.7357 6.66669 15.9993 6.66669C15.263 6.66669 14.666 7.26364 14.666 8.00002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6.66602 8.00002C6.66602 8.7364 7.26297 9.33335 7.99935 9.33335C8.73573 9.33335 9.33268 8.7364 9.33268 8.00002C9.33268 7.26364 8.73573 6.66669 7.99935 6.66669C7.26297 6.66669 6.66602 7.26364 6.66602 8.00002Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`${collapsed ? 'hidden' : ''}`}>Schedule</span>
        </button>

        <button
          onClick={() => onNavigate('courses')}
          className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
            currentView === 'courses' ? 'font-medium' : 'font-light hover:font-medium'
          }`}
          style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.0007 5.33331L20.0007 26.6666M20.0007 5.33331H9.60091C8.10744 5.33331 7.36014 5.33331 6.78971 5.62396C6.28795 5.87963 5.8803 6.28728 5.62463 6.78904C5.33398 7.35947 5.33398 8.10677 5.33398 9.60024V22.4002C5.33398 23.8937 5.33398 24.6394 5.62463 25.2098C5.8803 25.7116 6.28795 26.1206 6.78971 26.3763C7.35959 26.6666 8.10599 26.6666 9.59658 26.6666L20.0007 26.6666M20.0007 5.33331H22.4009C23.8944 5.33331 24.6401 5.33331 25.2105 5.62396C25.7123 5.87962 26.1213 6.28728 26.377 6.78904C26.6673 7.35891 26.6673 8.10531 26.6673 9.59586L26.6673 22.4041C26.6673 23.8946 26.6673 24.64 26.377 25.2098C26.1213 25.7116 25.7123 26.1206 25.2105 26.3763C24.6406 26.6666 23.8953 26.6666 22.4048 26.6666H20.0007" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`${collapsed ? 'hidden' : ''}`}>Course</span>
        </button>

        <button
          onClick={() => onNavigate('notification')}
          className={`flex ${collapsed ? 'justify-center' : 'items-center gap-4'} text-black text-xl transition-all duration-200 ${
            currentView === 'notification' ? 'font-medium' : 'font-light hover:font-medium'
          }`}
          style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}
        >
          <svg width="35" height="32" viewBox="0 0 35 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.8757 22.6667V24C21.8757 26.2092 19.9169 28 17.5007 28C15.0844 28 13.1257 26.2092 13.1257 24V22.6667M21.8757 22.6667H13.1257M21.8757 22.6667H27.1118C27.6696 22.6667 27.9499 22.6667 28.1758 22.597C28.6073 22.464 28.9449 22.1542 29.0904 21.7598C29.1669 21.5524 29.1669 21.2954 29.1669 20.7813C29.1669 20.5563 29.1666 20.4439 29.1474 20.3366C29.111 20.134 29.025 19.9418 28.894 19.775C28.8247 19.6869 28.7367 19.6064 28.5633 19.4478L27.9952 18.9284C27.812 18.7609 27.709 18.5336 27.709 18.2966V13.3334C27.709 8.17871 23.1386 4.00003 17.5007 4.00004C11.8628 4.00005 7.29232 8.17873 7.29232 13.3334V18.2966C7.29232 18.5336 7.18913 18.7609 7.00585 18.9284L6.43783 19.4478C6.26386 19.6068 6.17675 19.6868 6.10742 19.775C5.9764 19.9419 5.88961 20.134 5.85323 20.3366C5.83398 20.4439 5.83398 20.5564 5.83398 20.7813C5.83398 21.2954 5.83398 21.5524 5.91048 21.7597C6.05602 22.1542 6.39515 22.464 6.82662 22.597C7.05251 22.6667 7.33171 22.6667 7.88959 22.6667H13.1257M26.2777 2.68494C28.2891 4.07069 29.8736 5.90906 30.8771 8.02102M8.72435 2.68494C6.713 4.07069 5.12844 5.90906 4.125 8.02102" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`${collapsed ? 'hidden' : ''}`}>Notification</span>
        </button>
      </nav>

      {/* Bottom section */}
      <div className={`${collapsed ? 'px-0' : 'px-8'} mt-auto mb-8`}>
        <button 
          onClick={onLogout}
          className={`flex items-center gap-4 text-black text-xl font-light hover:font-medium transition-all duration-200 ${collapsed ? 'justify-center w-full' : ''}`}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25.3327 28C25.3327 22.8453 21.154 18.6667 15.9993 18.6667C10.8447 18.6667 6.66602 22.8453 6.66602 28M15.9993 14.6667C13.0538 14.6667 10.666 12.2789 10.666 9.33333C10.666 6.38781 13.0538 4 15.9993 4C18.9449 4 21.3327 6.38781 21.3327 9.33333C21.3327 12.2789 18.9449 14.6667 15.9993 14.6667Z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={`${collapsed ? 'hidden' : ''}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
};

TeacherSidebar.propTypes = {
  currentView: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  onLogout: PropTypes.func,
};

export default TeacherSidebar;

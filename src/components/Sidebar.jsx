import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

const Sidebar = ({ currentView, onNavigate, role, collegeId, variant = 'dark', onLogout }) => {
  const isActive = (itemId) => currentView === itemId;
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const cls = 'sidebar-collapsed';
      if (isCollapsed) document.body.classList.add(cls);
      else document.body.classList.remove(cls);
    }
  }, [isCollapsed]);

  const menuItems = [
    {
      id: 'student-timetable',
      label: 'Student\nTimetable',
      icon: (
        <svg width="29" height="32" viewBox="0 0 29 32" fill="none">
          <path d="M20.541 24.0001C20.541 24.7365 21.082 25.3334 21.7493 25.3334C22.4167 25.3334 22.9577 24.7365 22.9577 24.0001C22.9577 23.2637 22.4167 22.6667 21.7493 22.6667C21.082 22.6667 20.541 23.2637 20.541 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 24.0001C13.291 24.7365 13.832 25.3334 14.4993 25.3334C15.1667 25.3334 15.7077 24.7365 15.7077 24.0001C15.7077 23.2637 15.1667 22.6667 14.4993 22.6667C13.832 22.6667 13.291 23.2637 13.291 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 24.0001C6.04102 24.7365 6.582 25.3334 7.24935 25.3334C7.91669 25.3334 8.45768 24.7365 8.45768 24.0001C8.45768 23.2637 7.91669 22.6667 7.24935 22.6667C6.582 22.6667 6.04102 23.2637 6.04102 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.541 16.0001C20.541 16.7365 21.082 17.3334 21.7493 17.3334C22.4167 17.3334 22.9577 16.7365 22.9577 16.0001C22.9577 15.2637 22.4167 14.6667 21.7493 14.6667C21.082 14.6667 20.541 15.2637 20.541 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 16.0001C13.291 16.7365 13.832 17.3334 14.4993 17.3334C15.1667 17.3334 15.7077 16.7365 15.7077 16.0001C15.7077 15.2637 15.1667 14.6667 14.4993 14.6667C13.832 14.6667 13.291 15.2637 13.291 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 16.0001C6.04102 16.7365 6.582 17.3334 7.24935 17.3334C7.91669 17.3334 8.45768 16.7365 8.45768 16.0001C8.45768 23.2637 7.91669 14.6667 7.24935 14.6667C6.582 14.6667 6.04102 15.2637 6.04102 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.541 8.00008C20.541 8.73646 21.082 9.33341 21.7493 9.33341C22.4167 9.33341 22.9577 8.73646 22.9577 8.00008C22.9577 7.2637 22.4167 6.66675 21.7493 6.66675C21.082 6.66675 20.541 7.2637 20.541 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 8.00008C13.291 8.73646 13.832 9.33341 14.4993 9.33341C15.1667 9.33341 15.7077 8.73646 15.7077 8.00008C15.7077 7.2637 15.1667 6.66675 14.4993 6.66675C13.832 6.66675 13.291 7.2637 13.291 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 8.00008C6.04102 8.73646 6.582 9.33341 7.24935 9.33341C7.91669 9.33341 8.45768 8.73646 8.45768 8.00008C8.45768 7.2637 7.91669 6.66675 7.24935 6.66675C6.582 6.66675 6.04102 7.2637 6.04102 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      visible: role === 'admin'
    },
    {
      id: 'teacher-timetable',
      label: 'Teacher\nTimetable',
      icon: (
        <svg width="29" height="32" viewBox="0 0 29 32" fill="none">
          <path d="M20.541 24.0001C20.541 24.7365 21.082 25.3334 21.7493 25.3334C22.4167 25.3334 22.9577 24.7365 22.9577 24.0001C22.9577 23.2637 22.4167 22.6667 21.7493 22.6667C21.082 22.6667 20.541 23.2637 20.541 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 24.0001C13.291 24.7365 13.832 25.3334 14.4993 25.3334C15.1667 25.3334 15.7077 24.7365 15.7077 24.0001C15.7077 23.2637 15.1667 22.6667 14.4993 22.6667C13.832 22.6667 13.291 23.2637 13.291 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 24.0001C6.04102 24.7365 6.582 25.3334 7.24935 25.3334C7.91669 25.3334 8.45768 24.7365 8.45768 24.0001C8.45768 23.2637 7.91669 22.6667 7.24935 22.6667C6.582 22.6667 6.04102 23.2637 6.04102 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.541 16.0001C20.541 16.7365 21.082 17.3334 21.7493 17.3334C22.4167 17.3334 22.9577 16.7365 22.9577 16.0001C22.9577 15.2637 22.4167 14.6667 21.7493 14.6667C21.082 14.6667 20.541 15.2637 20.541 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 16.0001C13.291 16.7365 13.832 17.3334 14.4993 17.3334C15.1667 17.3334 15.7077 16.7365 15.7077 16.0001C15.7077 15.2637 15.1667 14.6667 14.4993 14.6667C13.832 14.6667 13.291 15.2637 13.291 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 16.0001C6.04102 16.7365 6.582 17.3334 7.24935 17.3334C7.91669 17.3334 8.45768 16.7365 8.45768 16.0001C8.45768 15.2637 7.91669 14.6667 7.24935 14.6667C6.582 14.6667 6.04102 15.2637 6.04102 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.541 8.00008C20.541 8.73646 21.082 9.33341 21.7493 9.33341C22.4167 9.33341 22.9577 8.73646 22.9577 8.00008C22.9577 7.2637 22.4167 6.66675 21.7493 6.66675C21.082 6.66675 20.541 7.2637 20.541 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 8.00008C13.291 8.73646 13.832 9.33341 14.4993 9.33341C15.1667 9.33341 15.7077 8.73646 15.7077 8.00008C15.7077 7.2637 15.1667 6.66675 14.4993 6.66675C13.832 6.66675 13.291 7.2637 13.291 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 8.00008C6.04102 8.73646 6.582 9.33341 7.24935 9.33341C7.91669 9.33341 8.45768 8.73646 8.45768 8.00008C8.45768 7.2637 7.91669 6.66675 7.24935 6.66675C6.582 6.66675 6.04102 7.2637 6.04102 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      visible: role === 'admin'
    },
    {
      id: 'course',
      label: 'Course',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 22H21V20H6.012C5.55 19.988 5 19.805 5 19C5 18.195 5.55 18.012 6.012 18H21V4C21 2.897 20.103 2 19 2H6C4.794 2 3 2.799 3 5V19C3 21.201 4.794 22 6 22ZM5 8V5C5 4.195 5.55 4.012 6 4H19V16H5V8Z" fill={isActive('course') ? '#155DFC' : 'white'}/>
          <path d="M8 6H17V8H8V6Z" fill={isActive('course') ? '#155DFC' : 'white'}/>
        </svg>
      ),
      visible: role === 'admin'
    },
    {
      id: 'cancellation-requests',
      label: 'Cancellation\nrequests',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M6 22H21V20H6.012C5.55 19.988 5 19.805 5 19C5 18.195 5.55 18.012 6.012 18H21V4C21 2.897 20.103 2 19 2H6C4.794 2 3 2.799 3 5V19C3 21.201 4.794 22 6 22ZM5 8V5C5 4.195 5.55 4.012 6 4H19V16H5V8Z" fill="white"/>
          <path d="M8 6H17V8H8V6Z" fill="white"/>
        </svg>
      ),
      visible: role === 'admin'
    },
    {
      id: 'simulation',
      label: 'Simulation',
      icon: (
        <svg width="29" height="33" viewBox="0 0 29 33" fill="none">
          <path d="M3.625 8.21883H3.64819M3.64819 8.21883H25.3519M3.64819 8.21883C3.625 8.64946 3.625 9.1803 3.625 9.86285V23.0129C3.625 24.5472 3.625 25.3132 3.8884 25.8993C4.1201 26.4148 4.48953 26.835 4.94425 27.0976C5.46071 27.3959 6.13713 27.3959 7.48797 27.3959L21.5121 27.3959C22.8629 27.3959 23.5383 27.3959 24.0548 27.0976C24.5095 26.835 24.8802 26.4148 25.1119 25.8993C25.375 25.3138 25.375 24.5481 25.375 23.0168L25.375 9.85834C25.375 9.17797 25.375 8.64851 25.3519 8.21883M3.64819 8.21883C3.67713 7.68144 3.74218 7.30011 3.8884 6.97478C4.12009 6.4593 4.48953 6.0405 4.94425 5.77785C5.46121 5.47925 6.13844 5.47925 7.4919 5.47925H21.5086C22.862 5.47925 23.5378 5.47925 24.0548 5.77784C24.5095 6.0405 24.8802 6.4593 25.1119 6.97478C25.2581 7.30011 25.3231 7.68144 25.3519 8.21883M25.3519 8.21883H25.375" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      visible: role === 'admin'
    },
    {
      id: 'admin-upload',
      label: 'Upload & Settings',
      icon: (
        <svg width="29" height="32" viewBox="0 0 29 32" fill="none">
          <path d="M20.541 24.0001C20.541 24.7365 21.082 25.3334 21.7493 25.3334C22.4167 25.3334 22.9577 24.7365 22.9577 24.0001C22.9577 23.2637 22.4167 22.6667 21.7493 22.6667C21.082 22.6667 20.541 23.2637 20.541 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 24.0001C13.291 24.7365 13.832 25.3334 14.4993 25.3334C15.1667 25.3334 15.7077 24.7365 15.7077 24.0001C15.7077 23.2637 15.1667 22.6667 14.4993 22.6667C13.832 22.6667 13.291 23.2637 13.291 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 24.0001C6.04102 24.7365 6.582 25.3334 7.24935 25.3334C7.91669 25.3334 8.45768 24.7365 8.45768 24.0001C8.45768 23.2637 7.91669 22.6667 7.24935 22.6667C6.582 22.6667 6.04102 23.2637 6.04102 24.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.541 16.0001C20.541 16.7365 21.082 17.3334 21.7493 17.3334C22.4167 17.3334 22.9577 16.7365 22.9577 16.0001C22.9577 15.2637 22.4167 14.6667 21.7493 14.6667C21.082 14.6667 20.541 15.2637 20.541 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 16.0001C13.291 16.7365 13.832 17.3334 14.4993 17.3334C15.1667 17.3334 15.7077 16.7365 15.7077 16.0001C15.7077 15.2637 15.1667 14.6667 14.4993 14.6667C13.832 14.6667 13.291 15.2637 13.291 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 16.0001C6.04102 16.7365 6.582 17.3334 7.24935 17.3334C7.91669 17.3334 8.45768 16.7365 8.45768 16.0001C8.45768 15.2637 7.91669 14.6667 7.24935 14.6667C6.582 14.6667 6.04102 15.2637 6.04102 16.0001Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20.541 8.00008C20.541 8.73646 21.082 9.33341 21.7493 9.33341C22.4167 9.33341 22.9577 8.73646 22.9577 8.00008C22.9577 7.2637 22.4167 6.66675 21.7493 6.66675C21.082 6.66675 20.541 7.2637 20.541 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.291 8.00008C13.291 8.73646 13.832 9.33341 14.4993 9.33341C15.1667 9.33341 15.7077 8.73646 15.7077 8.00008C15.7077 7.2637 15.1667 6.66675 14.4993 6.66675C13.832 6.66675 13.291 7.2637 13.291 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M6.04102 8.00008C6.04102 8.73646 6.582 9.33341 7.24935 9.33341C7.91669 9.33341 8.45768 8.73646 8.45768 8.00008C8.45768 7.2637 7.91669 6.66675 7.24935 6.66675C6.582 6.66675 6.04102 7.2637 6.04102 8.00008Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      visible: role === 'admin'
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: (
        <svg width="29" height="29" viewBox="0 0 24 24" fill="none">
          <path d="M16 17L21 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21 12H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      visible: role === 'admin',
      action: 'logout'
    }
  ];

  const visibleMenuItems = menuItems.filter(item => item.visible);

  const handleItemClick = (item) => {
    if (item.action === 'logout') {
      if (typeof onLogout === 'function') {
        onLogout();
      }
      return;
    }
    onNavigate(item.id);
  };

  return (
    <aside className={`sidebar ${variant === 'light' ? 'light' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Hamburger Menu */}
      <div className="hamburger-menu" role="button" aria-label="Toggle sidebar" aria-pressed={isCollapsed} onClick={() => setIsCollapsed(v => !v)}>
        <svg width="43" height="42" viewBox="0 0 43 42" fill="none" style={{ transition: 'transform 0.2s ease', transform: isCollapsed ? 'rotate(90deg)' : 'none' }}>
          <path d="M8.95898 29.75H34.0423M8.95898 21H34.0423M8.95898 12.25H23.2923" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`nav-item ${(item.action !== 'logout' && currentView === item.id) ? 'active' : ''}`}
            aria-label={item.action === 'logout' ? 'Logout' : item.label.replace('\n', ' ')}
          >
            <div className="nav-icon">
              {item.icon}
            </div>
            <span
              className="nav-label"
              style={{
                color: (item.id === 'course' && currentView === 'course') ? '#155DFC' : 'white'
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Admin Profile */}
      <div className="admin-profile">
        <div className="admin-icon">
          <svg width="29" height="32" viewBox="0 0 29 32" fill="none">
            <path d="M22.9577 28C22.9577 22.8453 19.1708 18.6667 14.4993 18.6667C9.82794 18.6667 6.04102 22.8453 6.04102 28M14.4993 14.6667C11.83 14.6667 9.66602 12.2789 9.66602 9.33333C9.66602 6.38781 11.83 4 14.4993 4C17.1687 4 19.3327 6.38781 19.3327 9.33333C19.3327 12.2789 17.1687 14.6667 14.4993 14.6667Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="admin-label">
          {role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Student'}
        </span>
      </div>

      <style>{`
        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          width: 211px;
          height: 100vh;
          background: #000;
          border-radius: 0 50px 50px 0;
          display: flex;
          flex-direction: column;
          padding: 2rem 0;
          z-index: 100;
        }
        .sidebar.collapsed { width: 72px; border-radius: 0 24px 24px 0; overflow-y: auto; }

        .sidebar.light { background: #FFF; border-right: 1px solid rgba(0,0,0,0.1); }
        .sidebar.light .nav-item { color: #0A0A0A; }
        .sidebar.light .nav-item:hover { background: rgba(0,0,0,0.05); }
        .sidebar.light .nav-item.active { background: rgba(21,93,252,0.08); }
        .sidebar.light .nav-label { color: #0A0A0A !important; }
        .sidebar.light .admin-label { color: #0A0A0A; }
        .sidebar.light .admin-profile { border-top: 1px solid rgba(0,0,0,0.08); }
        .sidebar.light .hamburger-menu svg path { stroke: #0A0A0A !important; }
        .sidebar.light .nav-icon svg path { stroke: #0A0A0A !important; fill: #0A0A0A !important; }
        .sidebar.light .admin-icon svg path { stroke: #0A0A0A !important; }

        .hamburger-menu {
          display: flex;
          justify-content: center;
          margin-bottom: 3rem;
          padding: 0 1.5rem;
        }

        .hamburger-menu svg {
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .hamburger-menu svg:hover {
          transform: scale(1.05);
        }

        .nav-menu {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 0 1rem;
          overflow-y: auto;
        }
        .sidebar.collapsed .nav-menu { align-items: center; padding: 0; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }
        .sidebar.collapsed .nav-item { justify-content: center; gap: 0; padding: 0.5rem 0; width: 72px; }

        .nav-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateX(4px);
        }

        .nav-item.active {
          background: rgba(255, 255, 255, 0.15);
          transform: translateX(4px);
        }

        .nav-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
        }

        .nav-label {
          font-family: 'Poppins', sans-serif;
          font-size: 0.9375rem;
          font-weight: 300;
          line-height: 1.3;
          text-transform: capitalize;
          white-space: pre-line;
        }
        .sidebar.collapsed .nav-label { display: none; }

        .admin-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 2rem;
          margin-top: auto;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .sidebar.collapsed .admin-profile { justify-content: center; padding: 1rem 0; }

        .admin-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .admin-label {
          font-family: 'Poppins', sans-serif;
          font-size: 0.9375rem;
          font-weight: 300;
          color: white;
          text-transform: capitalize;
        }
        .sidebar.collapsed .admin-label { display: none; }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s ease;
          }

          .sidebar.open {
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .sidebar {
            width: 280px;
            border-radius: 0;
          }

          .nav-item {
            padding: 1rem;
          }

          .nav-label {
            font-size: 1rem;
          }

          .admin-profile {
            padding: 1.5rem 2rem;
          }
        }

        @media (max-width: 480px) {
          .sidebar {
            width: 100vw;
            border-radius: 0;
          }
        }

        /* Collapse effect on main content */
        body.sidebar-collapsed .main-content { margin-left: 72px !important; }
      `}</style>
    </aside>
  );
};

Sidebar.propTypes = {
  currentView: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
  role: PropTypes.string.isRequired,
  collegeId: PropTypes.string,
  variant: PropTypes.oneOf(['dark','light']),
  onLogout: PropTypes.func,
};

export default Sidebar;

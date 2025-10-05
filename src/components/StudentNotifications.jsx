import { useState, useEffect } from 'react';

const StudentNotifications = ({
  onLogout,
  onNavigate,
  currentView = 'notification',
  notifications = []
}) => {
  // Sample notifications based on Figma design (fallback when none provided)
  const sampleNotifications = [
    { id: 1, title: "Take your laptop for CS3003 class", timestamp: "December 23, 2019 at 6:00 pm", read: false },
    { id: 2, title: "3rd period on 25th December is a Self Learning period", timestamp: "December 23, 2019 at 6:00 pm", read: false },
    { id: 3, title: "Your CS1001 class is in lecture hall 3, AB3", timestamp: "December 23, 2019 at 6:00 pm", read: false }
  ];
  const [displayNotifications, setDisplayNotifications] = useState(Array.isArray(notifications) && notifications.length ? notifications : sampleNotifications);

  useEffect(() => {
    if (Array.isArray(notifications)) {
      setDisplayNotifications(notifications);
    }
  }, [notifications]);

  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 72 : 220; // match Dashboard student sidebar widths

  const removeNotification = (id) => {
    setDisplayNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="w-full min-h-screen bg-white flex font-sans">
      {/* Sidebar */}
      <aside
        className={`student-sidebar fixed left-0 top-6 bottom-6 flex flex-col shadow-lg overflow-hidden ${collapsed ? 'student-sidebar--collapsed' : ''}`}
        style={{ width: `${sidebarWidth}px`, zIndex: 40 }}
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
            <svg width="32" height="33" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <path d="M12 2.5l2.598 4.5H9.402L12 2.5zM12 16.5l-2.598-4.5h5.196L12 16.5zM2.5 9.5l4.5-2.598v5.196L2.5 9.5zM21.5 9.5l-4.5 2.598V6.902L21.5 9.5z" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      <main className="student-main relative bg-white overflow-auto" style={{ marginLeft: `${sidebarWidth}px`, minHeight: '100vh' }}>
        <div className="p-6">
          {/* Header */}
          <h1 className="student-page-title text-black mb-12 capitalize">notifications</h1>

          {/* Notifications Grid (desktop-friendly) */}
          <div className="student-notifications-grid">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className="student-notification-card relative flex flex-col justify-center"
              >
                {/* Close button */}
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="student-notification-close absolute top-4 right-4"
                >
                  ×
                </button>

                {/* Notification content */}
                <div className="pr-8">
                  <h3 className="student-notification-title mb-1 leading-relaxed">
                    {notification.title}
                  </h3>
                  {notification.message && (
                    <p className="student-notification-message mb-2">
                      {notification.message}
                    </p>
                  )}
                  {notification.imageData && (
                    <div className="mt-1"><img src={notification.imageData} alt="Attachment" className="rounded-md border border-neutral-700 max-h-48" /></div>
                  )}
                  <p className="student-notification-time mt-2">
                    {notification.timestamp}
                  </p>
                </div>
              </div>
            ))}

            {displayNotifications.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif' }}>
                  No notifications at the moment
                </p>
              </div>
            )}
          </div>
        </div>

        <style>{`
          .student-sidebar { background: #E1F3FF; border-radius: 0 50px 50px 0; }
          .student-sidebar--collapsed nav { padding-left: 0; padding-right: 0; }

          .student-main { min-height: 100vh; }

          .student-page-title { font-family: Poppins, -apple-system, Roboto, Helvetica, sans-serif; font-weight: 600; font-size: 32px; }

          .student-notifications-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .student-notification-card {
            background: #000;
            color: #fff;
            border-radius: 10px;
            padding: 16px;
            min-height: 102px;
          }

          .student-notification-close {
            color: #9CA3AF; /* gray-400 */
            font-family: Ponnala, -apple-system, Roboto, Helvetica, sans-serif;
            font-size: 20px;
            transition: color 150ms ease-in-out;
          }
          .student-notification-close:hover { color: #D1D5DB; /* gray-300 */ }

          .student-notification-title {
            color: #fff;
            font-family: Poppins, -apple-system, Roboto, Helvetica, sans-serif;
            font-weight: 600;
            font-size: 16px;
          }
          .student-notification-message {
            color: #fff;
            font-family: Poppins, -apple-system, Roboto, Helvetica, sans-serif;
            font-weight: 400;
            font-size: 14px;
          }
          .student-notification-time {
            color: rgba(255, 255, 255, 0.5);
            font-family: Poppins, -apple-system, Roboto, Helvetica, sans-serif;
            font-weight: 500;
            font-size: 14px;
          }

          /* Desktop-friendly layout */
          @media (min-width: 1024px) {
            .student-page-title { font-size: 40px; }
            .student-notifications-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
          }

          /* Very wide screens */
          @media (min-width: 1440px) {
            .student-notifications-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          }

          /* Small screens adjustments (preserve mobile look) */
          @media (max-width: 640px) {
            .student-page-title { font-size: 28px; }
            .student-notification-card { padding: 12px; }
          }
        `}</style>
      </main>
    </div>
  );
};

export default StudentNotifications;

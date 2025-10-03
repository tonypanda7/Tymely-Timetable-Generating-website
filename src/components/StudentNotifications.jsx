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
    <div className="w-full min-h-screen bg-white flex">
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
        <div className="p-6">
          {/* Header */}
          <h1 className="text-4xl font-semibold text-black mb-12 capitalize" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontWeight: 600 }}>
            notifications
          </h1>

          {/* Notifications List */}
          <div className="space-y-4 max-w-2xl">
            {displayNotifications.map((notification) => (
              <div
                key={notification.id}
                className="relative bg-black rounded-lg p-4 min-h-[102px] flex flex-col justify-center"
                style={{ borderRadius: '10px' }}
              >
                {/* Close button */}
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 transition-colors"
                  style={{ fontFamily: 'Ponnala, -apple-system, Roboto, Helvetica, sans-serif', fontSize: '20px' }}
                >
                  ×
                </button>

                {/* Notification content */}
                <div className="pr-8">
                  <h3
                    className="text-white font-semibold text-base mb-1 leading-relaxed"
                    style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontWeight: 600 }}
                  >
                    {notification.title}
                  </h3>
                  {notification.message && (
                    <p className="text-white text-sm mb-2" style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontWeight: 400 }}>
                      {notification.message}
                    </p>
                  )}
                  {notification.imageData && (
                    <div className="mt-1"><img src={notification.imageData} alt="Attachment" className="rounded-md border border-neutral-700 max-h-48" /></div>
                  )}
                  <p
                    className="text-white opacity-50 text-sm mt-2"
                    style={{ fontFamily: 'Poppins, -apple-system, Roboto, Helvetica, sans-serif', fontWeight: 500 }}
                  >
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
      </main>
    </div>
  );
};

export default StudentNotifications;

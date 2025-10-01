import { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import TeacherSidebar from './TeacherSidebar.jsx';

const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getWeekdayLabel = (value) => {
  const index = Number(value);
  if (Number.isFinite(index) && index >= 0 && index < WEEKDAY_LABELS.length) {
    return WEEKDAY_LABELS[index];
  }
  return 'Scheduled day';
};

const getPeriodLabel = (value) => {
  const index = Number(value);
  if (!Number.isFinite(index)) return 'scheduled period';
  const periodNumber = index + 1;
  const suffix = periodNumber % 10 === 1 && periodNumber % 100 !== 11
    ? 'st'
    : periodNumber % 10 === 2 && periodNumber % 100 !== 12
      ? 'nd'
      : periodNumber % 10 === 3 && periodNumber % 100 !== 13
        ? 'rd'
        : 'th';
  return `${periodNumber}${suffix} period`;
};

const getStatusMeta = (status) => {
  const normalized = String(status || 'pending').toLowerCase();
  if (normalized === 'approved' || normalized === 'accepted') {
    return { label: 'Approved', variant: 'success' };
  }
  if (normalized === 'declined' || normalized === 'rejected') {
    return { label: 'Declined', variant: 'danger' };
  }
  return { label: 'Pending', variant: 'neutral' };
};

const TeacherNotifications = ({
  teacherOffers = [],
  teacherCancellations = [],
  acceptOffer,
  declineOffer,
  onNavigate,
  onLogout,
}) => {
  const sentNotifications = useMemo(() => {
    const items = Array.isArray(teacherCancellations) ? teacherCancellations : [];
    return items
      .map((item, index) => {
        const subject = String(item.subjectName || 'Class');
        const classLabel = String(item.className || '').trim();
        const dayLabel = getWeekdayLabel(item.dayIndex);
        const periodLabel = getPeriodLabel(item.periodIndex);
        const statusMeta = getStatusMeta(item.status);
        const descriptionParts = [];
        descriptionParts.push(`${subject}${classLabel ? ` for ${classLabel}` : ''} requested to be cancelled on ${dayLabel} (${periodLabel}).`);
        if (statusMeta.variant === 'success') {
          descriptionParts.push('Request approved. Replacement offers are being handled.');
        } else if (statusMeta.variant === 'danger') {
          descriptionParts.push('Request was declined.');
        } else {
          descriptionParts.push('Awaiting admin review.');
        }
        return {
          id: item.id || `sent-${index}`,
          title: `${subject} cancellation request`,
          description: descriptionParts.join(' '),
          statusMeta,
          createdAt: Number(item.createdAt) || 0,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [teacherCancellations]);

  const receivedNotifications = useMemo(() => {
    const items = Array.isArray(teacherOffers) ? teacherOffers : [];
    return items
      .map((offer, index) => {
        const classLabel = String(offer.className || 'Class');
        const subject = String(offer.subjectName || 'Subject');
        const dayLabel = getWeekdayLabel(offer.dayIndex);
        const periodLabel = getPeriodLabel(offer.periodIndex);
        const requesterName = String(offer.requesterName || offer.teacherName || '').trim();
        const statusMeta = getStatusMeta(offer.status);
        return {
          id: offer.id || `received-${index}`,
          title: requesterName ? `Class switch requested by ${requesterName}` : 'Class switch request',
          description: `${subject} for ${classLabel} on ${dayLabel} (${periodLabel}).`,
          statusMeta,
          originalOffer: offer,
          createdAt: Number(offer.createdAt) || 0,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [teacherOffers]);

  const sampleSentNotifications = [
    {
      id: 'sent-1',
      title: 'Class cancel Request',
      description: 'HS1003 Class for AIDS B- SEM1 requested to be cancelled for 20th December 2025, 2nd and 3rd period',
      statusMeta: { label: 'Pending', variant: 'neutral' },
    },
    {
      id: 'sent-2',
      title: 'Leave Request sent to Admin',
      description: 'Leave requested from 30th December 2025 to 10th January 2026',
      statusMeta: { label: 'Pending', variant: 'neutral' },
    },
    {
      id: 'sent-3',
      title: 'Your Class cancelled Successfully',
      description: 'CS1003 Class for IoT B- SEM1 requested to be cancelled for 20th December 2025, 1st period\nNo available teacher - class changed to self Learning',
      statusMeta: { label: 'Approved', variant: 'success' },
    },
  ];

  const sampleReceivedNotifications = [
    {
      id: 'received-1',
      title: 'Class switch requested by Dr. Tina',
      description: 'CS2002 for IoT A - SEM 2, 5th period class - today, requested to be taken if you are free',
      statusMeta: { label: 'Pending', variant: 'neutral' },
    },
    {
      id: 'received-2',
      title: 'Class switch requested by Dr. Miraj',
      description: 'CS2002 for IoT A - SEM 2, 7th period class - today, requested to be taken if you are free',
      statusMeta: { label: 'Pending', variant: 'neutral' },
    },
  ];

  const displaySentNotifications = sentNotifications.length ? sentNotifications : sampleSentNotifications;
  const displayReceivedNotifications = receivedNotifications.length ? receivedNotifications : sampleReceivedNotifications;

  const [dismissedIds, setDismissedIds] = useState(new Set());
  const isDismissed = useCallback((id) => dismissedIds.has(id), [dismissedIds]);
  const dismissNotification = useCallback((id) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const NotificationCard = ({ notification, isReceived, showCloseButton = true, onClose, onAccept, onDecline }) => {
    const showActions = isReceived && notification.statusMeta.variant === 'neutral';
    const showCheckbox = false;

    return (
      <div className="notification-card">
        <div className="notification-card__header">
          <div className="notification-card__content">
            <div className="notification-card__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.5 12L10.5 15L16.5 9M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="#039855" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="notification-card__text">
              <h3 className="notification-card__title">{notification.title}</h3>
              <p className="notification-card__description">{notification.description}</p>
            </div>
          </div>
          {showCloseButton && (
            <button className="notification-card__close" type="button" onClick={() => onClose && onClose(notification)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {(showActions || showCheckbox) && (
          <div className="notification-card__actions">
            {showCheckbox && (
              <div className="notification-card__checkbox">
                <div className="checkbox-input">
                  <div className="checkbox-base"></div>
                </div>
                <span className="checkbox-label">Don't show again</span>
              </div>
            )}
            {showActions && (
              <div className="notification-card__buttons">
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  onClick={() => {
                    if (onDecline) onDecline(notification);
                  }}
                >
                  {isReceived ? 'Cancel' : 'Edit'}
                </button>
                <button
                  type="button"
                  className="action-button action-button--primary"
                  onClick={() => {
                    if (onAccept) onAccept(notification);
                  }}
                >
                  {isReceived ? 'Confirm' : 'Retrieve'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  NotificationCard.propTypes = {
    notification: PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      statusMeta: PropTypes.shape({
        label: PropTypes.string.isRequired,
        variant: PropTypes.oneOf(['success', 'danger', 'neutral']).isRequired,
      }).isRequired,
      originalOffer: PropTypes.object,
    }).isRequired,
    isReceived: PropTypes.bool,
    showCloseButton: PropTypes.bool,
  };

  return (
    <div className="teacher-notifications-view">
      <TeacherSidebar currentView="notification" onNavigate={onNavigate} onLogout={onLogout} />

      <main className="teacher-notifications-content">
        <header className="notifications-section-header">
          <h1 className="notifications-title">Notifications</h1>
        </header>

        <div className="notifications-grid">
          <section className="notifications-column">
            <div className="notifications-column__header">
              <h2 className="notifications-column__title">Sent</h2>
              <p className="notifications-column__subtitle">Requests sent by you</p>
            </div>
            <div className="notifications-list">
              {displaySentNotifications.filter(n => !isDismissed(n.id)).map((item) => (
                <NotificationCard
                  key={item.id}
                  notification={item}
                  isReceived={false}
                  onClose={(n) => dismissNotification(n.id)}
                />
              ))}
            </div>
          </section>

          <section className="notifications-column notifications-column--received">
            <div className="notifications-column__header">
              <h2 className="notifications-column__title">Received</h2>
              <p className="notifications-column__subtitle">Requests sent by others</p>
            </div>
            <div className="notifications-list">
              {displayReceivedNotifications.filter(n => !isDismissed(n.id)).map((item) => (
                <NotificationCard
                  key={item.id}
                  notification={item}
                  isReceived
                  onClose={(n) => dismissNotification(n.id)}
                  onAccept={(n) => {
                    if (n.originalOffer && typeof acceptOffer === 'function') acceptOffer(n.originalOffer);
                    dismissNotification(n.id);
                  }}
                  onDecline={(n) => {
                    if (n.originalOffer && typeof declineOffer === 'function') declineOffer(n.originalOffer);
                    dismissNotification(n.id);
                  }}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <style>{`
        .teacher-notifications-view {
          min-height: 100vh;
          width: 100%;
          background: #FFF;
          color: #000;
          font-family: 'Poppins', -apple-system, Roboto, Helvetica, sans-serif;
        }

        .teacher-notifications-content {
          margin-left: var(--teacher-sidebar-width, 246px);
          padding: 32px 311px 0 0;
          transition: margin-left 0.3s ease;
        }

        .notifications-section-header {
          margin-bottom: 32px;
        }

        .notifications-title {
          font-family: 'Poppins', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 60px;
          font-weight: 600;
          margin: 0;
          text-transform: capitalize;
          color: #000;
          line-height: normal;
        }

        .notifications-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          align-items: start;
          min-width: 1032px;
        }

        .notifications-column {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .notifications-column--received {
          margin-left: 32px;
        }

        .notifications-column__header {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .notifications-column__title {
          font-family: 'Poppins', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 30px;
          font-weight: 300;
          margin: 0;
          text-transform: capitalize;
          color: #000;
          line-height: normal;
        }

        .notifications-column__subtitle {
          font-family: 'Poppins', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 15px;
          font-weight: 300;
          margin: 0;
          color: #000;
          line-height: normal;
        }

        .notifications-list {
          display: flex;
          flex-direction: column;
          gap: 29px;
        }

        .notification-card {
          width: 516px;
          border-radius: 12px;
          background: #FFF;
          box-shadow: 0 20px 24px -4px rgba(16, 24, 40, 0.10), 0 8px 8px -4px rgba(16, 24, 40, 0.04);
          display: flex;
          flex-direction: column;
          position: relative;
          border: 1px solid rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .notification-card__header {
          display: flex;
          padding: 24px;
          gap: 16px;
          position: relative;
        }

        .notification-card__content {
          display: flex;
          gap: 16px;
          flex: 1;
        }

        .notification-card__icon {
          width: 48px;
          height: 48px;
          border-radius: 28px;
          border: 8px solid #ECFDF3;
          background: #D1FADF;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .notification-card__text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .notification-card__title {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          color: #101828;
          line-height: 28px;
        }

        .notification-card__description {
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 400;
          color: #475467;
          margin: 0;
          line-height: 22px;
          white-space: pre-line;
        }

        .notification-card__close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background: none;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 10px;
        }

        .notification-card__actions {
          display: flex;
          flex-direction: column;
          padding: 32px 24px 24px 88px;
          gap: 12px;
        }

        .notification-card__checkbox { display: none; }
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .checkbox-input {
          display: flex;
          padding-top: 2px;
          justify-content: center;
          align-items: center;
        }

        .checkbox-base {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid #D0D5DD;
          background: #FFF;
        }

        .checkbox-label {
          color: #344054;
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
        }

        .notification-card__buttons {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .action-button {
          display: flex;
          padding: 10px 18px;
          justify-content: center;
          align-items: center;
          gap: 8px;
          border-radius: 8px;
          font-family: 'Inter', -apple-system, Roboto, Helvetica, sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          line-height: 24px;
        }

        .action-button--secondary {
          background: #FFF;
          border-color: #D0D5DD;
          color: #344054;
          box-shadow: 0 1px 2px 0 rgba(16, 24, 40, 0.05);
        }

        .action-button--secondary:hover {
          background: #F9FAFB;
        }

        .action-button--primary {
          background: #7F56D9;
          border-color: #7F56D9;
          color: #FFF;
          box-shadow: 0 1px 2px 0 rgba(16, 24, 40, 0.05);
        }

        .action-button--primary:hover {
          background: #6941C6;
          border-color: #6941C6;
        }

        @media (max-width: 1440px) {
          .teacher-notifications-content {
            padding: 32px 48px 0 0;
          }

          .notifications-grid {
            min-width: auto;
          }

          .notification-card {
            width: 100%;
            max-width: 516px;
          }
        }

        @media (max-width: 1024px) {
          .teacher-notifications-content {
            margin-left: 0;
            padding: 24px 20px 48px 0;
          }

          .notifications-section-header {
            margin-bottom: 32px;
          }

          .notifications-title {
            font-size: 48px;
          }

          .notifications-grid {
            grid-template-columns: 1fr;
            gap: 48px;
          }

          .notifications-column--received {
            margin-left: 0;
          }

          .notification-card {
            width: 100%;
            max-width: 100%;
          }
        }

        @media (max-width: 640px) {
          .teacher-notifications-content {
            padding: 24px 16px 24px 0;
          }

          .notifications-title {
            font-size: 36px;
          }

          .notification-card {
            padding: 20px;
          }

          .notification-card__header {
            padding: 20px 20px 0 20px;
            flex-direction: column;
            align-items: flex-start;
          }

          .notification-card__content {
            flex-direction: column;
            align-items: flex-start;
          }

          .notification-card__actions {
            padding: 24px 20px 20px 20px;
            flex-direction: column;
            align-items: stretch;
          }

          .notification-card__buttons {
            flex-direction: column;
            align-items: stretch;
          }

          .action-button {
            width: 100%;
          }

          .notification-card__close {
            position: relative;
            top: 0;
            right: 0;
            align-self: flex-end;
          }
        }
      `}</style>
    </div>
  );
};

TeacherNotifications.propTypes = {
  teacherOffers: PropTypes.arrayOf(PropTypes.object),
  teacherCancellations: PropTypes.arrayOf(PropTypes.object),
  acceptOffer: PropTypes.func,
  declineOffer: PropTypes.func,
  onNavigate: PropTypes.func,
  onLogout: PropTypes.func,
};

export default TeacherNotifications;

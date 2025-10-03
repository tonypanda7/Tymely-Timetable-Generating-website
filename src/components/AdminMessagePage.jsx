import { useState } from 'react';
import PropTypes from 'prop-types';

export default function AdminMessagePage({ onSendMessage, isSending }) {
  const [audienceTeachers, setAudienceTeachers] = useState(true);
  const [audienceStudents, setAudienceStudents] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageData, setImageData] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) { setImageData(''); return; }
    const reader = new FileReader();
    reader.onload = () => setImageData(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targets = [];
    if (audienceTeachers) targets.push('teacher');
    if (audienceStudents) targets.push('student');
    if (targets.length === 0) { alert('Select at least one audience'); return; }
    if (!title && !message && !imageData) { alert('Provide a title, message, or image'); return; }
    if (onSendMessage) {
      await onSendMessage({ title, message, imageData, audiences: targets });
      setTitle(''); setMessage(''); setImageData('');
    }
  };

  return (
    <div className="admin-message-page">
      <div className="page-header">
        <h1 className="page-title">Message</h1>
      </div>

      <form className="message-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label className="form-label">Audience</label>
          <div className="audience-options">
            <label className="audience-option">
              <input type="checkbox" checked={audienceTeachers} onChange={(e) => setAudienceTeachers(e.target.checked)} /> Teachers
            </label>
            <label className="audience-option">
              <input type="checkbox" checked={audienceStudents} onChange={(e) => setAudienceStudents(e.target.checked)} /> Students
            </label>
          </div>
        </div>

        <div className="form-row">
          <label className="form-label">Title</label>
          <input className="form-input" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Exam Schedule Update" />
        </div>

        <div className="form-row">
          <label className="form-label">Message</label>
          <textarea className="form-textarea" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement..." />
        </div>

        <div className="form-row">
          <label className="form-label">Attach Image (optional)</label>
          <input className="form-input" type="file" accept="image/*" onChange={handleImageChange} />
          {imageData && (
            <div className="image-preview">
              <img src={imageData} alt="Attachment preview" />
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={isSending}>{isSending ? 'Sending...' : 'Send'}</button>
        </div>
      </form>

      <style>{`
        .admin-message-page { min-height: 100vh; background: #fff; padding: 2rem; margin-left: 211px; }
        .page-header { margin-bottom: 2rem; }
        .page-title { font-family: 'Roboto Condensed', sans-serif; font-size: 50px; font-weight: 600; color: #000; margin: 0; }
        .message-form { max-width: 800px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
        .form-row { margin-bottom: 16px; }
        .form-label { display: block; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 500; color: #0F172A; margin-bottom: 8px; }
        .form-input { width: 100%; height: 41px; border-radius: 8px; background: #fff; box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; padding: 0 12px; font-family: 'Inter', sans-serif; font-size: 16px; color: #0F172A; outline: none; }
        .form-textarea { width: 100%; min-height: 120px; border-radius: 8px; background: #fff; box-shadow: 4px 4px 50px 1px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; padding: 12px; font-family: 'Inter', sans-serif; font-size: 16px; color: #0F172A; outline: none; resize: vertical; }
        .audience-options { display: flex; gap: 16px; }
        .audience-option { font-family: 'Inter', sans-serif; font-size: 14px; color: #0F172A; }
        .form-actions { display: flex; justify-content: flex-end; }
        .btn-primary { background: #3B82F6; color: #fff; border: none; border-radius: 8px; padding: 10px 16px; font-weight: 600; cursor: pointer; }
        .btn-primary:hover { background: #2563eb; }
        .image-preview { margin-top: 10px; }
        .image-preview img { max-width: 240px; border-radius: 8px; border: 1px solid #e5e7eb; }
        @media (max-width: 1024px) { .admin-message-page { margin-left: 0; padding: 1rem; } }
      `}</style>
    </div>
  );
}

AdminMessagePage.propTypes = {
  onSendMessage: PropTypes.func,
  isSending: PropTypes.bool,
};

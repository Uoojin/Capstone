import { useNavigate } from 'react-router-dom';
import './GuestBookPage.css';

export default function GuestBookPage() {
  const navigate = useNavigate();

  return (
    <div className="guestbook-container">
    
      <div className="guestbook-action-buttons">
        <button 
          className="guestbook-btn"
          onClick={() => navigate('/photobooth')}
        >
          CAPTURE
        </button>
        <button 
          className="guestbook-btn"
          onClick={() => alert('준비 중입니다.')}
        >
          GUEST BOOK
        </button>
      </div>
    </div>
  );
}